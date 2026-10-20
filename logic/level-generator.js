/*
 * Генератор нового уровня.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameLogic. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (globalThis.BridgesLogicParts =
    globalThis.BridgesLogicParts || {});

  const { gameNow, MAX_ISLAND_TARGET } =
    globalThis.BridgesLogicCore;

  parts.generator = {
  generateValidLevel(options = {}) {
    const minIslands = options.minIslands ?? 8;
    const maxIslands = options.maxIslands ?? 11;
    const gridSize = options.gridSize ?? this.gridSize;

    // Вероятность моста кратности > 1. Растёт вместе со сложностью.
    const doubleChance = Math.max(
      0,
      Math.min(1, options.doubleChance ?? 0.5)
    );

    const previousGridSize = this.gridSize;

    this.gridSize = gridSize;

    let attempts = 0;

    let rejectedByNoTree = 0;
    let rejectedByTargets = 0;
    let rejectedByParity = 0;
    let rejectedBySolutions = 0;

    while (attempts < 200) {
      attempts++;

      const attemptStart = gameNow();

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

        // Выбираем не случайный, а самый «пустой» вариант.
        //
        // Плотность считается по уже поставленным островам в квадрате
        // 11x11 вокруг кандидата. Кандидаты с минимальной плотностью
        // перемешиваются, поэтому карта не растёт одной прямой веткой,
        // а постепенно заполняет свободные участки поля.
        let bestDensity = Infinity;

        for (const candidate of candidates) {
          const [r, c] = candidate.island;
          let density = 0;

          for (const [pr, pc] of placedIslands) {
            if (
              Math.max(
                Math.abs(pr - r),
                Math.abs(pc - c)
              ) <= 5
            ) {
              density++;
            }
          }

          candidate.density = density;

          if (density < bestDensity) {
            bestDensity = density;
          }
        }

        const pool = candidates.filter(
          (candidate) => candidate.density === bestDensity
        );

        const selected =
          pool[
            Math.floor(
              Math.random() * pool.length
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

      // Геометрия выбранных мостов хранится рядом с Map, чтобы
      // backtracking не разбирал ключи мостов заново на каждой проверке.
      const solutionMetas = [];

      const allKeys = placedIslands.map(
        ([r, c]) => this.getKey(r, c)
      );

      // Координаты островов по ключу: backtracking не разбирает
      // строковые ключи через split() на каждом шаге.
      const coordOf = new Map(
        placedIslands.map(([r, c]) => [
          this.getKey(r, c),
          [r, c]
        ])
      );

      // Set ключей для O(1)-проверки "между островами пусто".
      const islandKeySet = new Set(allKeys);

      const treeStartTime = gameNow();
      let treeNodes = 0;

      const MAX_TREE_TIME = 25;
      const MAX_TREE_NODES = 5000;

      const buildTree = (
        connected,
        remaining,
        bridges,
        bridgeMetas
      ) => {
        treeNodes++;

        // Не позволяем генератору блокировать главный поток.
        if (
          treeNodes > MAX_TREE_NODES ||
          gameNow() - treeStartTime > MAX_TREE_TIME
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
          const i1 = coordOf.get(connKey);

          if (!i1) {
            continue;
          }

          const [cr, cc] = i1;

          for (const unconnKey of remaining) {
            const i2 = coordOf.get(unconnKey);

            if (!i2) {
              continue;
            }

            const [ur, uc] = i2;

            // Только горизонтальное или вертикальное соединение.
            if (cr !== ur && cc !== uc) {
              continue;
            }

            // Между островами не должно быть другого острова.
            if (
              !this.isClearPath(
                i1,
                i2,
                islandKeySet
              )
            ) {
              continue;
            }

            // Новый мост не должен пересекать уже созданные.
            // Геометрия строится один раз и переиспользуется при выборе.
            const meta = this.createEdgeMeta(i1, i2);

            if (
              !meta ||
              this.hasIntersectionWithEdges(
                meta,
                bridgeMetas
              )
            ) {
              continue;
            }

            candidates.push({
              key1: connKey,
              key2: unconnKey,
              i1,
              i2,
              edgeKey: meta.edgeKey,
              meta
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
            gameNow() - treeStartTime > MAX_TREE_TIME
          ) {
            return false;
          }

          const edgeKey =
            candidate.edgeKey;

          const bridgeCount = this.pickBridgeCount(
            MAX_ISLAND_TARGET,
            doubleChance
          );

          bridges.set(
            edgeKey,
            bridgeCount
          );

          bridgeMetas.push(
            candidate.meta
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
              bridges,
              bridgeMetas
            )
          ) {
            return true;
          }

          // Откат.
          bridges.delete(edgeKey);
          bridgeMetas.pop();

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

      const treeStart = gameNow();

      const treeBuilt = buildTree(
        connected,
        remaining,
        solutionBridges,
        solutionMetas
      );

      const treeTime =
        gameNow() - treeStart;

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
        islandTargets.set(this.getKey(r, c), 0);
      }

      // Считаем степени одним проходом по рёбрам, а не перебором
      // "остров × все мосты" с повторным разбором ключей.
      let valid = true;

      for (const meta of solutionMetas) {
        const count =
          solutionBridges.get(meta.edgeKey) || 0;

        islandTargets.set(
          meta.key1,
          islandTargets.get(meta.key1) + count
        );

        islandTargets.set(
          meta.key2,
          islandTargets.get(meta.key2) + count
        );
      }

      // ============================================================
      // Проверяем значения островов.
      // ============================================================

      for (
        const value
        of islandTargets.values()
      ) {
        if (
          value === 0 ||
          value > MAX_ISLAND_TARGET
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

      const solverStart = gameNow();

      // Проверяем снимок карты, не подменяя состояние игры.
      // Это убирает восстановление this.islands/this.bridges и
      // сопутствующие повторные пересчёты.
      const solutionCount =
        this.solutionChecker.countSolutionsForIslands(
          islandTargets,
          2
        );

      const solverTime =
        gameNow() - solverStart;

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

      this.ensureBridgeStore().clear();

      console.log(
        '[Generator] success',
        {
          attempts,
          attemptTime: Math.round(
            gameNow() - attemptStart
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

    // Старую карту не трогаем и возвращаем прежний размер поля,
    // чтобы состояние логики и отрисовки не расходилось.
    this.gridSize = previousGridSize;

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
  };
})();
