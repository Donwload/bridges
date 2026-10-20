/*
 * Экспериментальная логика 3D-режима «Мосты» (спайк).
 *
 * Здесь только математика, без рендера. Проверяем, что трёхмерный вариант
 * головоломки можно генерировать быстро и стабильно с ровно одним решением.
 *
 * Модель:
 *   - остров — точка решётки [x, y, z], целые 0..size-1;
 *   - ключ острова — "x,y,z";
 *   - мост идёт вдоль одной из трёх осей (у концов совпадают две координаты);
 *   - кратность моста 1 или 2, число острова — сумма кратностей его мостов;
 *   - мосты вдоль разных осей пересекаются только внутри общей плоскости.
 *
 * Файл совместим и с браузером (классический script), и с Node (module.exports).
 */

const now3d = () =>
  typeof performance !== "undefined" &&
  typeof performance.now === "function"
    ? performance.now()
    : Date.now();

const MAX_ISLAND_TARGET_3D = 8;
const MAX_BRIDGE_3D = 2;

function key3d(coord) {
  return coord[0] + "," + coord[1] + "," + coord[2];
}

function parseKey3d(key) {
  if (typeof key !== "string") return null;

  const parts = key.split(",");

  if (parts.length !== 3) return null;

  const coord = parts.map(Number);

  return coord.every(Number.isInteger) ? coord : null;
}

/*
 * Возвращает индекс оси, вдоль которой лежат две точки, если у них
 * совпадают ровно две координаты. Иначе -1 (точки не на одной прямой).
 */
function sharedAxis3d(p, q) {
  const diff = [];

  for (let i = 0; i < 3; i++) {
    if (p[i] !== q[i]) diff.push(i);
  }

  return diff.length === 1 ? diff[0] : -1;
}

function edgeKey3d(p, q) {
  const a = key3d(p);
  const b = key3d(q);

  return a < b ? a + "-" + b : b + "-" + a;
}

function edgeMeta3d(p, q) {
  const axis = sharedAxis3d(p, q);

  if (axis < 0) return null;

  return {
    axis,
    p1: p.slice(),
    p2: q.slice(),
    edgeKey: edgeKey3d(p, q)
  };
}

/*
 * Разбор ключа моста "x,y,z-x,y,z". Координаты неотрицательны, поэтому
 * дефис в ключе ровно один.
 */
function parseEdgeKey3d(edgeKey) {
  if (typeof edgeKey !== "string") return null;

  const parts = edgeKey.split("-");

  if (parts.length !== 2) return null;

  const p = parseKey3d(parts[0]);
  const q = parseKey3d(parts[1]);

  return p && q ? [p, q] : null;
}

/*
 * Пересечение двух мостов.
 *
 * Мосты вдоль одной оси параллельны и не пересекаются. Мосты вдоль разных
 * осей могут пересечься только внутри общей координатной плоскости:
 * третья координата должна совпадать, а потом идёт обычная проверка
 * пересечения отрезков в этой плоскости.
 */
function crossEdge3d(m1, m2) {
  if (m1.axis === m2.axis) return false;

  const a = m1.axis;
  const b = m2.axis;
  const c = 3 - a - b;

  if (m1.p1[c] !== m2.p1[c]) return false;

  const aMin = Math.min(m1.p1[a], m1.p2[a]);
  const aMax = Math.max(m1.p1[a], m1.p2[a]);
  const bMin = Math.min(m2.p1[b], m2.p2[b]);
  const bMax = Math.max(m2.p1[b], m2.p2[b]);

  const aOfSecond = m2.p1[a];
  const bOfFirst = m1.p1[b];

  return (
    aMin < aOfSecond &&
    aOfSecond < aMax &&
    bMin < bOfFirst &&
    bOfFirst < bMax
  );
}

/*
 * Между двумя островами не должно быть других островов на той же линии.
 */
function isClear3d(p, q, islandSet) {
  const axis = sharedAxis3d(p, q);

  if (axis < 0) return false;

  const lo = Math.min(p[axis], q[axis]);
  const hi = Math.max(p[axis], q[axis]);
  const probe = p.slice();

  for (let v = lo + 1; v < hi; v++) {
    probe[axis] = v;

    if (islandSet.has(key3d(probe))) return false;
  }

  return true;
}

/*
 * Видимые соседи клетки: ближайший остров в каждую сторону по каждой оси.
 * Дальние острова за ближайшим перекрыты, поэтому они не возвращаются —
 * ровно так же, как их видит игрок.
 */
function visibleNeighbours3d(coord, islandSet, size) {
  const result = [];
  const probe = [0, 0, 0];

  for (let axis = 0; axis < 3; axis++) {
    for (const dir of [-1, 1]) {
      probe[0] = coord[0];
      probe[1] = coord[1];
      probe[2] = coord[2];

      for (;;) {
        probe[axis] += dir;

        if (probe[axis] < 0 || probe[axis] >= size) break;

        const key = key3d(probe);

        if (islandSet.has(key)) {
          result.push(key);
          break;
        }
      }
    }
  }

  return result;
}

/*
 * Все возможные рёбра: на каждой линии (фиксированы две координаты)
 * соседние острова соединены. Это заменяет попарный перебор.
 */
function buildCandidateEdges3d(islands) {
  const nodes = [...islands.keys()];
  const edges = [];

  for (let axis = 0; axis < 3; axis++) {
    const groups = new Map();

    for (const key of nodes) {
      const coord = parseKey3d(key);
      const others = [];

      for (let t = 0; t < 3; t++) {
        if (t !== axis) others.push(coord[t]);
      }

      const groupKey = others.join(",");

      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push({ key, v: coord[axis], coord });
    }

    for (const list of groups.values()) {
      list.sort((x, y) => x.v - y.v);

      for (let j = 0; j + 1 < list.length; j++) {
        edges.push({
          a: nodes.indexOf(list[j].key),
          b: nodes.indexOf(list[j + 1].key),
          meta: edgeMeta3d(list[j].coord, list[j + 1].coord)
        });
      }
    }
  }

  return { nodes, edges };
}

class Solver3D {
  constructor(islands, maxBridgeCount = MAX_BRIDGE_3D) {
    this.islands = islands;
    this.maxBridgeCount = maxBridgeCount;
  }

  /*
   * Считает решения по снимку карты.
   *   1  — ровно одно;
   *   0  — решений нет;
   *   >1 — несколько (останавливается на maxSolutions);
   *   -1 — прервано по времени.
   */
  countSolutions(maxSolutions = 2, deadline = null) {
    const nodes = [...this.islands.keys()];
    const n = nodes.length;

    if (n === 0) return 1;

    const targets = nodes.map((key) => this.islands.get(key));
    const { edges } = buildCandidateEdges3d(this.islands);
    const E = edges.length;
    const incident = Array.from({ length: n }, () => []);

    edges.forEach((edge, i) => {
      incident[edge.a].push(i);
      incident[edge.b].push(i);
    });

    // Сначала рёбра у самых «зажатых» островов — так отсечение работает раньше.
    const order = edges
      .map((_, i) => i)
      .sort(
        (i, j) =>
          Math.min(incident[edges[i].a].length, incident[edges[i].b].length) -
          Math.min(incident[edges[j].a].length, incident[edges[j].b].length)
      );

    const chosen = new Array(E).fill(0);
    const remaining = targets.slice();
    const capacity = incident.map(
      (list) => list.length * this.maxBridgeCount
    );
    const chosenList = [];

    let solutions = 0;
    let aborted = false;

    const isConnected = () => {
      const parent = Array.from({ length: n }, (_, i) => i);

      const find = (value) => {
        let root = value;

        while (parent[root] !== root) root = parent[root];

        while (parent[value] !== value) {
          const next = parent[value];
          parent[value] = root;
          value = next;
        }

        return root;
      };

      for (const edgeIndex of chosenList) {
        const edge = edges[edgeIndex];
        const ra = find(edge.a);
        const rb = find(edge.b);

        if (ra !== rb) parent[rb] = ra;
      }

      const first = find(0);

      for (let i = 1; i < n; i++) {
        if (find(i) !== first) return false;
      }

      return true;
    };

    const dfs = (pos) => {
      if (aborted || solutions >= maxSolutions) return;

      if (
        (pos & 31) === 0 &&
        deadline !== null &&
        now3d() > deadline
      ) {
        aborted = true;
        return;
      }

      if (pos === order.length) {
        for (let i = 0; i < n; i++) {
          if (remaining[i] !== 0) return;
        }

        if (isConnected()) solutions++;
        return;
      }

      const edgeIndex = order[pos];
      const edge = edges[edgeIndex];
      const A = edge.a;
      const B = edge.b;

      capacity[A] -= this.maxBridgeCount;
      capacity[B] -= this.maxBridgeCount;

      for (let m = this.maxBridgeCount; m >= 0; m--) {
        if (m > remaining[A] || m > remaining[B]) continue;

        if (m > 0) {
          let bad = false;

          for (const otherIndex of chosenList) {
            if (crossEdge3d(edge.meta, edges[otherIndex].meta)) {
              bad = true;
              break;
            }
          }

          if (bad) continue;
        }

        chosen[edgeIndex] = m;

        if (m > 0) {
          remaining[A] -= m;
          remaining[B] -= m;
          chosenList.push(edgeIndex);
        }

        let ok = true;

        for (let i = 0; i < n; i++) {
          if (remaining[i] < 0 || remaining[i] > capacity[i]) {
            ok = false;
            break;
          }
        }

        if (ok) dfs(pos + 1);

        if (m > 0) {
          remaining[A] += m;
          remaining[B] += m;
          chosenList.pop();
        }

        chosen[edgeIndex] = 0;

        if (solutions >= maxSolutions || aborted) break;
      }

      capacity[A] += this.maxBridgeCount;
      capacity[B] += this.maxBridgeCount;
    };

    dfs(0);

    return aborted ? -1 : solutions;
  }
}

/*
 * Независимый перебор «в лоб» — только для кросс-проверки солвера
 * на маленьких картах в бенчмарке.
 */
function bruteForceSolutions3d(islands, maxSolutions = 2, maxBridgeCount = MAX_BRIDGE_3D) {
  const nodes = [...islands.keys()];
  const n = nodes.length;

  if (n === 0) return 1;

  const targets = nodes.map((key) => islands.get(key));
  const { edges } = buildCandidateEdges3d(islands);
  const E = edges.length;

  const chosen = new Array(E).fill(0);
  const current = new Array(n).fill(0);
  let solutions = 0;

  const isConnected = () => {
    const parent = Array.from({ length: n }, (_, i) => i);

    const find = (value) => {
      while (parent[value] !== value) value = parent[value];
      return value;
    };

    for (let i = 0; i < E; i++) {
      if (chosen[i] === 0) continue;

      const ra = find(edges[i].a);
      const rb = find(edges[i].b);

      if (ra !== rb) parent[rb] = ra;
    }

    const first = find(0);

    for (let i = 1; i < n; i++) {
      if (find(i) !== first) return false;
    }

    return true;
  };

  const dfs = (pos) => {
    if (solutions >= maxSolutions) return;

    if (pos === E) {
      for (let i = 0; i < n; i++) {
        if (current[i] !== targets[i]) return;
      }

      if (isConnected()) solutions++;
      return;
    }

    const edge = edges[pos];

    for (let m = 0; m <= maxBridgeCount; m++) {
      if (current[edge.a] + m > targets[edge.a]) continue;
      if (current[edge.b] + m > targets[edge.b]) continue;

      let bad = false;

      if (m > 0) {
        for (let i = 0; i < pos; i++) {
          if (chosen[i] > 0 && crossEdge3d(edge.meta, edges[i].meta)) {
            bad = true;
            break;
          }
        }
      }

      if (bad) continue;

      chosen[pos] = m;
      current[edge.a] += m;
      current[edge.b] += m;

      dfs(pos + 1);

      current[edge.a] -= m;
      current[edge.b] -= m;
      chosen[pos] = 0;
    }
  };

  dfs(0);

  return solutions;
}

/*
 * Детерминированный ГПСЧ: нужен и бенчмарку, и будущим «ежедневным»
 * уровням, где карта должна быть одинаковой у всех.
 */
function mulberry32(seed) {
  let a = seed >>> 0;

  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;

    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateBoard3d(options = {}) {
  const size = options.size ?? 3;
  const minIslands = options.minIslands ?? 4;
  const maxIslands = options.maxIslands ?? 8;
  const rng = options.rng ?? Math.random;
  const maxAttempts = options.maxAttempts ?? 300;
  const nodeCap = options.nodeCap ?? 20000;
  const treeTimeCap = options.treeTimeCapMs ?? 30;
  const solverBudget = options.solverBudgetMs ?? 30;
  const totalTimeCap = options.totalTimeCapMs ?? 5000;
  const started = now3d();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (now3d() - started > totalTimeCap) break;

    const islandCount =
      minIslands + Math.floor(rng() * (maxIslands - minIslands + 1));

    const placed = [];
    const islandSet = new Set();

    const addIsland = (coord) => {
      placed.push(coord);
      islandSet.add(key3d(coord));
    };

    addIsland([
      Math.floor(rng() * size),
      Math.floor(rng() * size),
      Math.floor(rng() * size)
    ]);

    while (placed.length < islandCount) {
      const candidates = [];

      for (const source of placed) {
        for (let axis = 0; axis < 3; axis++) {
          for (const dir of [-1, 1]) {
            for (let d = 2; d <= size - 1; d++) {
              const coord = source.slice();
              coord[axis] += dir * d;

              if (coord[axis] < 0 || coord[axis] >= size) continue;
              if (islandSet.has(key3d(coord))) continue;

              let tooClose = false;

              for (const other of placed) {
                const manhattan =
                  Math.abs(other[0] - coord[0]) +
                  Math.abs(other[1] - coord[1]) +
                  Math.abs(other[2] - coord[2]);

                if (manhattan < 2) {
                  tooClose = true;
                  break;
                }
              }

              if (tooClose) continue;
              if (!isClear3d(source, coord, islandSet)) continue;

              candidates.push(coord);
            }
          }
        }
      }

      if (candidates.length === 0) break;

      addIsland(candidates[Math.floor(rng() * candidates.length)]);
    }

    if (placed.length < minIslands) continue;

    const placedSet = new Set(placed.map(key3d));
    const treeStart = now3d();
    let nodesExplored = 0;

    const buildTree = (connected, remaining, chosen) => {
      nodesExplored++;

      if (nodesExplored > nodeCap || now3d() - treeStart > treeTimeCap) {
        return false;
      }

      if (remaining.size === 0) return true;

      const candidates = [];

      for (const connectedKey of connected) {
        const cp = parseKey3d(connectedKey);

        for (const remainingKey of remaining) {
          const rp = parseKey3d(remainingKey);

          if (sharedAxis3d(cp, rp) < 0) continue;
          if (!isClear3d(cp, rp, placedSet)) continue;

          const meta = edgeMeta3d(cp, rp);
          let bad = false;

          for (const entry of chosen.values()) {
            if (crossEdge3d(meta, entry.meta)) {
              bad = true;
              break;
            }
          }

          if (bad) continue;

          candidates.push({ key2: remainingKey, meta });
        }
      }

      if (candidates.length === 0) return false;

      for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
      }

      for (const candidate of candidates) {
        const count = rng() < 0.5 ? 2 : 1;

        chosen.set(candidate.meta.edgeKey, { meta: candidate.meta, count });
        connected.add(candidate.key2);
        remaining.delete(candidate.key2);

        if (buildTree(connected, remaining, chosen)) return true;

        chosen.delete(candidate.meta.edgeKey);
        connected.delete(candidate.key2);
        remaining.add(candidate.key2);
      }

      return false;
    };

    const chosenTree = new Map();
    const connected = new Set([key3d(placed[0])]);
    const remaining = new Set(placed.slice(1).map(key3d));

    if (!buildTree(connected, remaining, chosenTree)) continue;

    const targets = new Map();
    for (const coord of placed) targets.set(key3d(coord), 0);

    for (const entry of chosenTree.values()) {
      const k1 = key3d(entry.meta.p1);
      const k2 = key3d(entry.meta.p2);

      targets.set(k1, targets.get(k1) + entry.count);
      targets.set(k2, targets.get(k2) + entry.count);
    }

    let valid = true;

    for (const value of targets.values()) {
      if (value < 1 || value > MAX_ISLAND_TARGET_3D) {
        valid = false;
        break;
      }
    }

    if (!valid) continue;

    const solver = new Solver3D(targets, MAX_BRIDGE_3D);
    const solutions = solver.countSolutions(2, now3d() + solverBudget);

    if (solutions !== 1) continue;

    return {
      size,
      islands: targets,
      solution: chosenTree,
      attempts: attempt + 1,
      time: now3d() - started
    };
  }

  return null;
}

/*
 * Расширение уже решённой карты — 3D-аналог logic/expansion.js.
 *
 * Старая карта сдвигается в центр увеличенного куба, а новые острова
 * ставятся «листьями»: у каждого ровно один видимый сосед, поэтому его
 * мост вынужден, а число равно кратности этого моста. После вычитания
 * вынужденных мостов остаётся прежняя карта, а она по инварианту игры
 * единственна — солвер нужен только как страховка.
 *
 * Чтобы новые острова не видели друг друга, никакие два из них не должны
 * лежать на общей линии. Значит, у каждого нового острова уникальны все
 * три «ключевые пары» — (y,z), (x,z) и (x,y). Это 3D-аналог уникальных
 * строк и столбцов в 2D.
 *
 * Вход:  { size, islands: Map<key, число>, bridges: Map<edgeKey, кратность> }.
 * Выход: { size, shift, islands, bridges, added, solution, attempts }
 *        либо null, если за отведённые попытки расширить не удалось.
 *
 * В bridges возвращаются только старые мосты (со сдвигом): новая карта
 * получает новые числа, а достроить листья — дело игрока.
 */
function expandBoard3d(board, options = {}) {
  if (!board || !board.islands || !board.bridges) return null;

  const size = board.size;
  const oldIslands = board.islands;
  const oldBridges = board.bridges;

  if (!Number.isInteger(size) || size < 2) return null;
  if (oldIslands.size < 2 || oldBridges.size === 0) return null;

  const maxBridgeCount = options.maxBridgeCount ?? MAX_BRIDGE_3D;

  // Сдвиг должен быть целым, поэтому рост поля делаем чётным.
  const asked = Math.max(0, Math.round(options.growth ?? 2));
  const growth = asked % 2 === 0 ? asked : asked + 1;
  const shift = growth / 2;
  const newSize = size + growth;

  const addIslands = Math.max(1, Math.round(options.addIslands ?? 2));
  const maxAttempts = Math.max(1, Math.round(options.maxAttempts ?? 40));
  const rng = options.rng ?? Math.random;
  const doubleChance = Math.min(1, Math.max(0, options.doubleChance ?? 0.5));
  const solverBudgetMs = options.solverBudgetMs ?? 250;

  // --- 1. Сдвигаем старую карту в центр нового куба ---

  const shiftedKeys = new Map();

  for (const key of oldIslands.keys()) {
    const coord = parseKey3d(key);

    if (!coord) return null;

    const moved = key3d([
      coord[0] + shift,
      coord[1] + shift,
      coord[2] + shift
    ]);

    if (shiftedKeys.has(moved)) return null;

    shiftedKeys.set(moved, 0);
  }

  const baseBridges = [];

  for (const [edgeKey, raw] of oldBridges) {
    const ends =
      raw && raw.meta && raw.meta.p1 && raw.meta.p2
        ? [raw.meta.p1, raw.meta.p2]
        : parseEdgeKey3d(edgeKey);

    if (!ends) return null;

    const rawCount = typeof raw === "number" ? raw : raw && raw.count;

    if (!Number.isFinite(rawCount)) return null;

    const p1 = [
      ends[0][0] + shift,
      ends[0][1] + shift,
      ends[0][2] + shift
    ];
    const p2 = [
      ends[1][0] + shift,
      ends[1][1] + shift,
      ends[1][2] + shift
    ];
    const meta = edgeMeta3d(p1, p2);

    if (!meta) return null;
    if (!shiftedKeys.has(key3d(p1)) || !shiftedKeys.has(key3d(p2))) return null;

    baseBridges.push({
      meta,
      count: Math.min(maxBridgeCount, Math.max(1, Math.round(rawCount)))
    });
  }

  // Клетки строго внутри мостов: остров там порвёт мост на две части,
  // поэтому такие клетки закрыты и для старых, и для новых мостов.
  const blocked = new Set();

  for (const entry of baseBridges) {
    const axis = entry.meta.axis;
    const lo = Math.min(entry.meta.p1[axis], entry.meta.p2[axis]);
    const hi = Math.max(entry.meta.p1[axis], entry.meta.p2[axis]);
    const probe = entry.meta.p1.slice();

    for (let v = lo + 1; v < hi; v++) {
      probe[axis] = v;
      blocked.add(key3d(probe));
    }
  }

  const baseTargets = new Map(shiftedKeys);

  for (const entry of baseBridges) {
    const k1 = key3d(entry.meta.p1);
    const k2 = key3d(entry.meta.p2);

    baseTargets.set(k1, baseTargets.get(k1) + entry.count);
    baseTargets.set(k2, baseTargets.get(k2) + entry.count);
  }

  // Внешняя оболочка нового куба: там листья не заслоняют старую карту.
  const inOldBox = (coord) =>
    coord[0] >= shift && coord[0] < shift + size &&
    coord[1] >= shift && coord[1] < shift + size &&
    coord[2] >= shift && coord[2] < shift + size;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const islandSet = new Set(shiftedKeys.keys());
    const targets = new Map(baseTargets);
    const usedLines = new Set();
    const planned = new Map();
    const leaves = [];
    const inner = new Set(blocked);
    let ok = true;

    /*
     * Ищем клетку под лист: свободна, видит ровно один остров, её мост
     * никого не пересекает и не мешает уже намеченным листьям. Из
     * подходящих клеток берём случайную, отдавая предпочтение внешней
     * оболочке — так старая карта остаётся компактной.
     */
    const pickLeaf = (wanted) => {
      let best = null;
      let bestRank = Infinity;
      let bestCount = 0;

      for (let x = 0; x < newSize; x++) {
        for (let y = 0; y < newSize; y++) {
          for (let z = 0; z < newSize; z++) {
            const coord = [x, y, z];
            const key = key3d(coord);

            if (islandSet.has(key)) continue;
            if (inner.has(key)) continue;

            const l0 = "0|" + y + "|" + z;
            const l1 = "1|" + x + "|" + z;
            const l2 = "2|" + x + "|" + y;

            if (usedLines.has(l0)) continue;
            if (usedLines.has(l1)) continue;
            if (usedLines.has(l2)) continue;

            const neighbours = visibleNeighbours3d(coord, islandSet, newSize);

            if (neighbours.length !== 1) continue;

            const nbKey = neighbours[0];
            const meta = edgeMeta3d(coord, parseKey3d(nbKey));

            if (!meta) continue;

            // Кратность листа — его же число. Если соседу столько не
            // влезает до восьми, берём меньше.
            let count = 0;

            for (let m = wanted; m >= 1; m--) {
              if (targets.get(nbKey) + m <= MAX_ISLAND_TARGET_3D) {
                count = m;
                break;
              }
            }

            if (count === 0) continue;

            let crossed = false;

            for (const entry of baseBridges) {
              if (crossEdge3d(meta, entry.meta)) {
                crossed = true;
                break;
              }
            }

            if (!crossed) {
              for (const entry of planned.values()) {
                if (crossEdge3d(meta, entry.meta)) {
                  crossed = true;
                  break;
                }
              }
            }

            if (crossed) continue;

            const rank = inOldBox(coord) ? 1 : 0;
            const candidate = { key, coord, nbKey, meta, count };

            if (rank < bestRank) {
              bestRank = rank;
              bestCount = 1;
              best = candidate;
            } else if (rank === bestRank) {
              bestCount++;
              if (rng() < 1 / bestCount) best = candidate;
            }
          }
        }
      }

      return best;
    };

    for (let i = 0; i < addIslands; i++) {
      const chosen = pickLeaf(rng() < doubleChance ? 2 : 1);

      if (!chosen) {
        ok = false;
        break;
      }

      const axis = chosen.meta.axis;
      const lo = Math.min(chosen.coord[axis], chosen.meta.p2[axis]);
      const hi = Math.max(chosen.coord[axis], chosen.meta.p2[axis]);
      const probe = chosen.coord.slice();

      islandSet.add(chosen.key);
      targets.set(chosen.key, chosen.count);
      targets.set(chosen.nbKey, targets.get(chosen.nbKey) + chosen.count);

      usedLines.add("0|" + chosen.coord[1] + "|" + chosen.coord[2]);
      usedLines.add("1|" + chosen.coord[0] + "|" + chosen.coord[2]);
      usedLines.add("2|" + chosen.coord[0] + "|" + chosen.coord[1]);

      planned.set(chosen.meta.edgeKey, {
        meta: chosen.meta,
        count: chosen.count
      });

      leaves.push(chosen);

      for (let v = lo + 1; v < hi; v++) {
        probe[axis] = v;
        inner.add(key3d(probe));
      }
    }

    if (!ok) continue;

    // --- 2. Собираем карту и проверяем её ---

    const finalIslands = new Map();

    for (const key of shiftedKeys.keys()) finalIslands.set(key, targets.get(key));
    for (const leaf of leaves) finalIslands.set(leaf.key, leaf.count);

    let valid = true;

    for (const value of finalIslands.values()) {
      if (!Number.isInteger(value) || value < 1 || value > MAX_ISLAND_TARGET_3D) {
        valid = false;
        break;
      }
    }

    if (!valid) continue;

    /*
     * Структурная гарантия единственности: у каждого нового острова ровно
     * один видимый сосед, и его число равно кратности моста к нему. Значит,
     * все мосты листьев вынуждены, а остаток — это прежняя карта.
     */
    const finalSet = new Set(finalIslands.keys());
    let forcedByConstruction = true;

    for (const leaf of leaves) {
      if (finalIslands.get(leaf.key) !== leaf.count) {
        forcedByConstruction = false;
        break;
      }

      const neighbours = visibleNeighbours3d(leaf.coord, finalSet, newSize);
      const plan = planned.get(leaf.meta.edgeKey);

      if (neighbours.length !== 1 || neighbours[0] !== leaf.nbKey) {
        forcedByConstruction = false;
        break;
      }

      if (!plan || plan.count !== leaf.count) {
        forcedByConstruction = false;
        break;
      }
    }

    const solution = new Map();

    for (const entry of baseBridges) {
      solution.set(entry.meta.edgeKey, { meta: entry.meta, count: entry.count });
    }

    for (const [edgeKey, entry] of planned) solution.set(edgeKey, entry);

    if (!forcedByConstruction) {
      // Страховка: если структура не сошлась, считаем решения солвером.
      const solver = new Solver3D(finalIslands, maxBridgeCount);
      const solutions = solver.countSolutions(2, now3d() + solverBudgetMs);

      if (solutions !== 1) continue;
    }

    const bridges = new Map();

    for (const entry of baseBridges) {
      bridges.set(entry.meta.edgeKey, entry.count);
    }

    return {
      size: newSize,
      shift,
      islands: finalIslands,
      bridges,
      added: leaves.map((leaf) => leaf.key),
      solution,
      attempts: attempt + 1
    };
  }

  return null;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    MAX_ISLAND_TARGET_3D,
    MAX_BRIDGE_3D,
    key3d,
    parseKey3d,
    sharedAxis3d,
    edgeKey3d,
    edgeMeta3d,
    parseEdgeKey3d,
    crossEdge3d,
    isClear3d,
    visibleNeighbours3d,
    buildCandidateEdges3d,
    Solver3D,
    bruteForceSolutions3d,
    mulberry32,
    generateBoard3d,
    expandBoard3d
  };
}

/*
 * Доступ для браузера: следующие classic-script модули (logic3d/game.js и
 * рендер) берут примитивы отсюда. В Node используется module.exports выше.
 */
if (typeof globalThis !== "undefined") {
  globalThis.BridgesSpike3D = {
    MAX_ISLAND_TARGET_3D,
    MAX_BRIDGE_3D,
    key3d,
    parseKey3d,
    sharedAxis3d,
    edgeKey3d,
    edgeMeta3d,
    parseEdgeKey3d,
    crossEdge3d,
    isClear3d,
    visibleNeighbours3d,
    buildCandidateEdges3d,
    Solver3D,
    bruteForceSolutions3d,
    mulberry32,
    generateBoard3d,
    expandBoard3d
  };
}
