/*
 * Логика партии 3D-режима «Мосты».
 *
 * Это состояние игры поверх генератора из logic3d/spike.js: острова с числами
 * и текущий набор мостов. Отвечает на три вопроса — можно ли поставить мост,
 * как меняется состояние от клика и решена ли карта.
 *
 * Классический script-модуль: публикует BridgesLogic3D в window.
 */
(function (global) {
  "use strict";

  const Core =
    global.BridgesSpike3D ||
    (typeof require === "function" ? require("./spike.js") : null);

  if (!Core) {
    throw new Error(
      "BridgesLogic3D: не найден 3D-спайк. Подключите logic3d/spike.js раньше."
    );
  }

  const {
    key3d,
    parseKey3d,
    sharedAxis3d,
    edgeKey3d,
    edgeMeta3d,
    parseEdgeKey3d,
    crossEdge3d,
    isClear3d,
    expandBoard3d
  } = Core;

  class BridgesLogic3D {
    constructor(islands, maxBridgeCount, size) {
      this.islands = new Map(islands);
      this.maxBridgeCount = maxBridgeCount || Core.MAX_BRIDGE_3D || 2;

      // Размер куба знает только вызывающий: расширению он нужен, чтобы
      // сдвинуть старую карту в центр выросшего поля.
      this.size = Number.isInteger(size) ? size : null;

      this.islandKeys = [...this.islands.keys()];
      this.islandSet = new Set(this.islandKeys);

      // edgeKey -> { meta, count, k1, k2 }
      this.bridges = new Map();

      // Сумма кратностей мостов у каждого острова. Держим индекс, чтобы
      // проверки «решено / не перебор» были дешёвыми.
      this.totals = new Map(this.islandKeys.map((key) => [key, 0]));
    }

    countAt(key) {
      return this.totals.get(key) || 0;
    }

    isSatisfied(key) {
      return this.countAt(key) === this.islands.get(key);
    }

    getMultiplicity(p1, p2) {
      const entry = this.bridges.get(edgeKey3d(p1, p2));
      return entry ? entry.count : 0;
    }

    /*
     * Можно ли соединить два острова: они на одной оси, между ними нет
     * других островов и новый мост никого не пересекает.
     */
    canConnect(p1, p2) {
      const k1 = key3d(p1);
      const k2 = key3d(p2);

      if (k1 === k2) return false;
      if (!this.islands.has(k1) || !this.islands.has(k2)) return false;

      const axis = sharedAxis3d(p1, p2);
      if (axis < 0) return false;
      if (!isClear3d(p1, p2, this.islandSet)) return false;

      const meta = edgeMeta3d(p1, p2);

      for (const entry of this.bridges.values()) {
        if (crossEdge3d(meta, entry.meta)) return false;
      }

      return true;
    }

    /*
     * Клик по цели идёт по кругу, как в 2D: 0 -> 1 -> 2 -> 0.
     * Возвращает новую кратность или -1, если мост поставить нельзя.
     */
    cycleBridge(p1, p2) {
      if (!this.canConnect(p1, p2)) return -1;

      const key = edgeKey3d(p1, p2);
      const k1 = key3d(p1);
      const k2 = key3d(p2);
      const existing = this.bridges.get(key);

      if (!existing) {
        this.bridges.set(key, {
          meta: edgeMeta3d(p1, p2),
          count: 1,
          k1,
          k2
        });
        this.totals.set(k1, this.totals.get(k1) + 1);
        this.totals.set(k2, this.totals.get(k2) + 1);
        return 1;
      }

      if (existing.count >= this.maxBridgeCount) {
        this.bridges.delete(key);
        this.totals.set(k1, this.totals.get(k1) - existing.count);
        this.totals.set(k2, this.totals.get(k2) - existing.count);
        return 0;
      }

      existing.count += 1;
      this.totals.set(k1, this.totals.get(k1) + 1);
      this.totals.set(k2, this.totals.get(k2) + 1);
      return existing.count;
    }

    removeBridge(p1, p2) {
      const key = edgeKey3d(p1, p2);
      const existing = this.bridges.get(key);

      if (!existing) return false;

      this.bridges.delete(key);
      this.totals.set(existing.k1, this.totals.get(existing.k1) - existing.count);
      this.totals.set(existing.k2, this.totals.get(existing.k2) - existing.count);
      return true;
    }

    /*
     * Острова, достижимые от p1 вдоль выбранной оси без других островов
     * на пути. Это и есть цели под гизмо.
     */
    reachableAlongAxis(p1, axis) {
      const result = [];
      const sourceKey = key3d(p1);

      for (const key of this.islandKeys) {
        if (key === sourceKey) continue;

        const coord = parseKey3d(key);

        if (sharedAxis3d(p1, coord) !== axis) continue;
        if (!isClear3d(p1, coord, this.islandSet)) continue;

        result.push({ key, coord });
      }

      return result;
    }

    /*
     * Расширение пройденной карты: куб растёт, старые острова сдвигаются
     * в центр, вокруг появляются новые листья. Старые мосты остаются
     * у игрока, а числа вырастают — новые острова надо достроить самому.
     *
     * Возвращает false, если расширить не удалось: состояние при этом
     * остаётся прежним.
     */
    expandLevel(options = {}) {
      const size = options.size ?? this.size;

      if (!Number.isInteger(size)) return false;
      if (this.islands.size === 0 || this.bridges.size === 0) return false;

      // Расширяемся только от решённой карты: мосты на момент победы
      // и есть её решение.
      for (const key of this.islandKeys) {
        if (this.totals.get(key) !== this.islands.get(key)) return false;
      }

      const bridgeCounts = new Map();

      for (const [edgeKey, entry] of this.bridges) {
        bridgeCounts.set(edgeKey, entry.count);
      }

      const board = expandBoard3d(
        { size, islands: this.islands, bridges: bridgeCounts },
        {
          maxBridgeCount: this.maxBridgeCount,
          growth: options.growth,
          addIslands: options.addIslands,
          doubleChance: options.doubleChance,
          maxAttempts: options.maxAttempts,
          solverBudgetMs: options.solverBudgetMs,
          rng: options.rng
        }
      );

      if (!board) return false;

      this.size = board.size;
      this._replaceBoard(board.islands, board.bridges);

      return true;
    }

    /*
     * Пересобрать состояние под новую карту: числа, мосты, индексы
     * и суммы кратностей.
     */
    _replaceBoard(islands, bridges) {
      this.islands = new Map(islands);
      this.islandKeys = [...this.islands.keys()];
      this.islandSet = new Set(this.islandKeys);
      this.totals = new Map(this.islandKeys.map((key) => [key, 0]));
      this.bridges = new Map();

      for (const [edgeKey, count] of bridges) {
        const ends = parseEdgeKey3d(edgeKey);

        if (!ends) continue;

        const meta = edgeMeta3d(ends[0], ends[1]);
        const k1 = key3d(ends[0]);
        const k2 = key3d(ends[1]);

        this.bridges.set(meta.edgeKey, { meta, count, k1, k2 });
        this.totals.set(k1, this.totals.get(k1) + count);
        this.totals.set(k2, this.totals.get(k2) + count);
      }
    }

    /*
     * Победа: все числа ровно совпали и все острова в одной компоненте.
     */
    isSolved() {
      if (this.bridges.size === 0) return false;

      for (const key of this.islandKeys) {
        if (this.totals.get(key) !== this.islands.get(key)) return false;
      }

      const parent = new Map(this.islandKeys.map((key) => [key, key]));

      const find = (value) => {
        let root = value;

        while (parent.get(root) !== root) root = parent.get(root);

        while (parent.get(value) !== value) {
          const next = parent.get(value);
          parent.set(value, root);
          value = next;
        }

        return root;
      };

      for (const entry of this.bridges.values()) {
        const ra = find(entry.k1);
        const rb = find(entry.k2);

        if (ra !== rb) parent.set(rb, ra);
      }

      const first = find(this.islandKeys[0]);

      for (const key of this.islandKeys) {
        if (find(key) !== first) return false;
      }

      return true;
    }
  }

  global.BridgesLogic3D = BridgesLogic3D;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { BridgesLogic3D };
  }
})(typeof window !== "undefined" ? window : globalThis);
