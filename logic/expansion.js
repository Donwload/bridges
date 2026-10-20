/*
 * Расширение карты после победы.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameLogic. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (globalThis.BridgesLogicParts =
    globalThis.BridgesLogicParts || {});

  const { gameNow, parseBoardKey, MAX_ISLAND_TARGET, BridgeStore } =
    globalThis.BridgesLogicCore;

  parts.expansion = {
  /**
   * Бесконечное расширение карты.
   *
   * Старая карта сдвигается в центр увеличенного поля, а новые острова
   * ставятся не «цепочкой наружу», а в самые свободные клетки всего поля.
   * Каждый новый остров получает уникальные строку и столбец и ровно
   * одного видимого соседа. Поэтому он является листом: его единственное
   * ребро вынуждено, а число равно кратности этого ребра.
   *
   * После вычитания вынужденных мостов новых листьев остаётся решение
   * старой карты, а она по инварианту единственна. Солвер нужен только
   * как страховка на случай неожиданного состояния.
   */
  expandLevel(options = {}) {
    if (this.islands.size === 0 || this.bridges.size === 0) {
      return false;
    }

    const requestedGrowth = Math.max(2, options.growth ?? 2);
    const growth =
      requestedGrowth % 2 === 0
        ? requestedGrowth
        : requestedGrowth + 1;
    const shift = Math.floor(growth / 2);
    const addIslands = Math.max(1, options.addIslands ?? 2);
    const maxAttempts = options.maxAttempts ?? 40;
    const solverBudgetMs = options.solverBudgetMs ?? 1500;
    const bridgeLimit = this.maxBridgeCount;

    // Вероятность выбрать для нового «листа» кратность больше 1.
    const multiChance = Math.max(
      0,
      Math.min(1, options.doubleChance ?? 0.5)
    );

    const oldGrid = this.gridSize;
    const newGrid = oldGrid + growth;

    const shiftKey = (key) => {
      const [r, c] = key.split(',').map(Number);
      return this.getKey(r + shift, c + shift);
    };

    // Мосты на момент победы и есть решение текущей карты.
    const baseBridges = new Map();

    for (const meta of this.getBridgeMetas()) {
      if (meta.invalid) return false;

      const r1 = meta.r1 + shift;
      const c1 = meta.c1 + shift;
      const r2 = meta.r2 + shift;
      const c2 = meta.c2 + shift;

      baseBridges.set(
        this.getEdgeKey([r1, c1], [r2, c2]),
        this.bridges.get(meta.edgeKey)
      );
    }

    // Числа старых островов = количество мостов в этом решении.
    const baseIslands = new Map();

    for (const key of this.islands.keys()) {
      baseIslands.set(shiftKey(key), 0);
    }

    for (const [edgeKey, count] of baseBridges) {
      const meta = this.createEdgeMetaFromKey(edgeKey);

      if (!meta) return false;

      baseIslands.set(meta.key1, baseIslands.get(meta.key1) + count);
      baseIslands.set(meta.key2, baseIslands.get(meta.key2) + count);
    }

    // Клетки внутри уже существующих мостов. Новый остров не должен
    // разрывать мост, который является частью старого решения.
    const collectBlockedCells = (bridges) => {
      const blocked = new Set();

      for (const edgeKey of bridges.keys()) {
        const meta = this.createEdgeMetaFromKey(edgeKey);

        if (!meta) continue;

        if (meta.vertical) {
          for (let r = meta.minR + 1; r < meta.maxR; r++) {
            blocked.add(this.getKey(r, meta.col));
          }
        } else {
          for (let c = meta.minC + 1; c < meta.maxC; c++) {
            blocked.add(this.getKey(meta.row, c));
          }
        }
      }

      return blocked;
    };

    // Индекс видимых соседей: для клетки достаточно ближайшего острова
    // слева/справа в её строке и сверху/снизу в её столбце. Дальше
    // начинается препятствие, поэтому максимум видимых соседей — 4.
    const buildLineIndex = (cells) => {
      const rows = new Map();
      const columns = new Map();

      for (const [r, c] of cells) {
        if (!rows.has(r)) rows.set(r, []);
        if (!columns.has(c)) columns.set(c, []);

        rows.get(r).push([r, c]);
        columns.get(c).push([r, c]);
      }

      for (const row of rows.values()) {
        row.sort((a, b) => a[1] - b[1]);
      }

      for (const column of columns.values()) {
        column.sort((a, b) => a[0] - b[0]);
      }

      return { rows, columns };
    };

    const visibleNeighborKeys = (r, c, index) => {
      const visible = [];

      const row = index.rows.get(r);

      if (row) {
        let low = 0;
        let high = row.length;

        while (low < high) {
          const middle = (low + high) >> 1;

          if (row[middle][1] < c) {
            low = middle + 1;
          } else {
            high = middle;
          }
        }

        let right = low;

        if (right < row.length && row[right][1] === c) {
          right++;
        }

        if (right < row.length) {
          visible.push(
            this.getKey(row[right][0], row[right][1])
          );
        }

        if (low > 0) {
          visible.push(
            this.getKey(row[low - 1][0], row[low - 1][1])
          );
        }
      }

      const column = index.columns.get(c);

      if (column) {
        let low = 0;
        let high = column.length;

        while (low < high) {
          const middle = (low + high) >> 1;

          if (column[middle][0] < r) {
            low = middle + 1;
          } else {
            high = middle;
          }
        }

        let down = low;

        if (down < column.length && column[down][0] === r) {
          down++;
        }

        if (down < column.length) {
          visible.push(
            this.getKey(column[down][0], column[down][1])
          );
        }

        if (low > 0) {
          visible.push(
            this.getKey(column[low - 1][0], column[low - 1][1])
          );
        }
      }

      return visible;
    };

    // Грубая карта плотности: сколько островов попало в блоки 4x4.
    // Сумма по соседним блокам даёт O(1)-оценку заполненности района.
    const buildDensity = (islands) => {
      const blockSize = 4;
      const blocks = Math.ceil(newGrid / blockSize);
      const counts = new Int32Array(blocks * blocks);

      for (const key of islands.keys()) {
        const point = parseBoardKey(key);

        if (!point) continue;

        const blockRow = Math.floor(point.r / blockSize);
        const blockCol = Math.floor(point.c / blockSize);

        counts[blockRow * blocks + blockCol]++;
      }

      return { blockSize, blocks, counts };
    };

    const densityAt = (r, c, density) => {
      const blockSize = density.blockSize;
      const blocks = density.blocks;
      const blockRow = Math.floor(r / blockSize);
      const blockCol = Math.floor(c / blockSize);

      let score = 0;

      for (let dr = -1; dr <= 1; dr++) {
        const br = blockRow + dr;

        if (br < 0 || br >= blocks) continue;

        for (let dc = -1; dc <= 1; dc++) {
          const bc = blockCol + dc;

          if (bc < 0 || bc >= blocks) continue;

          score += density.counts[br * blocks + bc];
        }
      }

      return score;
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const workIslands = new Map(baseIslands);
      const workBridges = new Map(baseBridges);
      const workMetas = [];
      const workMetaByKey = new Map();

      for (const [edgeKey] of workBridges) {
        const meta = this.createEdgeMetaFromKey(edgeKey);

        if (!meta) return false;

        workMetas.push(meta);
        workMetaByKey.set(edgeKey, meta);
      }

      const blockedCells = collectBlockedCells(workBridges);

      // Маски пересечений с уже существующими мостами.
      //
      // Новый лист соединяется по строке или столбцу. Чтобы не
      // перебирать все старые мосты для каждой клетки, отмечаем
      // внутренние клетки вертикальных и горизонтальных мостов и
      // строим префиксные суммы. Проверка пересечения — O(1).
      const cellCount = newGrid * newGrid;

      const verticalInterior = new Uint8Array(cellCount);
      const horizontalInterior = new Uint8Array(cellCount);

      for (const meta of workMetas) {
        if (meta.invalid) continue;

        if (meta.vertical) {
          for (let r = meta.minR + 1; r < meta.maxR; r++) {
            verticalInterior[r * newGrid + meta.col] = 1;
          }
        } else {
          for (let c = meta.minC + 1; c < meta.maxC; c++) {
            horizontalInterior[meta.row * newGrid + c] = 1;
          }
        }
      }

      const verticalRowPrefix = new Int32Array(
        newGrid * (newGrid + 1)
      );
      const horizontalColPrefix = new Int32Array(
        newGrid * (newGrid + 1)
      );

      for (let r = 0; r < newGrid; r++) {
        for (let c = 0; c < newGrid; c++) {
          verticalRowPrefix[r * (newGrid + 1) + c + 1] =
            verticalRowPrefix[r * (newGrid + 1) + c] +
            verticalInterior[r * newGrid + c];

          horizontalColPrefix[c * (newGrid + 1) + r + 1] =
            horizontalColPrefix[c * (newGrid + 1) + r] +
            horizontalInterior[r * newGrid + c];
        }
      }

      const crossesBaseBridge = (meta) => {
        if (!meta || meta.invalid) return true;

        if (meta.vertical) {
          const min = meta.minR;
          const max = meta.maxR;
          const base = meta.col * (newGrid + 1);

          // Горизонтальные мосты в строках (minR, maxR).
          return (
            horizontalColPrefix[base + max] -
              horizontalColPrefix[base + min + 1] >
            0
          );
        }

        const min = meta.minC;
        const max = meta.maxC;
        const base = meta.row * (newGrid + 1);

        // Вертикальные мосты в столбцах (minC, maxC).
        return (
          verticalRowPrefix[base + max] -
            verticalRowPrefix[base + min + 1] >
          0
        );
      };

      const newKeys = new Set();
      const newCoords = new Map();

      // Геометрия уже запланированных мостов новых листьев.
      const plannedMetas = [];
      const plannedEdges = new Map();

      // Каждый новый остров получает уникальные строку и столбец.
      // Тогда два новых острова не могут видеть друг друга: видимость
      // возможна только в одной строке или одном столбце. Значит,
      // у каждого нового острова остаётся ровно один старый сосед,
      // и он всегда является вынужденным листом.
      const usedRows = new Set();
      const usedCols = new Set();

      // Прогнозируемые числа старых островов. Нужны, чтобы несколько
      // новых листьев не переполнили один и тот же остров.
      const projectedTargets = new Map(baseIslands);

      let failed = false;

      // ==========================================================
      // 1. Ставим новые острова в самые свободные клетки всего поля.
      // ==========================================================
      for (let placed = 0; placed < addIslands; placed++) {
        const cells = [];

        for (const key of workIslands.keys()) {
          const point = parseBoardKey(key);

          if (point) cells.push([point.r, point.c]);
        }

        const cellSet = new Set(workIslands.keys());
        const lineIndex = buildLineIndex(cells);
        const density = buildDensity(workIslands);

        // Желаемая кратность для этого листа. Если у старого соседа
        // осталось меньше запаса до 8, кратность будет уменьшена.
        const preferredCount = this.pickBridgeCount(
          bridgeLimit,
          multiChance
        );

        // Кандидаты в новой внешней полосе. Здесь заведомо есть
        // свободные участки, а внутренние ряды/столбцы старой карты
        // дают ровно одного видимого соседа.
        const candidateCells = [];

        for (let r = 0; r < shift; r++) {
          for (let c = shift; c < shift + oldGrid; c++) {
            candidateCells.push(r, c);
          }
        }

        for (
          let r = shift + oldGrid;
          r < newGrid;
          r++
        ) {
          for (let c = shift; c < shift + oldGrid; c++) {
            candidateCells.push(r, c);
          }
        }

        for (let c = 0; c < shift; c++) {
          for (let r = shift; r < shift + oldGrid; r++) {
            candidateCells.push(r, c);
          }
        }

        for (
          let c = shift + oldGrid;
          c < newGrid;
          c++
        ) {
          for (let r = shift; r < shift + oldGrid; r++) {
            candidateCells.push(r, c);
          }
        }

        // Небольшая случайная выборка по всей карте: она позволяет
        // занять особенно пустые места и внутри старой области.
        const sampleCount = Math.min(500, newGrid * newGrid);

        for (let sample = 0; sample < sampleCount; sample++) {
          candidateCells.push(
            Math.floor(Math.random() * newGrid),
            Math.floor(Math.random() * newGrid)
          );
        }

        let best = null;
        let bestScore = Infinity;
        let bestTies = 0;

        for (
          let candidateIndex = 0;
          candidateIndex < candidateCells.length;
          candidateIndex += 2
        ) {
          const r = candidateCells[candidateIndex];
          const c = candidateCells[candidateIndex + 1];
          const key = this.getKey(r, c);

            if (
              cellSet.has(key) ||
              blockedCells.has(key) ||
              usedRows.has(r) ||
              usedCols.has(c)
            ) {
              continue;
            }

            const visible = visibleNeighborKeys(r, c, lineIndex);

            // Новый остров — лист: ровно один видимый сосед. Благодаря
            // уникальным строке и столбцу этот сосед не может быть
            // другим новым островом, а поздние острова не перекроют
            // линию видимости.
            if (visible.length !== 1) {
              continue;
            }

            // Старый остров не должен получить число больше 8.
            const neighbour = visible[0];
            const neighbourPoint = parseBoardKey(neighbour);

            if (!neighbourPoint) continue;

            const current = projectedTargets.get(neighbour) || 0;
            const available = MAX_ISLAND_TARGET - current;

            if (available < 1) {
              continue;
            }

            const count = Math.min(preferredCount, available);

            const edgeMeta = this.createEdgeMeta(
              [r, c],
              [neighbourPoint.r, neighbourPoint.c]
            );

            // Мост листа не должен пересекать старые мосты
            // и уже запланированные мосты других новых листьев.
            if (
              !edgeMeta ||
              crossesBaseBridge(edgeMeta) ||
              this.hasIntersectionWithEdges(
                edgeMeta,
                plannedMetas
              )
            ) {
              continue;
            }

            const score = densityAt(r, c, density);

            if (score < bestScore) {
              bestScore = score;
              best = {
                r,
                c,
                key,
                neighbour,
                edgeMeta,
                count
              };
              bestTies = 1;
            } else if (score === bestScore) {
              bestTies++;

              // Равномерный выбор среди одинаково свободных клеток.
              if (Math.random() < 1 / bestTies) {
                best = {
                  r,
                  c,
                  key,
                  neighbour,
                  edgeMeta,
                  count
                };
              }
            }
        }

        if (!best) {
          failed = true;
          break;
        }

        workIslands.set(best.key, 0);
        newKeys.add(best.key);
        newCoords.set(best.key, [best.r, best.c]);

        usedRows.add(best.r);
        usedCols.add(best.c);
        plannedMetas.push(best.edgeMeta);
        plannedEdges.set(best.edgeMeta.edgeKey, best.count);

        projectedTargets.set(
          best.neighbour,
          (projectedTargets.get(best.neighbour) || 0) +
            best.count
        );
      }

      if (failed) continue;

      // ==========================================================
      // 2. Пересчитываем видимость уже на итоговой карте.
      // ==========================================================
      const finalCells = [];
      const coordOf = new Map();

      for (const key of workIslands.keys()) {
        const point = parseBoardKey(key);

        if (!point) {
          failed = true;
          break;
        }

        finalCells.push([point.r, point.c]);
        coordOf.set(key, [point.r, point.c]);
      }

      if (failed) continue;

      const finalIndex = buildLineIndex(finalCells);
      const visibility = new Map();

      for (const newKey of newKeys) {
        const [r, c] = newCoords.get(newKey);
        const visible = visibleNeighborKeys(r, c, finalIndex);

        // Благодаря уникальным строке и столбцу у листа должен
        // остаться ровно один видимый сосед.
        if (visible.length !== 1) {
          failed = true;
          break;
        }

        const edgeKey = this.getEdgeKey(
          coordOf.get(newKey),
          coordOf.get(visible[0])
        );

        if (!plannedEdges.has(edgeKey)) {
          failed = true;
          break;
        }

        visibility.set(newKey, visible);
      }

      if (failed) continue;

      // ==========================================================
      // 3. Кратности уже выбраны при размещении листьев.
      // ==========================================================
      const edgeCounts = new Map(plannedEdges);

      // ==========================================================
      // 4. Добавляем мосты нового решения и проверяем геометрию.
      // ==========================================================
      for (const [edgeKey, count] of edgeCounts) {
        const meta = this.createEdgeMetaFromKey(edgeKey);

        if (!meta) {
          failed = true;
          break;
        }

        if (
          !workIslands.has(meta.key1) ||
          !workIslands.has(meta.key2)
        ) {
          failed = true;
          break;
        }

        if (this.hasIntersectionWithEdges(meta, workMetas)) {
          failed = true;
          break;
        }

        workBridges.set(edgeKey, count);
        workMetas.push(meta);
        workMetaByKey.set(edgeKey, meta);
      }

      if (failed) continue;

      // ==========================================================
      // 5. Пересчитываем числа по полному набору мостов.
      // ==========================================================
      const targets = new Map();

      for (const key of workIslands.keys()) {
        targets.set(key, 0);
      }

      for (const [edgeKey, count] of workBridges) {
        const meta = workMetaByKey.get(edgeKey);

        if (!meta) {
          failed = true;
          break;
        }

        targets.set(meta.key1, targets.get(meta.key1) + count);
        targets.set(meta.key2, targets.get(meta.key2) + count);
      }

      if (failed) continue;

      let valid = true;
      let totalSum = 0;

      for (const value of targets.values()) {
        if (value < 1 || value > MAX_ISLAND_TARGET) {
          valid = false;
          break;
        }

        totalSum += value;
      }

      if (!valid || totalSum % 2 !== 0) continue;

      // ==========================================================
      // 6. Проверяем вынужденность новых мостов.
      //
      // У каждого нового острова ровно одно видимое ребро, а его число
      // равно кратности этого ребра. Значит, ребро вынуждено.
      // ==========================================================
      let forcedByConstruction = newKeys.size > 0;

      if (forcedByConstruction) {
        for (const newKey of newKeys) {
          const visible = visibility.get(newKey);
          const target = targets.get(newKey);
          const edgeKey = this.getEdgeKey(
            coordOf.get(newKey),
            coordOf.get(visible[0])
          );
          const count = edgeCounts.get(edgeKey);

          if (!Number.isInteger(count) || target !== count) {
            forcedByConstruction = false;
            break;
          }
        }
      }

      if (!forcedByConstruction) {
        // Структурная гарантия не сработала — проверяем солвером.
        const solutions =
          this.solutionChecker.countSolutionsForIslands(
            targets,
            2,
            gameNow() + solverBudgetMs
          );

        if (solutions !== 1) continue;
      }

      // Успех: фиксируем расширенную карту.
      // Старые мосты сохраняются — игрок продолжает с того же места,
      // а новые острова нужно подключить самому.
      this.gridSize = newGrid;
      this.islands = targets;
      this.bridges = new BridgeStore(this, baseBridges);

      return true;
    }

    return false;
  }
  };
})();
