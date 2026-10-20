/*
 * Игровое поле: мосты, связность и проверка победы.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameLogic. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (globalThis.BridgesLogicParts =
    globalThis.BridgesLogicParts || {});

  const { parseBoardKey, MAX_ISLAND_TARGET } =
    globalThis.BridgesLogicCore;

  parts.board = {
  getIslandAtPos(x, y, cellSize, offset) {
    for (const [key] of this.islands.entries()) {
      const [r, c] = key.split(',').map(Number);
      const cx = c * cellSize + offset;
      const cy = r * cellSize + offset;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= 28 ** 2) return [r, c];
    }
    return null;
  },

  areIslandsNeighbors(i1, i2) {
    if (
      !Array.isArray(i1) ||
      !Array.isArray(i2) ||
      i1.length < 2 ||
      i2.length < 2
    ) {
      return false;
    }

    if (
      !Number.isInteger(i1[0]) ||
      !Number.isInteger(i1[1]) ||
      !Number.isInteger(i2[0]) ||
      !Number.isInteger(i2[1])
    ) {
      return false;
    }

    const key1 = this.getKey(i1[0], i1[1]);
    const key2 = this.getKey(i2[0], i2[1]);

    // Сам с собой остров соседним мостом не считается.
    if (key1 === key2) return false;

    // Оба конца должны реально существовать.
    if (
      !this.islands.has(key1) ||
      !this.islands.has(key2)
    ) {
      return false;
    }

    if (i1[0] !== i2[0] && i1[1] !== i2[1]) return false;
    if (i1[0] === i2[0]) {
      const minC = Math.min(i1[1], i2[1]), maxC = Math.max(i1[1], i2[1]);
      for (let c = minC + 1; c < maxC; c++) {
        if (this.islands.has(this.getKey(i1[0], c))) return false;
      }
      return true;
    } else {
      const minR = Math.min(i1[0], i2[0]), maxR = Math.max(i1[0], i2[0]);
      for (let r = minR + 1; r < maxR; r++) {
        if (this.islands.has(this.getKey(r, i1[1]))) return false;
      }
      return true;
    }
  },

  checkIntersections(i1, i2) {
    return this.hasIntersection(i1, i2, this.bridges);
  },

  addBridge(i1, i2) {
    // Проверяем входные данные.
    if (
      !Array.isArray(i1) ||
      !Array.isArray(i2) ||
      i1.length < 2 ||
      i2.length < 2
    ) {
      return false;
    }

    const [r1, c1] = i1;
    const [r2, c2] = i2;

    // Координаты должны быть целыми и находиться внутри поля.
    if (
      !Number.isInteger(r1) ||
      !Number.isInteger(c1) ||
      !Number.isInteger(r2) ||
      !Number.isInteger(c2) ||
      r1 < 0 ||
      c1 < 0 ||
      r2 < 0 ||
      c2 < 0 ||
      r1 >= this.gridSize ||
      r2 >= this.gridSize ||
      c1 >= this.gridSize ||
      c2 >= this.gridSize
    ) {
      return false;
    }

    // Нельзя соединить остров с самим собой.
    if (r1 === r2 && c1 === c2) {
      return false;
    }

    const key1 = this.getKey(r1, c1);
    const key2 = this.getKey(r2, c2);

    // Оба конца должны быть реальными островами.
    if (
      !this.islands.has(key1) ||
      !this.islands.has(key2)
    ) {
      return false;
    }

    // Между островами должна существовать прямая линия
    // без других островов.
    if (!this.areIslandsNeighbors(i1, i2)) {
      return false;
    }

    const store = this.ensureBridgeStore();
    const edgeKey = this.getEdgeKey(i1, i2);
    const current = store.get(edgeKey) || 0;

    // Клик по уже максимальной связи удаляет её. Иначе кратность
    // увеличивается на единицу: 0 -> 1 -> 2 -> 0.
    if (current >= this.maxBridgeCount) {
      store.delete(edgeKey);
      return true;
    }

    // Проверяем пересечения при создании и изменении моста.
    if (this.checkIntersections(i1, i2)) {
      return false;
    }

    store.set(edgeKey, current + 1);
    return true;
  },

  removeBridge(i1, i2 = null) {
    // Старый вызов removeBridge(island) больше не должен
    // случайно удалять первый попавшийся мост.
    //
    // Если второй остров не указан, ничего не удаляем.
    // Это делает операцию удаления однозначной.

    if (
      !Array.isArray(i1) ||
      i1.length < 2
    ) {
      return false;
    }

    if (
      !Array.isArray(i2) ||
      i2.length < 2
    ) {
      return false;
    }

    const store = this.ensureBridgeStore();
    const edgeKey = this.getEdgeKey(i1, i2);

    if (!store.has(edgeKey)) {
      return false;
    }

    store.delete(edgeKey);
    return true;
  },

  reset() {
    this.ensureBridgeStore().clear();
  },

  getIslandBridgesCount(island) {
    if (!Array.isArray(island) || island.length < 2) {
      return 0;
    }

    const key = this.getKey(island[0], island[1]);

    // Готовый индекс: без перебора всех мостов и разбора ключей.
    return this.ensureBridgeStore().getTotal(key);
  },

  isConnected() {
    // Пустая карта не может считаться связной.
    if (this.islands.size === 0) return false;

    const store = this.ensureBridgeStore();

    // В корректной головоломке каждый мост соединяет
    // два существующих острова.
    const adjacency = new Map();

    for (const key of this.islands.keys()) {
      adjacency.set(key, []);
    }

    for (const meta of store.getMetas()) {
      if (meta.invalid) return false;

      const count = store.get(meta.edgeKey);

      if (
        !Number.isInteger(count) ||
        count < 1 ||
        count > this.maxBridgeCount
      ) {
        return false;
      }

      if (
        meta.key1 === meta.key2 ||
        !this.islands.has(meta.key1) ||
        !this.islands.has(meta.key2)
      ) {
        return false;
      }

      adjacency.get(meta.key1).push(meta.key2);
      adjacency.get(meta.key2).push(meta.key1);
    }

    // Обходим граф мостов от первого острова.
    const start = this.islands.keys().next().value;
    const visited = new Set([start]);
    const queue = [start];

    let index = 0;

    while (index < queue.length) {
      const current = queue[index++];

      for (const neighbor of adjacency.get(current)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    return visited.size === this.islands.size;
  },

  checkVictory() {
    // Нельзя выиграть на пустом поле.
    if (this.islands.size === 0) return false;

    const store = this.ensureBridgeStore();
    const metas = store.getMetas();

    // У каждого острова должна быть корректная цель.
    for (const [key, target] of this.islands.entries()) {
      if (
        !Number.isInteger(target) ||
        target < 1 ||
        target > MAX_ISLAND_TARGET
      ) {
        return false;
      }

      // Ключ острова должен содержать две координаты.
      const point = parseBoardKey(key);

      if (
        !point ||
        point.r < 0 ||
        point.c < 0 ||
        point.r >= this.gridSize ||
        point.c >= this.gridSize
      ) {
        return false;
      }

      // Фактическое число мостов берётся из индекса за O(1).
      if (store.getTotal(key) !== target) {
        return false;
      }
    }

    // Проверяем геометрию всех существующих мостов.
    for (const meta of metas) {
      if (meta.invalid) return false;

      const count = store.get(meta.edgeKey);

      if (
        !this.islands.has(meta.key1) ||
        !this.islands.has(meta.key2) ||
        !this.areIslandsNeighbors(
          [meta.r1, meta.c1],
          [meta.r2, meta.c2]
        ) ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > this.maxBridgeCount
      ) {
        return false;
      }

      // Пересекающиеся мосты не могут быть частью решения.
      if (this.hasIntersectionWithEdges(meta, metas)) {
        return false;
      }
    }

    // Все острова должны быть связаны.
    return this.isConnected();
  }
  };
})();
