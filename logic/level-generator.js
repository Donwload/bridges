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
  /*
   * Плотная карта для «средней» и «сложной» сложности.
   *
   * Острова не выстраиваются в ряды или полосы: карта растёт от
   * случайного острова, а каждый новый остров ставится в случайном
   * направлении на расстоянии 1–4 клетки. Из нескольких кандидатов
   * выбирается самый «пустой» участок, поэтому острова распределяются
   * по всему полю, а не сбиваются в одну ветку. При равенстве
   * приоритет у кандидата, закрывающего пустой ряд или столбец,
   * а ряд/столбец не заполняются больше чем на 75% — иначе острова
   * читались бы как линия.
   *
   * Связи решения строятся по видимым соседям — ближайшему острову
   * в каждом из четырёх направлений. Сначала берётся дерево роста,
   * затем к нему добавляются все видимые рёбра, которые не пересекают
   * уже выбранные. Получается максимальный непересекающийся граф.
   * Все его рёбра двойные, поэтому число острова равно 2 × степени,
   * и решение единственно. Часть рёбер затем ослабляется до одного
   * моста, если солвер подтверждает единственность.
   */
  generateDenseLevel(options = {}) {
    const gridSize = options.gridSize ?? this.gridSize;
    const minIslands = Math.max(1, options.minIslands ?? 8);
    const maxIslands = Math.max(
      minIslands,
      options.maxIslands ?? minIslands
    );
    const weakenChance = Math.max(
      0,
      Math.min(1, options.defectChance ?? 0.1)
    );
    const maxAttempts = Math.max(
      1,
      options.maxAttempts ?? 300
    );
    const timeLimit = Math.max(
      100,
      options.timeLimit ?? 3000
    );

    const previousGridSize = this.gridSize;

    this.gridSize = gridSize;

    if (gridSize < 3) {
      this.gridSize = previousGridSize;
      return false;
    }

    const startedAt = gameNow();
    let attempts = 0;

    while (
      attempts < maxAttempts &&
      gameNow() - startedAt < timeLimit
    ) {
      attempts++;

      const targetCount =
        minIslands +
        Math.floor(
          Math.random() * (maxIslands - minIslands + 1)
        );

      const layout = this.buildScatterLayout(
        gridSize,
        targetCount
      );

      if (!layout) continue;

      // Карта должна занимать всё поле, а не только его часть.
      const [minRow, maxRow, minCol, maxCol] =
        layout.bounds;

      if (
        minRow > 1 ||
        maxRow < gridSize - 2 ||
        minCol > 1 ||
        maxCol < gridSize - 2
      ) {
        continue;
      }

      // Ни один ряд и ни один столбец не должен быть пустым:
      // карта покрывает всё поле. И ни один ряд/столбец не должен
      // быть заполнен больше чем на 75% — иначе острова
      // выстраиваются в линию.
      if (!this.scatterCoversField(layout.points, gridSize)) {
        continue;
      }

      const edges = this.augmentScatterEdges(
        layout,
        gridSize
      );

      if (!edges) continue;

      const targets = this.pickScatterTargets(
        layout,
        edges,
        weakenChance,
        startedAt + timeLimit
      );

      if (!targets) continue;

      // Фактическая доля двойных связей: сумма чисел островов равна
      // удвоенному числу мостов, а рёбер в решении ровно edges.length.
      let targetSum = 0;

      for (const value of targets.values()) {
        targetSum += value;
      }

      const bridgeCount = targetSum / 2;

      this.lastDenseStats = {
        edges: edges.length,
        bridges: bridgeCount,
        doubleShare:
          edges.length > 0
            ? (bridgeCount - edges.length) / edges.length
            : 0
      };

      this.islands = targets;
      this.ensureBridgeStore().clear();

      return true;
    }

    // Не удалось создать карту: не трогаем текущую.
    this.gridSize = previousGridSize;

    return false;
  },

  /*
   * Проверяет, что карта покрывает поле и не образует линий.
   *
   * В каждом ряду и столбце обязан быть хотя бы один остров, иначе
   * на карте остаются пустые полосы. При этом ни один ряд/столбец
   * не должен быть заполнен подряд: длинная цепочка островов читается
   * как линия. Порог — 75% длины поля, но не меньше 4 островов.
   */
  scatterCoversField(points, gridSize) {
    const rowCounts = new Int16Array(gridSize);
    const columnCounts = new Int16Array(gridSize);

    for (const [row, column] of points) {
      rowCounts[row]++;
      columnCounts[column]++;
    }

    const maxPerLine = Math.max(
      4,
      Math.ceil(gridSize * 0.75)
    );

    for (let index = 0; index < gridSize; index++) {
      if (
        rowCounts[index] === 0 ||
        columnCounts[index] === 0
      ) {
        return false;
      }

      if (
        rowCounts[index] >= maxPerLine ||
        columnCounts[index] >= maxPerLine
      ) {
        return false;
      }
    }

    return true;
  },

  /*
   * Выращивает случайную карту: новый остров ставится на расстоянии
   * 1–4 клетки от уже существующего. Кандидаты, чьё ребро пересекает
   * уже выбранные мосты, отбрасываются; клетки внутри выбранных
   * рёбер защищаются, чтобы новые острова не разрывали решение.
   */
  buildScatterLayout(gridSize, targetCount) {
    const maxDistance = 4;
    const densityRadius = 2;

    const startRow = Math.floor(
      Math.random() * gridSize
    );
    const startCol = Math.floor(
      Math.random() * gridSize
    );

    const points = [[startRow, startCol]];
    const pointSet = new Set([
      this.getKey(startRow, startCol)
    ]);
    const degree = new Map([
      [this.getKey(startRow, startCol), 0]
    ]);
    const density = new Int16Array(
      gridSize * gridSize
    );
    const rowCounts = new Int16Array(gridSize);
    const columnCounts = new Int16Array(gridSize);
    const lineCapacity = Math.max(
      4,
      Math.ceil(gridSize * 0.75)
    );
    const horizontalByRow = Array.from(
      { length: gridSize },
      () => []
    );
    const verticalByColumn = Array.from(
      { length: gridSize },
      () => []
    );
    const protectedCells = new Set();
    const edges = [];

    const addDensity = (row, col) => {
      const fromRow = Math.max(
        0,
        row - densityRadius
      );
      const toRow = Math.min(
        gridSize - 1,
        row + densityRadius
      );
      const fromCol = Math.max(
        0,
        col - densityRadius
      );
      const toCol = Math.min(
        gridSize - 1,
        col + densityRadius
      );

      for (let r = fromRow; r <= toRow; r++) {
        const base = r * gridSize;

        for (let c = fromCol; c <= toCol; c++) {
          density[base + c]++;
        }
      }
    };

    addDensity(startRow, startCol);
    rowCounts[startRow]++;
    columnCounts[startCol]++;

    while (points.length < targetCount) {
      const candidates = new Map();

      for (const [sourceRow, sourceCol] of points) {
        const sourceKey = this.getKey(
          sourceRow,
          sourceCol
        );

        // У острова не может быть больше четырёх видимых соседей.
        if ((degree.get(sourceKey) || 0) >= 4) {
          continue;
        }

        for (const [dr, dc] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        ]) {
          for (
            let distance = 1;
            distance <= maxDistance;
            distance++
          ) {
            const row = sourceRow + dr * distance;
            const col = sourceCol + dc * distance;

            if (
              row < 0 ||
              row >= gridSize ||
              col < 0 ||
              col >= gridSize
            ) {
              break;
            }

            const key = this.getKey(row, col);

            // Дальше путь перекрыт другим островом.
            if (pointSet.has(key)) break;
            if (protectedCells.has(key)) continue;
            if (candidates.has(key)) continue;

            // Не переполняем ряд и столбец: иначе острова
            // выстраиваются в длинную линию. Порог на один
            // остров строже проверки покрытия поля.
            if (
              rowCounts[row] >= lineCapacity - 1 ||
              columnCounts[col] >= lineCapacity - 1
            ) {
              continue;
            }

            if (dr === 0) {
              const firstCol = Math.min(
                sourceCol,
                col
              );
              const lastCol = Math.max(
                sourceCol,
                col
              );

              if (
                this.scatterEdgeCrosses(
                  {
                    kind: "h",
                    row: sourceRow,
                    firstCol,
                    lastCol
                  },
                  horizontalByRow,
                  verticalByColumn
                )
              ) {
                continue;
              }

              candidates.set(key, {
                row,
                col,
                sourceRow,
                sourceCol,
                kind: "h",
                firstCol,
                lastCol
              });
            } else {
              const firstRow = Math.min(
                sourceRow,
                row
              );
              const lastRow = Math.max(
                sourceRow,
                row
              );

              if (
                this.scatterEdgeCrosses(
                  {
                    kind: "v",
                    column: sourceCol,
                    firstRow,
                    lastRow
                  },
                  horizontalByRow,
                  verticalByColumn
                )
              ) {
                continue;
              }

              candidates.set(key, {
                row,
                col,
                sourceRow,
                sourceCol,
                kind: "v",
                column: sourceCol,
                firstRow,
                lastRow
              });
            }
          }
        }
      }

      if (candidates.size === 0) {
        return null;
      }

      const list = [...candidates.values()];
      let bestDensity = Infinity;
      let bestGapBonus = -1;

      for (const candidate of list) {
        const index =
          candidate.row * gridSize + candidate.col;

        candidate.density = density[index];

        // Приоритет — пустые ряды и столбцы: так карта покрывает
        // всё поле, и не приходится перегенерировать раскладку.
        candidate.gapBonus =
          (rowCounts[candidate.row] === 0 ? 1 : 0) +
          (columnCounts[candidate.col] === 0 ? 1 : 0);

        if (candidate.gapBonus > bestGapBonus) {
          bestGapBonus = candidate.gapBonus;
          bestDensity = candidate.density;
        } else if (
          candidate.gapBonus === bestGapBonus &&
          candidate.density < bestDensity
        ) {
          bestDensity = candidate.density;
        }
      }

      const pool = list.filter(
        (candidate) =>
          candidate.gapBonus === bestGapBonus &&
          candidate.density === bestDensity
      );
      const chosen =
        pool[Math.floor(Math.random() * pool.length)];

      points.push([chosen.row, chosen.col]);
      pointSet.add(this.getKey(chosen.row, chosen.col));
      degree.set(this.getKey(chosen.row, chosen.col), 1);
      degree.set(
        this.getKey(chosen.sourceRow, chosen.sourceCol),
        (degree.get(
          this.getKey(
            chosen.sourceRow,
            chosen.sourceCol
          )
        ) || 0) + 1
      );

      addDensity(chosen.row, chosen.col);
      rowCounts[chosen.row]++;
      columnCounts[chosen.col]++;

      edges.push([
        this.getKey(chosen.sourceRow, chosen.sourceCol),
        this.getKey(chosen.row, chosen.col)
      ]);

      if (chosen.kind === "h") {
        horizontalByRow[chosen.row].push({
          kind: "h",
          row: chosen.row,
          firstCol: chosen.firstCol,
          lastCol: chosen.lastCol
        });

        for (
          let col = chosen.firstCol + 1;
          col < chosen.lastCol;
          col++
        ) {
          protectedCells.add(
            this.getKey(chosen.row, col)
          );
        }
      } else {
        verticalByColumn[chosen.column].push({
          kind: "v",
          column: chosen.column,
          firstRow: chosen.firstRow,
          lastRow: chosen.lastRow
        });

        for (
          let row = chosen.firstRow + 1;
          row < chosen.lastRow;
          row++
        ) {
          protectedCells.add(
            this.getKey(row, chosen.column)
          );
        }
      }
    }

    let minRow = gridSize;
    let maxRow = -1;
    let minCol = gridSize;
    let maxCol = -1;

    for (const [row, col] of points) {
      minRow = Math.min(minRow, row);
      maxRow = Math.max(maxRow, row);
      minCol = Math.min(minCol, col);
      maxCol = Math.max(maxCol, col);
    }

    return {
      points,
      edges,
      bounds: [minRow, maxRow, minCol, maxCol]
    };
  },

  /*
   * Проверяет, пересекает ли ребро уже выбранные мосты.
   * Горизонтальное ребро пересекает только вертикальные и наоборот.
   */
  scatterEdgeCrosses(
    edge,
    horizontalByRow,
    verticalByColumn
  ) {
    if (edge.kind === "h") {
      for (
        let col = edge.firstCol + 1;
        col < edge.lastCol;
        col++
      ) {
        for (const other of verticalByColumn[col]) {
          if (
            other.firstRow < edge.row &&
            edge.row < other.lastRow
          ) {
            return true;
          }
        }
      }

      return false;
    }

    for (
      let row = edge.firstRow + 1;
      row < edge.lastRow;
      row++
    ) {
      for (const other of horizontalByRow[row]) {
        if (
          other.firstCol < edge.column &&
          edge.column < other.lastCol
        ) {
          return true;
        }
      }
    }

    return false;
  },

  /*
   * Все видимые связи: соседние острова в каждой строке и столбце.
   * Именно эти пары солвер считает возможными мостами.
   */
  collectScatterEdges(points) {
    const rows = new Map();
    const columns = new Map();

    for (const [row, col] of points) {
      if (!rows.has(row)) rows.set(row, []);
      if (!columns.has(col)) columns.set(col, []);

      rows.get(row).push(col);
      columns.get(col).push(row);
    }

    const edges = [];

    for (const [row, cols] of rows) {
      cols.sort((a, b) => a - b);

      for (let i = 0; i + 1 < cols.length; i++) {
        edges.push({
          kind: "h",
          first: this.getKey(row, cols[i]),
          second: this.getKey(row, cols[i + 1]),
          row,
          firstCol: cols[i],
          lastCol: cols[i + 1]
        });
      }
    }

    for (const [col, rowsList] of columns) {
      rowsList.sort((a, b) => a - b);

      for (let i = 0; i + 1 < rowsList.length; i++) {
        edges.push({
          kind: "v",
          first: this.getKey(rowsList[i], col),
          second: this.getKey(rowsList[i + 1], col),
          column: col,
          firstRow: rowsList[i],
          lastRow: rowsList[i + 1]
        });
      }
    }

    return edges;
  },

  /*
   * Достраивает дерево роста до максимального непересекающегося
   * графа: добавляет все видимые рёбра, которые не пересекают
   * уже выбранные. Чем больше рёбер в решении, тем плотнее
   * числа островов и тем надёжнее единственность.
   */
  augmentScatterEdges(layout, gridSize) {
    const allEdges = this.collectScatterEdges(
      layout.points
    );
    const edgeByPair = new Map();

    for (const edge of allEdges) {
      edgeByPair.set(
        this.scatterPairKey(edge.first, edge.second),
        edge
      );
    }

    const selected = [];
    const selectedKeys = new Set();
    const horizontalByRow = Array.from(
      { length: gridSize },
      () => []
    );
    const verticalByColumn = Array.from(
      { length: gridSize },
      () => []
    );

    const addEdge = (edge) => {
      selected.push(edge);
      selectedKeys.add(
        this.scatterPairKey(edge.first, edge.second)
      );

      if (edge.kind === "h") {
        horizontalByRow[edge.row].push(edge);
      } else {
        verticalByColumn[edge.column].push(edge);
      }
    };

    for (const [first, second] of layout.edges) {
      const edge = edgeByPair.get(
        this.scatterPairKey(first, second)
      );

      if (!edge) return null;

      addEdge(edge);
    }

    // Перемешиваем, чтобы карта не зависела от порядка обхода.
    for (let i = allEdges.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allEdges[i], allEdges[j]] = [
        allEdges[j],
        allEdges[i]
      ];
    }

    for (const edge of allEdges) {
      const pairKey = this.scatterPairKey(
        edge.first,
        edge.second
      );

      if (selectedKeys.has(pairKey)) continue;

      if (
        this.scatterEdgeCrosses(
          edge,
          horizontalByRow,
          verticalByColumn
        )
      ) {
        continue;
      }

      addEdge(edge);
    }

    return selected;
  },

  scatterPairKey(first, second) {
    return first < second
      ? `${first}|${second}`
      : `${second}|${first}`;
  },

  /*
   * Считает числа островов по выбранным рёбрам. Сначала пробует
   * ослабить часть мостов до одного: так карта не выглядит целиком
   * «всё двойное». Каждый вариант проверяется солвером; если
   * единственность не доказана, используется полностью двойной
   * вариант, который гарантирует её по построению.
   */
  pickScatterTargets(
    layout,
    edges,
    weakenChance,
    deadline
  ) {
    const tryTargets = (weaken) => {
      const targets = new Map(
        layout.points.map(([row, col]) => [
          this.getKey(row, col),
          0
        ])
      );

      for (const edge of edges) {
        let count = 2;

        if (weaken && Math.random() < weakenChance) {
          count = 1;
        }

        const firstTarget =
          targets.get(edge.first) + count;
        const secondTarget =
          targets.get(edge.second) + count;

        if (
          firstTarget > MAX_ISLAND_TARGET ||
          secondTarget > MAX_ISLAND_TARGET
        ) {
          return null;
        }

        targets.set(edge.first, firstTarget);
        targets.set(edge.second, secondTarget);
      }

      for (const value of targets.values()) {
        if (value === 0) return null;
      }

      const solutionCount =
        this.solutionChecker.countSolutionsForIslands(
          targets,
          2,
          Math.min(deadline, gameNow() + 500)
        );

      return solutionCount === 1 ? targets : null;
    };

    // Несколько попыток с ослабленными мостами.
    for (let attempt = 0; attempt < 3; attempt++) {
      const weakened = tryTargets(true);

      if (weakened) return weakened;

      if (gameNow() >= deadline) return null;
    }

    if (gameNow() >= deadline) return null;

    // Гарантированный вариант: все мосты двойные.
    return tryTargets(false);
  },

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

    // Статистика плотной карты не должна переходить на обычную.
    this.lastDenseStats = null;

    // «Средние» и «сложные» карты строятся отдельной плотной схемой.
    if (options.dense) {
      const dense = this.generateDenseLevel(options);

      if (!dense) this.gridSize = previousGridSize;

      return dense;
    }

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

      // Быстрые структуры для размещения: Set для проверки занятости
      // и сетка плотности, чтобы не пересчитывать соседей заново.
      const placedSet = new Set();
      const densityGrid = new Int16Array(
        this.gridSize * this.gridSize
      );

      const keyOf = (r, c) => this.getKey(r, c);

      const addDensity = (r, c) => {
        const fromR = Math.max(0, r - 5);
        const toR = Math.min(this.gridSize - 1, r + 5);
        const fromC = Math.max(0, c - 5);
        const toC = Math.min(this.gridSize - 1, c + 5);

        for (let rr = fromR; rr <= toR; rr++) {
          const base = rr * this.gridSize;

          for (let cc = fromC; cc <= toC; cc++) {
            densityGrid[base + cc]++;
          }
        }
      };

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

      placedSet.add(keyOf(startR, startC));
      addDensity(startR, startC);

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
              if (placedSet.has(keyOf(r, c))) {
                continue;
              }

              // Не ставим остров слишком близко
              // к любому уже существующему острову:
              // запрещены сама клетка и её 4 соседа.
              if (
                placedSet.has(keyOf(r - 1, c)) ||
                placedSet.has(keyOf(r + 1, c)) ||
                placedSet.has(keyOf(r, c - 1)) ||
                placedSet.has(keyOf(r, c + 1))
              ) {
                continue;
              }

              const newIsland = [r, c];

              // Между source и новым островом
              // не должно быть другого острова.
              if (
                !this.isClearPath(
                  source,
                  newIsland,
                  placedSet
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
          const density =
            densityGrid[r * this.gridSize + c];

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

        placedSet.add(
          keyOf(selected.island[0], selected.island[1])
        );

        addDensity(
          selected.island[0],
          selected.island[1]
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
