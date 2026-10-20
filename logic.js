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

class BridgesGameLogic {
  constructor(gridSize = 7, options = {}) {
    this.gridSize = gridSize;
    this.islands = new Map();
    this.bridges = new BridgeStore(this);
    this.directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    // Кратность связи: 1 — обычный мост, 2 — двойной.
    // Больше двух мостов между одной парой островов быть не может.
    const requested = Number.isInteger(options.maxBridgeCount)
      ? options.maxBridgeCount
      : DEFAULT_MAX_BRIDGE_COUNT;

    this.maxBridgeCount = Math.max(
      1,
      Math.min(MAX_ALLOWED_BRIDGE_COUNT, requested)
    );

    this.solutionChecker = new SolutionChecker(this);
  }

  getKey(r, c) { return `${r},${c}`; }

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
  }

  ensureBridgeStore() {
    if (
      !(this.bridges instanceof BridgeStore) ||
      this.bridges.logic !== this
    ) {
      this.bridges = new BridgeStore(this, this.bridges);
    }

    return this.bridges;
  }

  getBridgeMetas() {
    return this.ensureBridgeStore().getMetas();
  }

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
  }

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
  }

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
  }

  getEdgeKey(i1, i2) {
    const k1 = this.getKey(i1[0], i1[1]);
    const k2 = this.getKey(i2[0], i2[1]);
    return k1 < k2 ? `${k1}-${k2}` : `${k2}-${k1}`;
  }

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
  }

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
  }

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
  }


  findBridgeForIslands(i1, i2) {
    if (
      !Array.isArray(i1) ||
      !Array.isArray(i2)
    ) {
      return null;
    }

    const edgeKey = this.getEdgeKey(i1, i2);

    return this.ensureBridgeStore().has(edgeKey)
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

    const store = this.ensureBridgeStore();
    const edgeKey = this.getEdgeKey(i1, i2);

    if (!store.has(edgeKey)) {
      return false;
    }

    store.delete(edgeKey);
    return true;
  }

  reset() {
    this.ensureBridgeStore().clear();
  }

  getIslandBridgesCount(island) {
    if (!Array.isArray(island) || island.length < 2) {
      return 0;
    }

    const key = this.getKey(island[0], island[1]);

    // Готовый индекс: без перебора всех мостов и разбора ключей.
    return this.ensureBridgeStore().getTotal(key);
  }

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
  }

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
}