class BridgesGameLogic {
  constructor(gridSize = 7) {
    this.gridSize = gridSize;
    this.islands = new Map();
    this.bridges = new Map();
    this.directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  }

  getKey(r, c) { return `${r},${c}`; }

  getEdgeKey(i1, i2) {
    const k1 = this.getKey(i1[0], i1[1]);
    const k2 = this.getKey(i2[0], i2[1]);
    return k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
  }

  // Проверка, что между двумя островами нет других островов
  isClearPath(i1, i2, allIslands) {
    if (i1[0] !== i2[0] && i1[1] !== i2[1]) return false;

    if (i1[0] === i2[0]) {
      const minC = Math.min(i1[1], i2[1]);
      const maxC = Math.max(i1[1], i2[1]);
      for (let c = minC + 1; c < maxC; c++) {
        if (allIslands.some(i => i[0] === i1[0] && i[1] === c)) return false;
      }
      return true;
    } else {
      const minR = Math.min(i1[0], i2[0]);
      const maxR = Math.max(i1[0], i2[0]);
      for (let r = minR + 1; r < maxR; r++) {
        if (allIslands.some(i => i[0] === r && i[1] === i1[1])) return false;
      }
      return true;
    }
  }

  // Проверка пересечения нового моста с существующими
  hasIntersection(i1, i2, existingBridges) {
    if (
      !Array.isArray(i1) ||
      !Array.isArray(i2) ||
      !existingBridges ||
      typeof existingBridges.keys !== 'function'
    ) {
      return true;
    }

    // Новый мост обязан быть горизонтальным или вертикальным.
    if (i1[0] !== i2[0] && i1[1] !== i2[1]) {
      return true;
    }

    const newIsVertical = i1[1] === i2[1];

    const newMinR = Math.min(i1[0], i2[0]);
    const newMaxR = Math.max(i1[0], i2[0]);

    const newMinC = Math.min(i1[1], i2[1]);
    const newMaxC = Math.max(i1[1], i2[1]);

    const newKey1 = this.getKey(i1[0], i1[1]);
    const newKey2 = this.getKey(i2[0], i2[1]);

    for (const edgeKey of existingBridges.keys()) {
      const parts = edgeKey.split('-');

      if (parts.length !== 2) {
        return true;
      }

      const [k1, k2] = parts;

      // Мосты с общим островом не считаются пересечением.
      if (
        k1 === newKey1 ||
        k1 === newKey2 ||
        k2 === newKey1 ||
        k2 === newKey2
      ) {
        continue;
      }

      const [r1, c1] = k1.split(',').map(Number);
      const [r2, c2] = k2.split(',').map(Number);

      // Повреждённая запись моста делает состояние некорректным.
      if (
        !Number.isInteger(r1) ||
        !Number.isInteger(c1) ||
        !Number.isInteger(r2) ||
        !Number.isInteger(c2)
      ) {
        return true;
      }

      // Существующий мост также обязан быть прямым.
      if (r1 !== r2 && c1 !== c2) {
        return true;
      }

      const existingIsVertical = c1 === c2;

      // Параллельные мосты не пересекаются.
      if (newIsVertical === existingIsVertical) {
        continue;
      }

      // Определяем вертикальный и горизонтальный отрезки.
      const verticalR1 = newIsVertical
        ? newMinR
        : Math.min(r1, r2);

      const verticalR2 = newIsVertical
        ? newMaxR
        : Math.max(r1, r2);

      const verticalC = newIsVertical
        ? i1[1]
        : c1;

      const horizontalR = newIsVertical
        ? r1
        : i1[0];

      const horizontalC1 = newIsVertical
        ? Math.min(c1, c2)
        : newMinC;

      const horizontalC2 = newIsVertical
        ? Math.max(c1, c2)
        : newMaxC;

      // Строгие < исключают пересечение в конечной точке:
      // общий остров — допустим, настоящий крест — запрещён.
      const crosses =
        verticalR1 < horizontalR &&
        horizontalR < verticalR2 &&
        horizontalC1 < verticalC &&
        verticalC < horizontalC2;

      if (crosses) {
        return true;
      }
    }

    return false;
  }

  generateValidLevel() {
    let attempts = 0;

    while (attempts < 200) {
      attempts++;
      const islandCount = Math.floor(Math.random() * 4) + 8;
      const placedIslands = [];

      // Первый остров в центре
      const startR = Math.floor(this.gridSize / 2);
      const startC = Math.floor(this.gridSize / 2);
      placedIslands.push([startR, startC]);

      // Размещаем остальные острова
      let placeAttempts = 0;
      while (placedIslands.length < islandCount && placeAttempts < 500) {
        placeAttempts++;

        const r = Math.floor(Math.random() * this.gridSize);
        const c = Math.floor(Math.random() * this.gridSize);

        let tooClose = false;
        for (const [pr, pc] of placedIslands) {
          const dist = Math.abs(pr - r) + Math.abs(pc - c);
          if (dist < 2) {
            tooClose = true;
            break;
          }
        }

        if (!tooClose && !placedIslands.some(i => i[0] === r && i[1] === c)) {
          placedIslands.push([r, c]);
        }
      }

      if (placedIslands.length < 6) continue;

      // Создаем связное дерево мостов
      const solutionBridges = new Map();
      const connected = new Set([this.getKey(placedIslands[0][0], placedIslands[0][1])]);
      const unconnected = new Set(placedIslands.slice(1).map(i => this.getKey(i[0], i[1])));

      // Алгоритм Прима для создания связного дерева
      while (unconnected.size > 0) {
        let bestConnection = null;
        let bestDistance = Infinity;
        const candidates = [];

        for (const connKey of connected) {
          const [cr, cc] = connKey.split(',').map(Number);

          for (const unconnKey of unconnected) {
            const [ur, uc] = unconnKey.split(',').map(Number);

            if (cr === ur || cc === uc) {
              const dist = Math.abs(cr - ur) + Math.abs(cc - uc);

              if (dist >= 2) {
                const i1 = [cr, cc];
                const i2 = [ur, uc];

                if (this.isClearPath(i1, i2, placedIslands)) {
                  if (!this.hasIntersection(i1, i2, solutionBridges)) {
                    candidates.push({
                      key1: connKey,
                      key2: unconnKey,
                      distance: dist
                    });
                  }
                }
              }
            }
          }
        }

        if (candidates.length === 0) break;

        // Выбираем случайный кандидат из лучших (с минимальным расстоянием)
        candidates.sort((a, b) => a.distance - b.distance);
        const bestDist = candidates[0].distance;
        const bestCandidates = candidates.filter(c => c.distance === bestDist);
        const selected = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

        const bridgeCount = Math.random() < 0.5 ? 1 : 2;
        const edgeKey = `${selected.key1}-${selected.key2}`;
        solutionBridges.set(edgeKey, bridgeCount);

        connected.add(selected.key2);
        unconnected.delete(selected.key2);
      }

      // Если не все острова связаны, начинаем заново
      if (unconnected.size > 0) continue;

      // Вычисляем значения островов на основе построенных мостов
      const islandTargets = new Map();
      for (const [r, c] of placedIslands) {
        const key = this.getKey(r, c);
        let totalBridges = 0;

        for (const [edge, count] of solutionBridges.entries()) {
          const [k1, k2] = edge.split('-');
          if (k1 === key || k2 === key) {
            totalBridges += count;
          }
        }

        islandTargets.set(key, totalBridges);
      }

      // Проверяем, что все острова имеют хотя бы 1 мост
      let valid = true;
      for (const val of islandTargets.values()) {
        if (val === 0 || val > 8) {
          valid = false;
          break;
        }
      }

      if (!valid) continue;

      // Проверяем четность суммы
      let totalSum = 0;
      for (const val of islandTargets.values()) totalSum += val;
      if (totalSum % 2 !== 0) continue;

      // Commit the new level only after a complete valid candidate is found.
      this.islands = islandTargets;
      this.bridges.clear();
      return true;
    }

    return false;
  }

  getIslandAtPos(x, y, cellSize, offset) {
    for (const [key] of this.islands.entries()) {
      const [r, c] = key.split(',').map(Number);
      const cx = c * cellSize + offset;
      const cy = r * cellSize + offset;
      if ((x - cx) ** 2 + (y - cy) ** 2 <= 28 ** 2) return [r, c];
    }
    return null;
  }

  areIslandsNeighbors(i1, i2) {
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
  }

  checkIntersections(i1, i2) {
    return this.hasIntersection(i1, i2, this.bridges);
  }

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

    const edgeKey = this.getEdgeKey(i1, i2);
    const current = this.bridges.get(edgeKey) || 0;

    // Третий клик удаляет существующие два моста.
    if (current === 2) {
      this.bridges.delete(edgeKey);
      return true;
    }

    // Проверяем пересечения только при создании моста.
    if (this.checkIntersections(i1, i2)) {
      return false;
    }

    // Первый клик — один мост.
    if (current === 0) {
      this.bridges.set(edgeKey, 1);
      return true;
    }

    // Второй клик — два моста.
    if (current === 1) {
      this.bridges.set(edgeKey, 2);
      return true;
    }

    return false;
  }


  findBridgeForIslands(i1, i2) {
    if (
      !Array.isArray(i1) ||
      !Array.isArray(i2)
    ) {
      return null;
    }

    const edgeKey = this.getEdgeKey(i1, i2);

    return this.bridges.has(edgeKey)
      ? edgeKey
      : null;
  }

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

    const edgeKey = this.getEdgeKey(i1, i2);

    if (!this.bridges.has(edgeKey)) {
      return false;
    }

    this.bridges.delete(edgeKey);
    return true;
  }

  reset() { 
    this.bridges.clear(); 
  }

  getIslandBridgesCount(island) {
    let count = 0;
    const key = this.getKey(island[0], island[1]);
    for (const [edgeKey, val] of this.bridges.entries()) {
      const [k1, k2] = edgeKey.split('-');
      if (k1 === key || k2 === key) count += val;
    }
    return count;
  }

  isConnected() {
    // Пустая карта не может считаться связной.
    if (this.islands.size === 0) return false;

    // В корректной головоломке каждый мост соединяет
    // два существующих острова.
    const adjacency = new Map();

    for (const key of this.islands.keys()) {
      adjacency.set(key, []);
    }

    for (const [edgeKey, count] of this.bridges.entries()) {
      if (!Number.isInteger(count) || count < 1 || count > 2) {
        return false;
      }

      const parts = edgeKey.split('-');
      if (parts.length !== 2) return false;

      const [k1, k2] = parts;

      if (
        k1 === k2 ||
        !this.islands.has(k1) ||
        !this.islands.has(k2)
      ) {
        return false;
      }

      adjacency.get(k1).push(k2);
      adjacency.get(k2).push(k1);
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
  }

  checkVictory() {
    // Нельзя выиграть на пустом поле.
    if (this.islands.size === 0) return false;

    // У каждого острова должна быть корректная цель.
    for (const [key, target] of this.islands.entries()) {
      if (
        !Number.isInteger(target) ||
        target < 1 ||
        target > 8
      ) {
        return false;
      }

      // Ключ острова должен содержать две координаты.
      const parts = key.split(',');
      if (parts.length !== 2) return false;

      const [r, c] = parts.map(Number);

      if (
        !Number.isInteger(r) ||
        !Number.isInteger(c) ||
        r < 0 ||
        c < 0 ||
        r >= this.gridSize ||
        c >= this.gridSize
      ) {
        return false;
      }

      // Фактическое число мостов должно совпадать с целью.
      if (this.getIslandBridgesCount([r, c]) !== target) {
        return false;
      }
    }

    // Проверяем геометрию всех существующих мостов.
    for (const [edgeKey, count] of this.bridges.entries()) {
      const parts = edgeKey.split('-');
      if (parts.length !== 2) return false;

      const [k1, k2] = parts;

      if (!this.islands.has(k1) || !this.islands.has(k2)) {
        return false;
      }

      const i1 = k1.split(',').map(Number);
      const i2 = k2.split(',').map(Number);

      if (
        i1.length !== 2 ||
        i2.length !== 2 ||
        !i1.every(Number.isInteger) ||
        !i2.every(Number.isInteger) ||
        !this.areIslandsNeighbors(i1, i2) ||
        !Number.isInteger(count) ||
        count < 1 ||
        count > 2
      ) {
        return false;
      }
    }

    // Все острова должны быть связаны.
    return this.isConnected();
  }
}