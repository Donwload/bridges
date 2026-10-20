/*
 * Геометрия рёбер: ключи, пересечения и разбор путей.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameLogic. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (globalThis.BridgesLogicParts =
    globalThis.BridgesLogicParts || {});

  const { parseBoardKey, BridgeStore } =
    globalThis.BridgesLogicCore;

  parts.geometry = {
  getKey(r, c) { return `${r},${c}`; },

  /**
   * Выбирает кратность нового моста: 1 или 2.
   *
   * multiChance — вероятность, что мост будет двойным. Чем выше
   * сложность, тем чаще выпадают двойные связи и тем интереснее
   * распределять числа на островах.
   */
  pickBridgeCount(maxAllowed, multiChance = 0.5) {
    const limit = Math.max(
      1,
      Math.min(
        this.maxBridgeCount,
        maxAllowed
      )
    );

    if (limit <= 1) return 1;

    const chance = Math.max(0, Math.min(1, multiChance));

    return Math.random() < chance ? 2 : 1;
  },

  ensureBridgeStore() {
    if (
      !(this.bridges instanceof BridgeStore) ||
      this.bridges.logic !== this
    ) {
      this.bridges = new BridgeStore(this, this.bridges);
    }

    return this.bridges;
  },

  getBridgeMetas() {
    return this.ensureBridgeStore().getMetas();
  },

  createEdgeMeta(i1, i2) {
    if (
      !Array.isArray(i1) ||
      !Array.isArray(i2) ||
      i1.length < 2 ||
      i2.length < 2
    ) {
      return null;
    }

    const [r1, c1] = i1;
    const [r2, c2] = i2;

    if (
      !Number.isInteger(r1) ||
      !Number.isInteger(c1) ||
      !Number.isInteger(r2) ||
      !Number.isInteger(c2)
    ) {
      return null;
    }

    if (r1 !== r2 && c1 !== c2) {
      return null;
    }

    const edgeKey = this.getEdgeKey(
      [r1, c1],
      [r2, c2]
    );

    return {
      edgeKey,
      key1: this.getKey(r1, c1),
      key2: this.getKey(r2, c2),
      r1,
      c1,
      r2,
      c2,
      vertical: c1 === c2,
      minR: Math.min(r1, r2),
      maxR: Math.max(r1, r2),
      minC: Math.min(c1, c2),
      maxC: Math.max(c1, c2),
      row: r1,
      col: c1
    };
  },

  edgesCross(first, second) {
    if (!first || !second || first.invalid || second.invalid) {
      return false;
    }

    if (
      first.key1 === second.key1 ||
      first.key1 === second.key2 ||
      first.key2 === second.key1 ||
      first.key2 === second.key2
    ) {
      return false;
    }

    if (first.vertical === second.vertical) {
      return false;
    }

    const vertical = first.vertical ? first : second;
    const horizontal = first.vertical ? second : first;

    return (
      vertical.minR < horizontal.row &&
      horizontal.row < vertical.maxR &&
      horizontal.minC < vertical.col &&
      vertical.col < horizontal.maxC
    );
  },

  hasIntersectionWithEdges(edgeMeta, selectedEdges) {
    if (!edgeMeta || edgeMeta.invalid) return true;

    for (const existing of selectedEdges) {
      if (!existing || existing.invalid) {
        return true;
      }

      if (this.edgesCross(edgeMeta, existing)) {
        return true;
      }
    }

    return false;
  },

  getEdgeKey(i1, i2) {
    const k1 = this.getKey(i1[0], i1[1]);
    const k2 = this.getKey(i2[0], i2[1]);
    return k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
  },

  // Проверка, что между двумя островами нет других островов.
  //
  // allIslands может быть массивом координат или Set с ключами "r,c".
  // В генераторе используется Set — это убирает повторный перебор массива
  // на каждой проверке клетки.
  isClearPath(i1, i2, allIslands) {
    if (i1[0] !== i2[0] && i1[1] !== i2[1]) return false;

    const isSet =
      allIslands instanceof Set ||
      (allIslands && typeof allIslands.has === 'function');

    if (i1[0] === i2[0]) {
      const minC = Math.min(i1[1], i2[1]);
      const maxC = Math.max(i1[1], i2[1]);

      for (let c = minC + 1; c < maxC; c++) {
        if (isSet) {
          if (allIslands.has(this.getKey(i1[0], c))) return false;
        } else if (
          allIslands.some(
            (island) => island[0] === i1[0] && island[1] === c
          )
        ) {
          return false;
        }
      }

      return true;
    }

    const minR = Math.min(i1[0], i2[0]);
    const maxR = Math.max(i1[0], i2[0]);

    for (let r = minR + 1; r < maxR; r++) {
      if (isSet) {
        if (allIslands.has(this.getKey(r, i1[1]))) return false;
      } else if (
        allIslands.some(
          (island) => island[0] === r && island[1] === i1[1]
        )
      ) {
        return false;
      }
    }

    return true;
  },

  // Проверка пересечения нового моста с существующими.
  //
  // Для BridgeStore геометрия уже разобрана и закэширована, поэтому
  // здесь нет повторного split()/map(Number) на каждую проверку.
  hasIntersection(i1, i2, existingBridges) {
    if (
      !existingBridges ||
      typeof existingBridges.keys !== 'function'
    ) {
      return true;
    }

    const newMeta = this.createEdgeMeta(i1, i2);

    // Новый мост обязан быть горизонтальным или вертикальным.
    if (!newMeta) {
      return true;
    }

    if (existingBridges instanceof BridgeStore) {
      return this.hasIntersectionWithEdges(
        newMeta,
        existingBridges.getMetas()
      );
    }

    for (const edgeKey of existingBridges.keys()) {
      const meta = this.createEdgeMetaFromKey(edgeKey);

      // Повреждённая запись моста делает состояние некорректным.
      if (!meta) return true;

      if (this.edgesCross(newMeta, meta)) {
        return true;
      }
    }

    return false;
  },

  createEdgeMetaFromKey(edgeKey) {
    if (typeof edgeKey !== 'string') return null;

    const dash = edgeKey.indexOf('-');

    if (dash <= 0 || dash === edgeKey.length - 1) return null;

    const first = parseBoardKey(edgeKey.slice(0, dash));
    const second = parseBoardKey(edgeKey.slice(dash + 1));

    if (!first || !second) return null;

    return this.createEdgeMeta(
      [first.r, first.c],
      [second.r, second.c]
    );
  }
  };
})();
