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

  countSolutions(maxSolutions = 2) {
    if (
      !Number.isInteger(maxSolutions) ||
      maxSolutions < 1 ||
      this.islands.size === 0
    ) {
      return 0;
    }

    const islandKeys = [...this.islands.keys()];
    const edges = [];

    // Создаём все возможные мосты между соседними островами.
    for (let i = 0; i < islandKeys.length; i++) {
      const [r1, c1] = islandKeys[i].split(',').map(Number);

      for (let j = i + 1; j < islandKeys.length; j++) {
        const [r2, c2] = islandKeys[j].split(',').map(Number);

        const i1 = [r1, c1];
        const i2 = [r2, c2];

        if (!this.areIslandsNeighbors(i1, i2)) {
          continue;
        }

        edges.push({
          i1,
          i2,
          key: this.getEdgeKey(i1, i2),
          k1: islandKeys[i],
          k2: islandKeys[j]
        });
      }
    }

    // Слишком мало возможных рёбер — решения быть не может.
    if (edges.length === 0 && islandKeys.length > 1) {
      return 0;
    }

    const degree = new Map();

    for (const key of islandKeys) {
      degree.set(key, 0);
    }

    const solutionBridges = new Map();

    let solutions = 0;

    const search = (index) => {
      if (solutions >= maxSolutions) {
        return;
      }

      // Все рёбра обработаны.
      if (index === edges.length) {
        // Проверяем точное совпадение всех чисел.
        for (const key of islandKeys) {
          if (degree.get(key) !== this.islands.get(key)) {
            return;
          }
        }

        // Решение должно быть связным.
        if (!this.isSolutionConnected(solutionBridges, islandKeys)) {
          return;
        }

        solutions++;
        return;
      }

      const edge = edges[index];

      const target1 = this.islands.get(edge.k1);
      const target2 = this.islands.get(edge.k2);

      const current1 = degree.get(edge.k1);
      const current2 = degree.get(edge.k2);

      /*
      * Пробуем:
      * 0 мостов
      * 1 мост
      * 2 моста
      */

      for (let count = 0; count <= 2; count++) {
        const next1 = current1 + count;
        const next2 = current2 + count;

        // Нельзя превысить число на острове.
        if (next1 > target1 || next2 > target2) {
          continue;
        }

        // Если ставим мост, проверяем пересечения.
        if (
          count > 0 &&
          this.hasIntersection(
            edge.i1,
            edge.i2,
            solutionBridges
          )
        ) {
          continue;
        }

        if (count > 0) {
          solutionBridges.set(edge.key, count);
        }

        degree.set(edge.k1, next1);
        degree.set(edge.k2, next2);

        /*
        * Простая дополнительная отсечка:
        * у острова должно оставаться достаточно потенциальных
        * мостов, чтобы достичь его цели.
        */
        let possible = true;

        // Базовая проверка достаточности оставшихся рёбер.
        const remainingCapacity = new Map();

        for (const key of islandKeys) {
          remainingCapacity.set(key, 0);
        }

        for (let k = index + 1; k < edges.length; k++) {
          const future = edges[k];

          remainingCapacity.set(
            future.k1,
            remainingCapacity.get(future.k1) + 2
          );

          remainingCapacity.set(
            future.k2,
            remainingCapacity.get(future.k2) + 2
          );
        }

        for (const key of islandKeys) {
          const current = degree.get(key);
          const target = this.islands.get(key);
          const remaining = target - current;

          if (
            remaining < 0 ||
            remaining > remainingCapacity.get(key)
          ) {
            possible = false;
            break;
          }
        }

        if (possible) {
          search(index + 1);
        }

        degree.set(edge.k1, current1);
        degree.set(edge.k2, current2);

        if (count > 0) {
          solutionBridges.delete(edge.key);
        }

        if (solutions >= maxSolutions) {
          return;
        }
      }
    };

    search(0);

    return solutions;
  }

  isSolutionConnected(solutionBridges, islandKeys) {
    if (islandKeys.length === 0) {
      return false;
    }

    const adjacency = new Map();

    for (const key of islandKeys) {
      adjacency.set(key, []);
    }

    for (const [edgeKey, count] of solutionBridges.entries()) {
      if (
        !Number.isInteger(count) ||
        count < 1 ||
        count > 2
      ) {
        return false;
      }

      const parts = edgeKey.split('-');

      if (parts.length !== 2) {
        return false;
      }

      const [k1, k2] = parts;

      if (
        !adjacency.has(k1) ||
        !adjacency.has(k2)
      ) {
        return false;
      }

      adjacency.get(k1).push(k2);
      adjacency.get(k2).push(k1);
    }

    const start = islandKeys[0];
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

    return visited.size === islandKeys.length;
  }

  generateValidLevel(options = {}) {
    const minIslands = options.minIslands ?? 8;
    const maxIslands = options.maxIslands ?? 11;
    const gridSize = options.gridSize ?? this.gridSize;

    const previousGridSize = this.gridSize;

    this.gridSize = gridSize;

    let attempts = 0;

    let rejectedByNoTree = 0;
    let rejectedByTargets = 0;
    let rejectedByParity = 0;
    let rejectedBySolutions = 0;

    while (attempts < 200) {
      attempts++;

      const attemptStart = performance.now();

      const islandCount = 
        minIslands + 
        Math.floor(Math.random() * (maxIslands - minIslands + 1));
      const placedIslands = [];

      // Первый остров выбираем случайно,
      // но не ставим на самый край поля.
      //
      // Это НЕ центр: старт может быть любым островом
      // внутри поля.
      const startR =
        1 + Math.floor(
          Math.random() * (this.gridSize - 2)
        );

      const startC =
        1 + Math.floor(
          Math.random() * (this.gridSize - 2)
        );

      placedIslands.push([
        startR,
        startC
      ]);

      // Размещаем остальные острова.
      //
      // Вместо случайных попыток генерируем список
      // всех реально возможных новых островов,
      // которые можно напрямую связать с уже существующим.
      while (
        placedIslands.length < islandCount
      ) {
        const candidates = [];

        for (const source of placedIslands) {
          const [sr, sc] = source;

          const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
          ];

          for (const [dr, dc] of directions) {
            // Возможные расстояния от 2 до 5 клеток.
            for (let distance = 2; distance <= 5; distance++) {
              const r =
                sr + dr * distance;

              const c =
                sc + dc * distance;

              // За пределами поля.
              if (
                r < 0 ||
                r >= this.gridSize ||
                c < 0 ||
                c >= this.gridSize
              ) {
                continue;
              }

              // Такая клетка уже занята.
              if (
                placedIslands.some(
                  island =>
                    island[0] === r &&
                    island[1] === c
                )
              ) {
                continue;
              }

              // Не ставим остров слишком близко
              // к любому уже существующему острову.
              let tooClose = false;

              for (const [pr, pc] of placedIslands) {
                const dist =
                  Math.abs(pr - r) +
                  Math.abs(pc - c);

                if (dist < 2) {
                  tooClose = true;
                  break;
                }
              }

              if (tooClose) {
                continue;
              }

              const newIsland = [r, c];

              // Между source и новым островом
              // не должно быть другого острова.
              if (
                !this.isClearPath(
                  source,
                  newIsland,
                  placedIslands
                )
              ) {
                continue;
              }

              candidates.push({
                island: newIsland,
                source
              });
            }
          }
        }

        // Больше ни одного допустимого места.
        if (candidates.length === 0) {
          break;
        }

        // Выбираем случайный допустимый вариант.
        //
        // Поэтому карты не будут расти одинаково,
        // но при этом мы не тратим сотни случайных
        // попыток на заведомо невозможные координаты.
        const selected =
          candidates[
            Math.floor(
              Math.random() * candidates.length
            )
          ];

        placedIslands.push(
          selected.island
        );
      }

            // ============================================================
      // Проверяем, что острова используют игровое поле равномерно.
      // Не позволяем всей карте скучиваться только в одной части.
      // ============================================================

      let minRow = this.gridSize;
      let maxRow = -1;
      let minCol = this.gridSize;
      let maxCol = -1;

      for (const [r, c] of placedIslands) {
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
      }

      // На поле 7x7 допускаем край в пределах 1 клетки.
      // На 8x8 и 9x9 это также сохраняет хороший запас.
      const edgeMargin = 1;

      if (
          minRow > edgeMargin ||
          maxRow < this.gridSize - 1 - edgeMargin ||
          minCol > edgeMargin ||
          maxCol < this.gridSize - 1 - edgeMargin
      ) {
          continue;
      }


      // ============================================================
      // Создаём связное дерево мостов.
      // Используем backtracking, чтобы не попадать
      // в тупик из-за неудачного жадного выбора.
      // ============================================================

      const solutionBridges = new Map();

      const allKeys = placedIslands.map(
        ([r, c]) => this.getKey(r, c)
      );

      const treeStartTime = performance.now();
      let treeNodes = 0;

      const MAX_TREE_TIME = 25;
      const MAX_TREE_NODES = 5000;

      const buildTree = (
        connected,
        remaining,
        bridges
      ) => {
        treeNodes++;

        // Не позволяем генератору блокировать главный поток.
        if (
          treeNodes > MAX_TREE_NODES ||
          performance.now() - treeStartTime > MAX_TREE_TIME
        ) {
          return false;
        }

        // Все острова подключены.
        if (remaining.size === 0) {
          return true;
        }

        const candidates = [];

        // Ищем все возможные соединения:
        // подключённый остров -> ещё не подключённый остров.
        for (const connKey of connected) {
          const [cr, cc] =
            connKey.split(',').map(Number);

          for (const unconnKey of remaining) {
            const [ur, uc] =
              unconnKey.split(',').map(Number);

            // Только горизонтальное или вертикальное соединение.
            if (cr !== ur && cc !== uc) {
              continue;
            }

            const i1 = [cr, cc];
            const i2 = [ur, uc];

            // Между островами не должно быть другого острова.
            if (
              !this.isClearPath(
                i1,
                i2,
                placedIslands
              )
            ) {
              continue;
            }

            // Новый мост не должен пересекать уже созданные.
            if (
              this.hasIntersection(
                i1,
                i2,
                bridges
              )
            ) {
              continue;
            }

            candidates.push({
              key1: connKey,
              key2: unconnKey,
              i1,
              i2
            });
          }
        }

        // Нет возможных соединений.
        if (candidates.length === 0) {
          return false;
        }

        // Перемешиваем кандидатов.
        for (
          let i = candidates.length - 1;
          i > 0;
          i--
        ) {
          const j =
            Math.floor(
              Math.random() * (i + 1)
            );

          [
            candidates[i],
            candidates[j]
          ] = [
            candidates[j],
            candidates[i]
          ];
        }

        // Пробуем варианты.
        for (const candidate of candidates) {
          // Проверяем ограничение ещё и здесь,
          // потому что рекурсия может быть глубокой.
          treeNodes++;

          if (
            treeNodes > MAX_TREE_NODES ||
            performance.now() - treeStartTime > MAX_TREE_TIME
          ) {
            return false;
          }

          const edgeKey =
            this.getEdgeKey(
              candidate.i1,
              candidate.i2
            );

          const bridgeCount =
            Math.random() < 0.5 ? 1 : 2;

          bridges.set(
            edgeKey,
            bridgeCount
          );

          connected.add(
            candidate.key2
          );

          remaining.delete(
            candidate.key2
          );

          if (
            buildTree(
              connected,
              remaining,
              bridges
            )
          ) {
            return true;
          }

          // Откат.
          bridges.delete(edgeKey);

          remaining.add(
            candidate.key2
          );

          connected.delete(
            candidate.key2
          );
        }

        return false;
      };

      const connected = new Set([
        allKeys[0]
      ]);

      const remaining = new Set(
        allKeys.slice(1)
      );

      const treeStart = performance.now();

      const treeBuilt = buildTree(
        connected,
        remaining,
        solutionBridges
      );

      const treeTime =
        performance.now() - treeStart;

      if (treeTime > 25) {
        console.log(
          '[Generator] slow tree builder',
          {
            treeTime: Math.round(treeTime),
            treeBuilt,
            attempts
          }
        );
      }


      if (!treeBuilt) {
        rejectedByNoTree++;
        continue;
      }

      // ============================================================
      // Вычисляем количество мостов для каждого острова.
      // ============================================================

      const islandTargets = new Map();

      for (const [r, c] of placedIslands) {
        const key = this.getKey(r, c);
        let totalBridges = 0;

        for (
          const [edge, count]
          of solutionBridges.entries()
        ) {
          const [k1, k2] =
            edge.split('-');

          if (
            k1 === key ||
            k2 === key
          ) {
            totalBridges += count;
          }
        }

        islandTargets.set(
          key,
          totalBridges
        );
      }

      // ============================================================
      // Проверяем значения островов.
      // ============================================================

      let valid = true;

      for (
        const value
        of islandTargets.values()
      ) {
        if (
          value === 0 ||
          value > 8
        ) {
          valid = false;
          break;
        }
      }

      if (!valid) {
        rejectedByTargets++;
        continue;
      }

      // ============================================================
      // Проверяем чётность суммы.
      // ============================================================

      let totalSum = 0;

      for (
        const value
        of islandTargets.values()
      ) {
        totalSum += value;
      }

      if (totalSum % 2 !== 0) {
        rejectedByParity++;
        continue;
      }

      // ============================================================
      // Проверяем уникальность решения.
      // ============================================================

      const previousIslands =
        this.islands;

      const previousBridges =
        this.bridges;

      // Временно устанавливаем
      // сгенерированную карту.
      this.islands =
        islandTargets;

      this.bridges =
        new Map();

      const solverStart = performance.now();

      const solutionCount =
        this.countSolutions(2);

      const solverTime =
        performance.now() - solverStart;

      if (solverTime > 25) {
        console.log(
          '[Generator] slow solver',
          {
            solverTime: Math.round(solverTime),
            solutionCount,
            attempts
          }
        );
      }

      // Возвращаем состояние,
      // которое было до проверки.
      this.islands =
        previousIslands;

      this.bridges =
        previousBridges;

      // Нужна ровно одна разгадка.
      if (solutionCount !== 1) {
        rejectedBySolutions++;
        continue;
      }

      // ============================================================
      // Уровень успешно создан.
      // ============================================================

      this.islands =
        islandTargets;

      this.bridges.clear();

      console.log(
        '[Generator] success',
        {
          attempts,
          attemptTime: Math.round( 
            performance.now() - attemptStart 
          ),
          rejectedByNoTree,
          rejectedByTargets,
          rejectedByParity,
          rejectedBySolutions
        }
      );

      return true;
    }

    // ==============================================================
    // Не удалось создать уровень за 200 попыток.
    // Старый уровень при этом не трогаем.
    // ==============================================================

    console.warn(
      '[Generator] failed',
      {
        attempts,
        rejectedByNoTree,
        rejectedByTargets,
        rejectedByParity,
        rejectedBySolutions
      }
    );

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
      // Пересекающиеся мосты не могут быть частью решения.
      if (this.hasIntersection(i1, i2, this.bridges)) {
        return false;
      }
    }

    // Все острова должны быть связаны.
    return this.isConnected();
  }
}