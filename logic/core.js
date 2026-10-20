/*
 * Общие примитивы логики: время, разбор ключей, ограничения и
 * хранилище мостов.
 *
 * Классический script-модуль: он публикует общие значения в
 * globalThis.BridgesLogicCore, чтобы части логики не зависели друг
 * от друга напрямую. Это сохраняет загрузку без сборщика.
 */
(function () {
  "use strict";

  // Единый источник времени: performance.now() есть не во всех окружениях
  // (например, в тестовой песочнице Node), поэтому используем безопасный fallback.
  const gameNow = () => {
    if (
      typeof performance !== 'undefined' &&
      typeof performance.now === 'function'
    ) {
      return performance.now();
    }

    return Date.now();
  };

  function parseBoardKey(key) {
    if (typeof key !== 'string') return null;

    const comma = key.indexOf(',');

    if (comma <= 0 || comma === key.length - 1) return null;

    const r = Number(key.slice(0, comma));
    const c = Number(key.slice(comma + 1));

    return Number.isInteger(r) && Number.isInteger(c)
      ? { r, c }
      : null;
  }

  // Максимальное число на острове.
  const MAX_ISLAND_TARGET = 8;

  // Между двумя островами можно проложить не более двух мостов.
  // Двойные мосты и делают головоломку интереснее: число на острове
  // приходится распределять между несколькими связями.
  const DEFAULT_MAX_BRIDGE_COUNT = 2;
  const MAX_ALLOWED_BRIDGE_COUNT = 2;

  /**
   * Хранилище мостов с готовым индексом.
   *
   * Раньше число мостов у острова вычислялось полным перебором всех мостов
   * (с повторным разбором строковых ключей) при каждой отрисовке кадра.
   * Теперь каждая операция set/delete/clear обновляет:
   *   - суммарное число мостов для каждого острова;
   *   - разобранную геометрию каждого моста.
   *
   * Благодаря этому игровой цикл и проверка победы не пересчитывают одно и то
   * же заново, а берут готовые значения за O(1).
   */
  class BridgeStore extends Map {
    constructor(logic, entries = null) {
      super();

      this.logic = logic;
      this.totals = new Map();
      this.edgeMeta = new Map();

      if (entries) {
        for (const [key, count] of entries) {
          this.set(key, count);
        }
      }
    }

    parseEdge(edgeKey) {
      if (typeof edgeKey !== 'string') return null;

      const dash = edgeKey.indexOf('-');

      if (dash <= 0 || dash === edgeKey.length - 1) return null;

      const first = parseBoardKey(edgeKey.slice(0, dash));
      const second = parseBoardKey(edgeKey.slice(dash + 1));

      if (!first || !second) return null;

      const r1 = first.r;
      const c1 = first.c;
      const r2 = second.r;
      const c2 = second.c;

      if (r1 !== r2 && c1 !== c2) return null;

      const vertical = c1 === c2;

      return {
        edgeKey,
        key1: `${r1},${c1}`,
        key2: `${r2},${c2}`,
        r1,
        c1,
        r2,
        c2,
        vertical,
        minR: Math.min(r1, r2),
        maxR: Math.max(r1, r2),
        minC: Math.min(c1, c2),
        maxC: Math.max(c1, c2),
        row: r1,
        col: c1
      };
    }

    addTotal(islandKey, delta) {
      if (delta === 0) return;

      const next = (this.totals.get(islandKey) || 0) + delta;

      if (next === 0) {
        this.totals.delete(islandKey);
      } else {
        this.totals.set(islandKey, next);
      }
    }

    set(edgeKey, count) {
      const hadValue = this.has(edgeKey);
      const previous = hadValue ? super.get(edgeKey) : 0;

      let meta = this.edgeMeta.get(edgeKey);

      if (!meta) {
        meta = this.parseEdge(edgeKey);

        if (meta) {
          this.edgeMeta.set(edgeKey, meta);
        }
      }

      super.set(edgeKey, count);

      if (!meta) return this;

      const indexedPrevious =
        Number.isFinite(previous) ? previous : 0;
      const indexedNext =
        Number.isFinite(count) ? count : 0;

      if (hadValue) {
        this.addTotal(meta.key1, -indexedPrevious);
        this.addTotal(meta.key2, -indexedPrevious);
      }

      this.addTotal(meta.key1, indexedNext);
      this.addTotal(meta.key2, indexedNext);

      return this;
    }

    delete(edgeKey) {
      if (!this.has(edgeKey)) return false;

      const meta = this.edgeMeta.get(edgeKey);
      const previous = super.get(edgeKey);
      const indexedPrevious =
        Number.isFinite(previous) ? previous : 0;

      if (meta) {
        this.addTotal(meta.key1, -indexedPrevious);
        this.addTotal(meta.key2, -indexedPrevious);
      }

      const deleted = super.delete(edgeKey);

      this.edgeMeta.delete(edgeKey);

      return deleted;
    }

    clear() {
      super.clear();
      this.totals.clear();
      this.edgeMeta.clear();
    }

    getTotal(islandKey) {
      return this.totals.get(islandKey) || 0;
    }

    getMeta(edgeKey) {
      let meta = this.edgeMeta.get(edgeKey);

      if (!meta) {
        meta = this.parseEdge(edgeKey);

        if (meta) this.edgeMeta.set(edgeKey, meta);
      }

      return meta;
    }

    getMetas() {
      const metas = [];

      for (const edgeKey of this.keys()) {
        const meta = this.getMeta(edgeKey);

        if (meta) {
          metas.push(meta);
        } else {
          metas.push({ edgeKey, invalid: true });
        }
      }

      return metas;
    }
  }

  globalThis.BridgesLogicCore = {
    gameNow,
    parseBoardKey,
    MAX_ISLAND_TARGET,
    DEFAULT_MAX_BRIDGE_COUNT,
    MAX_ALLOWED_BRIDGE_COUNT,
    BridgeStore
  };
})();
