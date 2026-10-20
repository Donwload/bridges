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
     * Это важно для генератора: раньше он временно подменял this.islands и
     * this.bridges, а затем восстанавливал их. Теперь проверка идёт по
     * отдельному снимку и не вызывает лишних пересчётов/сбросов кэша.
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

        let aborted = false;

        const islandList = [];

        for (const [key, target] of islands) {
            const point = SolutionChecker.parseKey(key);

            if (!point) return 0;

            islandList.push({
                id: islandList.length,
                key,
                r: point.r,
                c: point.c,
                target
            });
        }

        const count = islandList.length;

        // Строки и столбцы с островами, отсортированные по координате.
        // Соседние острова в таком списке — ровно те, между которыми нет
        // других островов. Это заменяет O(n²) перебор с проверкой пути.
        const rows = new Map();
        const columns = new Map();

        for (const island of islandList) {
            if (!Number.isInteger(island.target) || island.target < 0) {
                return 0;
            }

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
        // Разбиение на кластеры.
        //
        // Если граф возможных мостов распался на несколько компонент,
        // соединить всю карту невозможно. Раньше это выяснялось только
        // полным перебором всех вариантов; теперь — одним проходом DSU.
        // ============================================================
        if (count > 1) {
            const parent = new Int32Array(count);

            for (let i = 0; i < count; i++) parent[i] = i;

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

            for (const edge of edges) {
                const rootA = find(edge.a);
                const rootB = find(edge.b);

                if (rootA !== rootB) {
                    parent[rootB] = rootA;
                }
            }

            const firstRoot = find(0);

            for (let i = 1; i < count; i++) {
                if (find(i) !== firstRoot) {
                    return 0;
                }
            }
        }

        const targets = new Int32Array(count);
        let totalTarget = 0;

        for (let i = 0; i < count; i++) {
            targets[i] = islandList[i].target;
            totalTarget += targets[i];
        }

        if (totalTarget % 2 !== 0) {
            return 0;
        }

        // Ёмкость всех ещё не обработанных рёбер для каждой вершины.
        //
        // Раньше на каждом шаге перебора заново строилась Map
        // remainingCapacity по всем оставшимся рёбрам. Теперь эта величина
        // поддерживается инкрементально: при переходе к следующему ребру
        // достаточно вычесть bridgeLimit у двух его концов.
        const futureCapacity = new Int32Array(count);

        for (const edge of edges) {
            futureCapacity[edge.a] += bridgeLimit;
            futureCapacity[edge.b] += bridgeLimit;
        }

        for (let i = 0; i < count; i++) {
            if (targets[i] > futureCapacity[i]) {
                return 0;
            }
        }

        // Сначала ребра у островов с маленькими целями — они сильнее
        // ограничивают перебор.
        edges.sort((first, second) => {
            const firstMin = Math.min(
                targets[first.a],
                targets[first.b]
            );
            const secondMin = Math.min(
                targets[second.a],
                targets[second.b]
            );

            if (firstMin !== secondMin) {
                return firstMin - secondMin;
            }

            return (
                targets[first.a] +
                targets[first.b] -
                targets[second.a] -
                targets[second.b]
            );
        });

        const degree = new Int32Array(count);
        const chosenEdges = [];

        let remainingVertices = 0;

        for (let i = 0; i < count; i++) {
            if (targets[i] > 0) remainingVertices++;
        }

        let solutions = 0;
        let calls = 0;

        const search = (index) => {
            if (aborted || solutions >= maxSolutions) {
                return;
            }

            calls++;

            // Проверяем время не на каждом узле: performance.now() сам
            // по себе недешёвый, а бюджет нужен лишь как страховка.
            if ((calls & 31) === 0) {
                if (SolutionChecker.now() > timeLimit) {
                    aborted = true;
                    return;
                }
            }

            if (index === edges.length) {
                if (remainingVertices !== 0) return;

                if (!this.isSolutionConnected(chosenEdges, count)) {
                    return;
                }

                solutions++;
                return;
            }

            const edge = edges[index];

            const first = edge.a;
            const second = edge.b;

            const targetA = targets[first];
            const targetB = targets[second];

            const currentA = degree[first];
            const currentB = degree[second];

            // Ёмкость рёбер после текущего.
            const nextCapacityA = futureCapacity[first] - bridgeLimit;
            const nextCapacityB = futureCapacity[second] - bridgeLimit;

            // Больше, чем нужно любому из концов, класть бессмысленно.
            const edgeMax = Math.min(
                bridgeLimit,
                targetA,
                targetB
            );

            for (let bridges = 0; bridges <= edgeMax; bridges++) {
                const nextA = currentA + bridges;
                const nextB = currentB + bridges;

                if (nextA > targetA || nextB > targetB) {
                    continue;
                }

                // Если даже все оставшиеся рёбра не дотянут остров
                // до его числа, ветка тупиковая. Проверяем только концы
                // текущего ребра: остальные вершины были проверены выше.
                if (
                    targetA - nextA > nextCapacityA ||
                    targetB - nextB > nextCapacityB
                ) {
                    continue;
                }

                if (
                    bridges > 0 &&
                    this.logic.hasIntersectionWithEdges(
                        edge,
                        chosenEdges
                    )
                ) {
                    continue;
                }

                let completedDelta = 0;

                if (currentA < targetA && nextA === targetA) {
                    completedDelta--;
                }

                if (currentB < targetB && nextB === targetB) {
                    completedDelta--;
                }

                degree[first] = nextA;
                degree[second] = nextB;

                if (bridges > 0) chosenEdges.push(edge);

                futureCapacity[first] -= bridgeLimit;
                futureCapacity[second] -= bridgeLimit;
                remainingVertices += completedDelta;

                search(index + 1);

                remainingVertices -= completedDelta;
                futureCapacity[first] += bridgeLimit;
                futureCapacity[second] += bridgeLimit;

                if (bridges > 0) chosenEdges.pop();

                degree[first] = currentA;
                degree[second] = currentB;

                if (solutions >= maxSolutions) {
                    return;
                }
            }
        };

        search(0);

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
