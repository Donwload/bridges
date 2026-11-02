/*
 * Проверка единственности решения.
 *
 * Солвер перебирает не все комбинации мостов подряд, а ведёт
 * распространение ограничений по домену каждого ребра:
 *
 *   low[e]..high[e] — сколько мостов ещё допустимо на ребре;
 *   need[i]         — сколько мостов ещё нужно острову;
 *   cap[i]          — сколько мостов ещё могут дать его нерешённые рёбра.
 *
 * Для каждого острова решается уравнение
 *
 *   сумма x[e] = need[i],  low[e] <= x[e] <= high[e].
 *
 * Отсюда сразу получаются сильные выводы:
 *   • need == 0  — все рёбра острова запрещены;
 *   • need == cap — все рёбра обязаны стать максимальными;
 *   • если остальные рёбра не могут добрать need, то конкретное ребро
 *     обязано нести минимум need - (cap - high[e]);
 *   • если минимум совпал с максимумом — ребро решено.
 *
 * Дополнительно:
 *   • пересекающиеся мосты не могут быть выбраны одновременно;
 *   • граф потенциальных рёбер обязан оставаться связным, иначе
 *     решение заведомо не соединит все острова;
 *   • ребро, являющееся мостом в графе потенциальных рёбер, обязано
 *     быть выбранным — без него карта распадётся.
 *
 * Ветвление идёт по самому ограниченному острову, а не по порядку
 * рёбер, поэтому плотные карты (50–100 островов) проверяются быстро.
 */
class SolutionChecker {
    constructor(logic) {
        this.logic = logic;
    }

    static now() {
        if (
            typeof performance !== 'undefined' &&
            typeof performance.now === 'function'
        ) {
            return performance.now();
        }

        return Date.now();
    }

    static parseKey(key) {
        if (typeof key !== 'string') return null;

        const comma = key.indexOf(',');

        if (comma <= 0 || comma === key.length - 1) return null;

        const r = Number(key.slice(0, comma));
        const c = Number(key.slice(comma + 1));

        return Number.isInteger(r) && Number.isInteger(c)
            ? { r, c }
            : null;
    }

    countSolutions(maxSolutions = 2, deadline = null) {
        return this.countSolutionsForIslands(
            this.logic.islands,
            maxSolutions,
            deadline
        );
    }

    /**
     * Считает решения для переданной карты, не меняя состояние игры.
     *
     * Возвращает число решений (не больше maxSolutions) или -1, если
     * перебор прерван по времени. Вызывающий код генератора трактует
     * -1 как «не доказано», то есть карта отклоняется.
     */
    countSolutionsForIslands(
        islands,
        maxSolutions = 2,
        deadline = null,
        maxBridgeCount = null
    ) {
        if (
            !Number.isInteger(maxSolutions) ||
            maxSolutions < 1 ||
            !islands ||
            typeof islands.keys !== 'function' ||
            islands.size === 0
        ) {
            return 0;
        }

        // Между одной парой островов допустимо не более двух мостов.
        const requestedLimit = Number.isInteger(maxBridgeCount)
            ? maxBridgeCount
            : (Number.isInteger(this.logic.maxBridgeCount)
                ? this.logic.maxBridgeCount
                : 2);

        const bridgeLimit = Math.max(
            1,
            Math.min(2, requestedLimit)
        );

        const timeLimit =
            deadline === null || deadline === undefined
                ? Infinity
                : deadline;

        // ============================================================
        // Острова.
        // ============================================================

        const islandList = [];

        for (const [key, target] of islands) {
            const point = SolutionChecker.parseKey(key);

            if (!point) return 0;

            if (!Number.isInteger(target) || target < 0) return 0;

            islandList.push({
                id: islandList.length,
                key,
                r: point.r,
                c: point.c,
                target
            });
        }

        const count = islandList.length;

        if (count === 0) return 0;

        // ============================================================
        // Возможные рёбра: только соседние острова в строке/столбце.
        //
        // Сортировка по координате делает соседей в списке ровно теми
        // парами, между которыми нет других островов. Это заменяет
        // O(n²) перебор с проверкой пути.
        // ============================================================

        const rows = new Map();
        const columns = new Map();

        for (const island of islandList) {
            if (!rows.has(island.r)) rows.set(island.r, []);
            if (!columns.has(island.c)) columns.set(island.c, []);

            rows.get(island.r).push(island);
            columns.get(island.c).push(island);
        }

        for (const row of rows.values()) {
            row.sort((a, b) => a.c - b.c);
        }

        for (const column of columns.values()) {
            column.sort((a, b) => a.r - b.r);
        }

        const edges = [];
        const seenEdges = new Set();

        const addEdge = (first, second) => {
            const edgeKey = this.logic.getEdgeKey(
                [first.r, first.c],
                [second.r, second.c]
            );

            if (seenEdges.has(edgeKey)) return;

            seenEdges.add(edgeKey);

            const k1 = first.key < second.key
                ? first.key
                : second.key;
            const k2 = first.key < second.key
                ? second.key
                : first.key;

            edges.push({
                key: edgeKey,
                a: first.id,
                b: second.id,
                k1,
                k2,
                key1: first.key,
                key2: second.key,
                i1: [first.r, first.c],
                i2: [second.r, second.c],
                r1: first.r,
                c1: first.c,
                r2: second.r,
                c2: second.c,
                // «vertical» здесь означает «в одном столбце»:
                // так же поле называется в edgesCross().
                vertical: first.c === second.c,
                minR: Math.min(first.r, second.r),
                maxR: Math.max(first.r, second.r),
                minC: Math.min(first.c, second.c),
                maxC: Math.max(first.c, second.c),
                row: first.r,
                col: first.c
            });
        };

        for (const row of rows.values()) {
            for (let i = 0; i + 1 < row.length; i++) {
                addEdge(row[i], row[i + 1]);
            }
        }

        for (const column of columns.values()) {
            for (let i = 0; i + 1 < column.length; i++) {
                addEdge(column[i], column[i + 1]);
            }
        }

        if (edges.length === 0) {
            // Один остров без мостов может быть корректным только при
            // нулевой цели; для игровых карт цель всегда положительная.
            if (count > 1) return 0;

            return islandList[0].target === 0 ? 1 : 0;
        }

        // ============================================================
        // Цели и статическая ёмкость рёбер.
        // ============================================================

        const targets = new Int32Array(count);
        let totalTarget = 0;

        for (let i = 0; i < count; i++) {
            targets[i] = islandList[i].target;
            totalTarget += targets[i];
        }

        if (totalTarget % 2 !== 0) return 0;

        const edgeCount = edges.length;
        const maxPerEdge = new Int8Array(edgeCount);
        const incident = new Array(count);

        for (let i = 0; i < count; i++) incident[i] = [];

        const capacity = new Int32Array(count);

        for (let e = 0; e < edgeCount; e++) {
            const edge = edges[e];

            // Больше, чем нужно любому из концов, класть бессмысленно.
            const limit = Math.min(
                bridgeLimit,
                targets[edge.a],
                targets[edge.b]
            );

            maxPerEdge[e] = limit;

            incident[edge.a].push(e);
            incident[edge.b].push(e);

            capacity[edge.a] += limit;
            capacity[edge.b] += limit;
        }

        for (let i = 0; i < count; i++) {
            if (targets[i] > capacity[i]) return 0;
        }

        // ============================================================
        // Пересечения рёбер.
        //
        // Пересекаться могут только горизонтальное и вертикальное
        // ребро, поэтому проверяем пары разных ориентаций.
        // ============================================================

        const crossing = new Array(edgeCount);

        for (let e = 0; e < edgeCount; e++) crossing[e] = [];

        for (let e = 0; e < edgeCount; e++) {
            const first = edges[e];

            for (let other = e + 1; other < edgeCount; other++) {
                const second = edges[other];

                if (first.vertical === second.vertical) continue;

                const vertical = first.vertical ? first : second;
                const horizontal = first.vertical ? second : first;

                if (
                    vertical.minR < horizontal.row &&
                    horizontal.row < vertical.maxR &&
                    horizontal.minC < vertical.col &&
                    vertical.col < horizontal.maxC
                ) {
                    crossing[e].push(other);
                    crossing[other].push(e);
                }
            }
        }

        // ============================================================
        // Состояние перебора.
        //
        // value[e] === -1  — ребро ещё не решено;
        // value[e] === 0   — моста нет;
        // value[e] === 1,2 — столько мостов.
        // ============================================================

        const value = new Int8Array(edgeCount).fill(-1);
        const low = new Int8Array(edgeCount);
        const high = new Int8Array(maxPerEdge);
        const need = new Int32Array(targets);
        const cap = new Int32Array(capacity);

        // Журнал изменений для отката.
        //   0 — ребро решено (old = количество мостов);
        //   1 — поднят low (old = прежний low);
        //   2 — опущен high (old = прежний high).
        const trailType = new Int8Array(edgeCount * 12 + 32);
        const trailEdge = new Int32Array(edgeCount * 12 + 32);
        const trailOld = new Int8Array(edgeCount * 12 + 32);
        let trailLength = 0;

        // Очередь островов, у которых изменились need/cap.
        const dirty = new Int32Array(edgeCount * 8 + 32);
        let dirtyLength = 0;

        const otherEnd = (e, i) => {
            const edge = edges[e];
            return edge.a === i ? edge.b : edge.a;
        };

        const pushDirty = (i) => {
            dirty[dirtyLength++] = i;
        };

        const setLow = (e, next) => {
            // Решённое ребро менять нельзя — только проверить.
            if (value[e] !== -1) {
                return value[e] >= next;
            }

            const old = low[e];

            if (next <= old) return true;

            if (next > high[e]) return false;

            trailType[trailLength] = 1;
            trailEdge[trailLength] = e;
            trailOld[trailLength] = old;
            trailLength++;

            low[e] = next;

            // Если ребро обязано быть выбрано, все пересекающиеся
            // с ним рёбра использовать нельзя.
            if (old === 0) {
                const cross = crossing[e];

                for (let k = 0; k < cross.length; k++) {
                    if (!setHigh(cross[k], 0)) return false;
                }
            }

            return true;
        };

        const setHigh = (e, next) => {
            // Решённое ребро менять нельзя — только проверить.
            if (value[e] !== -1) {
                return value[e] <= next;
            }

            const old = high[e];

            if (next >= old) return true;

            if (next < low[e]) return false;

            trailType[trailLength] = 2;
            trailEdge[trailLength] = e;
            trailOld[trailLength] = old;
            trailLength++;

            const edge = edges[e];
            const delta = old - next;

            high[e] = next;
            cap[edge.a] -= delta;
            cap[edge.b] -= delta;

            pushDirty(edge.a);
            pushDirty(edge.b);

            return true;
        };

        const applyEdge = (e, bridges) => {
            const current = value[e];

            if (current !== -1) {
                return current === bridges;
            }

            if (bridges < low[e] || bridges > high[e]) {
                return false;
            }

            const edge = edges[e];
            const a = edge.a;
            const b = edge.b;

            if (bridges > need[a] || bridges > need[b]) {
                return false;
            }

            trailType[trailLength] = 0;
            trailEdge[trailLength] = e;
            trailOld[trailLength] = bridges;
            trailLength++;

            value[e] = bridges;
            need[a] -= bridges;
            need[b] -= bridges;
            cap[a] -= high[e];
            cap[b] -= high[e];

            pushDirty(a);
            pushDirty(b);

            if (bridges > 0) {
                const cross = crossing[e];

                for (let k = 0; k < cross.length; k++) {
                    const other = cross[k];
                    const otherValue = value[other];

                    if (otherValue === -1) {
                        if (!applyEdge(other, 0)) return false;
                    } else if (otherValue > 0) {
                        return false;
                    }
                }
            }

            return true;
        };

        const undoTo = (mark) => {
            while (trailLength > mark) {
                trailLength--;

                const type = trailType[trailLength];
                const e = trailEdge[trailLength];
                const old = trailOld[trailLength];
                const edge = edges[e];

                if (type === 0) {
                    value[e] = -1;
                    need[edge.a] += old;
                    need[edge.b] += old;
                    cap[edge.a] += high[e];
                    cap[edge.b] += high[e];
                } else if (type === 1) {
                    low[e] = old;
                } else {
                    const delta = old - high[e];

                    high[e] = old;
                    cap[edge.a] += delta;
                    cap[edge.b] += delta;
                }
            }

            // После отката состояние снова полностью распространено,
            // поэтому «грязных» островов быть не должно.
            dirtyLength = 0;
        };

        // ============================================================
        // Распространение ограничений для одного острова.
        // ============================================================

        const propagateIsland = (i) => {
            const list = incident[i];

            for (;;) {
                if (need[i] < 0) return false;
                if (need[i] > cap[i]) return false;

                if (need[i] === 0) {
                    for (let k = 0; k < list.length; k++) {
                        const e = list[k];

                        if (value[e] !== -1) continue;

                        if (low[e] > 0) return false;

                        if (!applyEdge(e, 0)) return false;
                    }

                    return true;
                }

                // Домен схлопнулся — ребро решено.
                let changed = false;

                for (let k = 0; k < list.length; k++) {
                    const e = list[k];

                    if (value[e] !== -1) continue;

                    if (low[e] === high[e]) {
                        if (!applyEdge(e, low[e])) return false;

                        changed = true;
                        break;
                    }
                }

                if (changed) continue;

                // Ребро не может нести больше, чем осталось нужно
                // самому острову.
                for (let k = 0; k < list.length; k++) {
                    const e = list[k];

                    if (value[e] !== -1) continue;
                    if (high[e] <= need[i]) continue;

                    if (!setHigh(e, need[i])) return false;

                    changed = true;
                    break;
                }

                if (changed) continue;

                if (need[i] === cap[i]) {
                    // Свободной ёмкости ровно столько, сколько нужно,
                    // значит все оставшиеся рёбра обязаны быть полными.
                    for (let k = 0; k < list.length; k++) {
                        const e = list[k];

                        if (value[e] !== -1) continue;

                        if (!applyEdge(e, high[e])) return false;
                    }

                    return true;
                }

                // Сколько обязано нести каждое ребро, если остальные
                // получат максимум.
                let forced = false;

                for (let k = 0; k < list.length; k++) {
                    const e = list[k];

                    if (value[e] !== -1) continue;

                    const required = need[i] - (cap[i] - high[e]);

                    if (required <= low[e]) continue;

                    if (required > high[e]) return false;

                    if (!setLow(e, required)) return false;

                    if (required === high[e]) {
                        if (!applyEdge(e, required)) return false;

                        forced = true;
                        break;
                    }

                    pushDirty(otherEnd(e, i));
                }

                if (forced) continue;

                return true;
            }
        };

        const propagate = () => {
            while (dirtyLength > 0) {
                const i = dirty[--dirtyLength];

                if (!propagateIsland(i)) return false;
            }

            return true;
        };

        // ============================================================
        // Связность.
        //
        // Пока решение не построено, достаточно проверить, что все
        // острова ещё можно соединить: берём решённые положительные
        // рёбра и все нерешённые. Если даже так граф распался —
        // ветка тупиковая.
        // ============================================================

        const parent = new Int32Array(count);

        const find = (x) => {
            let root = x;

            while (parent[root] !== root) {
                root = parent[root];
            }

            while (parent[x] !== x) {
                const next = parent[x];
                parent[x] = root;
                x = next;
            }

            return root;
        };

        const isPotentialConnected = () => {
            for (let i = 0; i < count; i++) parent[i] = i;

            let components = count;

            for (let e = 0; e < edgeCount; e++) {
                if (value[e] === 0 || high[e] === 0) continue;

                const edge = edges[e];
                const rootA = find(edge.a);
                const rootB = find(edge.b);

                if (rootA !== rootB) {
                    parent[rootB] = rootA;
                    components--;
                }
            }

            return components === 1;
        };

        const isChosenConnected = () => {
            for (let i = 0; i < count; i++) parent[i] = i;

            let components = count;

            for (let e = 0; e < edgeCount; e++) {
                if (value[e] <= 0) continue;

                const edge = edges[e];
                const rootA = find(edge.a);
                const rootB = find(edge.b);

                if (rootA !== rootB) {
                    parent[rootB] = rootA;
                    components--;
                }
            }

            return components === 1;
        };

        // ============================================================
        // Мосты графа потенциальных рёбер.
        //
        // Ребро, без которого граф распадается, обязано быть выбрано:
        // иначе итоговое решение не сможет соединить все острова.
        // ============================================================

        const tin = new Int32Array(count);
        const tout = new Int32Array(count);

        let timer = 0;
        let bridgeForced = false;

        const dfsBridges = (v, parentEdge) => {
            timer++;
            tin[v] = timer;
            tout[v] = timer;

            const list = incident[v];

            for (let k = 0; k < list.length; k++) {
                const e = list[k];

                if (value[e] === 0) continue;
                if (high[e] === 0) continue;
                if (e === parentEdge) continue;

                const to = otherEnd(e, v);

                if (tin[to] !== 0) {
                    if (tin[to] < tout[v]) tout[v] = tin[to];
                    continue;
                }

                if (!dfsBridges(to, e)) return false;

                if (tout[to] < tout[v]) tout[v] = tout[to];

                if (tout[to] > tin[v] && value[e] === -1) {
                    // Мост в потенциальном графе: без него не обойтись.
                    if (low[e] === 0) {
                        if (!setLow(e, 1)) return false;

                        bridgeForced = true;
                    }

                    if (low[e] > high[e]) return false;

                    if (low[e] === high[e]) {
                        if (!applyEdge(e, low[e])) return false;

                        bridgeForced = true;
                    }
                }
            }

            return true;
        };

        const forceBridges = () => {
            if (count <= 1) return true;

            for (let i = 0; i < count; i++) {
                tin[i] = 0;
                tout[i] = 0;
            }

            timer = 0;
            bridgeForced = false;

            if (!dfsBridges(0, -1)) return false;

            // Граф мог распасться — тогда решение невозможно.
            for (let i = 1; i < count; i++) {
                if (tin[i] === 0) return false;
            }

            return true;
        };

        // ============================================================
        // Поиск.
        // ============================================================

        let solutions = 0;
        let aborted = false;
        let calls = 0;

        const search = () => {
            if (aborted || solutions >= maxSolutions) return;

            calls++;

            // performance.now() недешёвый, поэтому проверяем время
            // не на каждом узле, а раз в 63 вызова.
            if ((calls & 63) === 0 && SolutionChecker.now() > timeLimit) {
                aborted = true;
                return;
            }

            const mark = trailLength;

            if (!propagate()) {
                undoTo(mark);
                return;
            }

            // Мосты потенциального графа обязаны быть выбраны.
            // После такого вывода появляются новые ограничения,
            // поэтому повторяем до устойчивого состояния.
            for (;;) {
                if (!forceBridges()) {
                    undoTo(mark);
                    return;
                }

                if (!bridgeForced) break;

                if (!propagate()) {
                    undoTo(mark);
                    return;
                }
            }

            if (!isPotentialConnected()) {
                undoTo(mark);
                return;
            }

            // Самый ограниченный остров: меньше всего нерешённых рёбер.
            let branchIsland = -1;
            let branchCount = Infinity;
            let branchNeed = Infinity;

            for (let i = 0; i < count; i++) {
                if (need[i] <= 0) continue;

                const list = incident[i];

                let undecided = 0;

                for (let k = 0; k < list.length; k++) {
                    if (value[list[k]] === -1) undecided++;
                }

                if (undecided === 0) {
                    undoTo(mark);
                    return;
                }

                if (
                    undecided < branchCount ||
                    (undecided === branchCount && need[i] < branchNeed)
                ) {
                    branchIsland = i;
                    branchCount = undecided;
                    branchNeed = need[i];
                }
            }

            if (branchIsland === -1) {
                // Все цели выполнены. Все рёбра уже решены, осталось
                // убедиться, что выбранные мосты связывают карту.
                if (isChosenConnected()) solutions++;

                undoTo(mark);
                return;
            }

            // Из рёбер самого ограниченного острова выбираем то, у
            // которого самый узкий домен, а при равенстве — то, чей
            // второй конец ограничен сильнее.
            let branchEdge = -1;
            let branchWidth = Infinity;
            let branchScore = Infinity;

            const list = incident[branchIsland];

            for (let k = 0; k < list.length; k++) {
                const e = list[k];

                if (value[e] !== -1) continue;

                const width = high[e] - low[e];
                const other = otherEnd(e, branchIsland);

                let otherUndecided = 0;
                const otherList = incident[other];

                for (let j = 0; j < otherList.length; j++) {
                    if (value[otherList[j]] === -1) otherUndecided++;
                }

                const score = otherUndecided * 4 - high[e];

                if (
                    width < branchWidth ||
                    (width === branchWidth && score < branchScore)
                ) {
                    branchWidth = width;
                    branchScore = score;
                    branchEdge = e;
                }
            }

            const edge = edges[branchEdge];
            const other = edge.a === branchIsland ? edge.b : edge.a;

            const maxBridges = Math.min(
                high[branchEdge],
                need[branchIsland],
                need[other]
            );

            const minBridges = Math.max(
                low[branchEdge],
                0
            );

            // Сначала пробуем максимальное заполнение: так быстрее
            // находится само решение, а перебор всё равно проверит
            // остальные варианты.
            for (
                let bridges = maxBridges;
                bridges >= minBridges;
                bridges--
            ) {
                const branchMark = trailLength;

                if (applyEdge(branchEdge, bridges)) {
                    search();
                }

                undoTo(branchMark);

                if (aborted || solutions >= maxSolutions) break;
            }

            undoTo(mark);
        };

        // Начальное распространение: цели 0 сразу запрещают рёбра.
        for (let i = 0; i < count; i++) {
            pushDirty(i);
        }

        search();

        // -1 означает: перебор прерван по времени, решение не установлено.
        return aborted ? -1 : solutions;
    }

    isSolutionConnected(solutionEdges, islandCount) {
        if (islandCount === 0) {
            return false;
        }

        if (islandCount === 1) {
            return true;
        }

        // Связный граф на N вершинах не может иметь меньше N-1 рёбер.
        if (!solutionEdges || solutionEdges.length < islandCount - 1) {
            return false;
        }

        const parent = new Int32Array(islandCount);

        for (let i = 0; i < islandCount; i++) parent[i] = i;

        const find = (value) => {
            let root = value;

            while (parent[root] !== root) {
                root = parent[root];
            }

            while (parent[value] !== value) {
                const next = parent[value];
                parent[value] = root;
                value = next;
            }

            return root;
        };

        for (const edge of solutionEdges) {
            const rootA = find(edge.a);
            const rootB = find(edge.b);

            if (rootA !== rootB) {
                parent[rootB] = rootA;
            }
        }

        const firstRoot = find(0);

        for (let i = 1; i < islandCount; i++) {
            if (find(i) !== firstRoot) {
                return false;
            }
        }

        return true;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SolutionChecker;
}
