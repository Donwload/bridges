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
        this.solutionChecker.countSolutions(2);

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