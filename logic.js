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
    const newIsVert = (i1[1] === i2[1]);
    const minR = Math.min(i1[0], i2[0]);
    const maxR = Math.max(i1[0], i2[0]);
    const minC = Math.min(i1[1], i2[1]);
    const maxC = Math.max(i1[1], i2[1]);

    for (const edgeKey of existingBridges.keys()) {
      const [k1, k2] = edgeKey.split('-');
      const [r1, c1] = k1.split(',').map(Number);
      const [r2, c2] = k2.split(',').map(Number);

      const ik1 = this.getKey(i1[0], i1[1]);
      const ik2 = this.getKey(i2[0], i2[1]);

      if (k1 === ik1 || k1 === ik2 || k2 === ik1 || k2 === ik2) continue;

      const existIsVert = (c1 === c2);

      if (newIsVert && !existIsVert) {
        if (minR < r1 && r1 < maxR && Math.min(c1, c2) < i1[1] && i1[1] < Math.max(c1, c2)) {
          return true;
        }
      } else if (!newIsVert && existIsVert) {
        if (Math.min(r1, r2) < i1[0] && i1[0] < Math.max(r1, r2) && minC < c1 && c1 < maxC) {
          return true;
        }
      }
    }
    return false;
  }

  generateValidLevel() {
    let attempts = 0;

    while (attempts < 200) {
      attempts++;
      this.islands.clear();
      this.bridges.clear();

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

      this.islands = islandTargets;
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
    const newIsVert = (i1[1] === i2[1]);
    const minR = Math.min(i1[0], i2[0]), maxR = Math.max(i1[0], i2[0]);
    const minC = Math.min(i1[1], i2[1]), maxC = Math.max(i1[1], i2[1]);

    for (const edgeKey of this.bridges.keys()) {
      const [k1, k2] = edgeKey.split('-');
      const [r1, c1] = k1.split(',').map(Number);
      const [r2, c2] = k2.split(',').map(Number);

      const ik1 = this.getKey(i1[0], i1[1]);
      const ik2 = this.getKey(i2[0], i2[1]);
      if (k1 === ik1 || k1 === ik2 || k2 === ik1 || k2 === ik2) continue;

      const existIsVert = (c1 === c2);
      if (newIsVert && !existIsVert) {
        if (minR < r1 && r1 < maxR && Math.min(c1, c2) < i1[1] && i1[1] < Math.max(c1, c2)) return true;
      } else if (!newIsVert && existIsVert) {
        if (Math.min(r1, r2) < i1[0] && i1[0] < Math.max(r1, r2) && minC < c1 && c1 < maxC) return true;
      }
    }
    return false;
  }

  addBridge(i1, i2) {
    if (!this.areIslandsNeighbors(i1, i2)) return false;
    if (this.checkIntersections(i1, i2)) return false;

    const edgeKey = this.getEdgeKey(i1, i2);
    const current = this.bridges.get(edgeKey) || 0;

    if (current === 0) this.bridges.set(edgeKey, 1);
    else if (current === 1) this.bridges.set(edgeKey, 2);
    else this.bridges.delete(edgeKey);

    return true;
  }

  removeBridge(island) {
    for (const edgeKey of this.bridges.keys()) {
      const [k1, k2] = edgeKey.split('-');
      if (k1 === this.getKey(island[0], island[1]) || k2 === this.getKey(island[0], island[1])) {
        this.bridges.delete(edgeKey);
        return true;
      }
    }
    return false;
  }

  reset() { this.bridges.clear(); }

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
    if (this.bridges.size === 0) return false;
    const allIslands = Array.from(this.islands.keys());
    const visited = new Set([allIslands[0]]);
    const queue = [allIslands[0]];

    while (queue.length > 0) {
      const curr = queue.shift();
      for (const edgeKey of this.bridges.keys()) {
        const [k1, k2] = edgeKey.split('-');
        if (curr === k1 && !visited.has(k2)) { visited.add(k2); queue.push(k2); }
        else if (curr === k2 && !visited.has(k1)) { visited.add(k1); queue.push(k1); }
      }
    }
    return visited.size === allIslands.length;
  }

  checkVictory() {
    for (const [key, target] of this.islands.entries()) {
      const [r, c] = key.split(',').map(Number);
      if (this.getIslandBridgesCount([r, c]) !== target) return false;
    }
    return this.isConnected();
  }
}