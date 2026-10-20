# Bridges — audit progress

> Актуальное описание архитектуры и алгоритмов: [`LOGIC.md`](./LOGIC.md).
> Раздел ниже про «вынужденное дерево» и двойные мосты оставлен как история
> предыдущей оптимизации; текущая реализация снова ограничивает связь
> двумя мостами и использует новых островов-листьев с уникальными
> строками/столбцами.

## Update: ночной скин и палитра заполненных островов

- Ночной скин «Лунная ночь» переработан: на воде появились луна
  с дорожкой отражения и звёздные блики, над водой летают светлячки,
  а на каждом острове горит маленький фонарик.
- Ночные эффекты включаются по признаку `skinPreview === "night"` и
  берут цвета из палитры скина, поэтому светлая лагуна не меняется.
- Заполненный остров перекрашен из кислотно-лаймового в спокойную
  мяту (день) и лунную бирюзу (ночь); обводка, дерево, прогресс и
  свечение цифры приведены к той же гамме.
- Внутренняя окантовка и галочка выполненного острова стали
  нейтрально-белыми, чтобы не спорить с новой палитрой.
- В палитры добавлен ключ `sceneBackground`: фон нижней панели больше
  не остаётся ярко-синим в ночном скине.
- Логика, генератор и солвер не затронуты; тесты проходят `34/34`.

## Update: технический долг рендерера

- `renderer.js` разделён на классические script-модули в `renderer/`:
  скины, кэш мира, камера, игровое взаимодействие, вода, эффекты,
  острова, мосты и UI. Каждый модуль добавляет методы к прототипу
  `BridgesGameRenderer`, поэтому сборщик и ES-модули не нужны.
- `index.html` подключает модули перед основным `renderer.js`; порядок
  загрузки и прямой запуск страницы сохранены.
- Удалён неиспользуемый палитровый объект `this.colors` из конструктора.
- `README.md` пересохранён из UTF-16LE в UTF-8 без изменения текста.

## Update: двойные связи и стабильное расширение

- Эксперимент с `1..n` мостами отменён: между двумя островами снова можно
  проложить не более двух мостов. Запрос `maxBridgeCount` больше двух
  ограничивается двумя.
- Солвер, генератор, проверка победы, ввод и отрисовка используют это
  ограничение. Двойной мост рисуется двумя дорожками, одиночный — одной.
- Двойные связи становятся чаще с ростом сложности, поэтому числа на
  островах приходится распределять между несколькими рёбрами.
- Генерация новых карт выбирает кандидатов с минимальной локальной
  плотностью, поэтому острова заполняют свободные участки, а не растут
  одной прямой веткой.
- Расширение карты ставит новых островов-листьев в самые свободные клетки
  всего поля с уникальными строками и столбцами. Каждый лист имеет ровно
  одного видимого соседа, а его число равно кратности единственного моста.
  Поэтому мосты новых листьев вынуждены, и единственность наследуется от
  старой карты без запуска солвера.
- Пересечения новых мостов со старыми и между собой проверяются через
  масочные префиксные суммы и список запланированных рёбер.
- 17-й уровень и цепочки до 21-го уровня проходят без отказов; типичное
  расширение на 17-м уровне занимает сотни миллисекунд вместо десятков
  секунд/неудачи. Полная проверка солвером независимо подтвердила
  единственность на уровнях 2–14 (дальше структурная гарантия).

## Fix A-01: safe level generation

- A failed generation attempt no longer clears the currently playable level.
- Existing bridges are cleared only after a valid new level has been generated.
- The UI checks generation results and displays an accessible error message.
- The victory screen remains visible if a replacement level cannot be generated.

## Optimization: cluster cache and incremental indexes

### Logic

- `bridges` is now a `BridgeStore` (`Map` subclass) with an incremental
  index: bridge count per island and parsed edge geometry are updated on
  every `set`/`delete`/`clear`.
- `getIslandBridgesCount()` is O(1) instead of scanning every bridge and
  splitting string keys.
- `checkVictory()` and `isConnected()` reuse the parsed edge geometry.
- Intersection checks no longer re-parse every existing bridge key.

### Solver

- Possible edges are built from sorted row/column indexes instead of an
  O(n²) pairwise path scan.
- Independent connected components ("clusters") are detected with DSU
  before search. A disconnected possible-edge graph is rejected immediately.
- The remaining-capacity pruning is maintained incrementally instead of
  rebuilding a `Map` of capacities on every search node.
- Deadlines no longer depend on `performance` being available in the
  environment.

### Generator

- Island coordinates and the island-key `Set` are prebuilt once per attempt,
  so the backtracking tree builder no longer runs `split(',')`/`map(Number)`
  on every connected→remaining pair.
- Bridge geometry is computed once per candidate and reused for both the
  intersection check and the final degree count; the tree search keeps a
  parallel `meta` array instead of re-parsing bridge keys.
- Level generation is still verified for a unique solution through the
  cluster solver before being accepted.

Local generation measurement (`git` working tree, Node.js, 20 runs/config):

| Grid | Islands | Before | After |
| --- | --- | ---: | ---: |
| 7×7 | 8–11 | ~18.9 ms | ~6.8 ms |
| 9×9 | 12–15 | ~49.3 ms | ~34.5 ms |
| 11×11 | 16–20 | ~119.0 ms | ~81.5 ms |

### Expansions and additional islands

- New islands are grown as a forced tree: when possible, a candidate must
  see only the island it is attached to. Its bridge count is therefore
  forced by its target (1 or 2), and the next island can be grown from it.
- After placement, the generator checks that every new island's visible
  neighbours are exactly its tree neighbours. If so, uniqueness is
  inherited from the previous map (which is unique by construction) and
  the solver is skipped entirely.
- The solver remains as a fallback for the rare attempt where the
  structural condition does not hold.
- The outer growth band is sized from the number of added islands
  (one cell per side per ~4 islands), so forced placements always have
  room even at high levels.

Local expansion measurement (`git` working tree, Node.js, chained
campaign, verifier runs the solver independently after every expansion):

| Level | Added islands | Grid | Before | After |
| --- | ---: | ---: | ---: | ---: |
| 11 | 20 | 67×67 | ~261 ms | ~20–26 ms |
| 12 | 22 | 79×79 | ~8.6 s | ~35 ms |

Before the change, failed solver attempts could also exhaust the 40-attempt
budget (observed ~60 s at level 11 in one run). With the forced-tree
construction the structural path handled almost every sampled expansion;
the rare fallback took ~0.1–0.4 s. All 30 sampled expansion maps were
independently verified to have exactly one solution and to be winnable.

### Renderer

- The world is split into 256×256 chunks. Bridges and islands are rendered
  once into two offscreen layers (bridges below islands) and only the chunks
  affected by a change are invalidated.
- Hover/selection highlights are drawn as a dynamic overlay, so mouse movement
  does not rebuild island sprites.
- The static water gradient/glow/vignette is cached; only the light ripple
  animation is redrawn each frame.

Local browser measurement on a generated 9×9 / 16-island level:

| Mode | Time per `draw()` |
| --- | ---: |
| Cached chunks | ~0.25 ms |
| Full rebuild every frame | ~6.34 ms |

## Regression tests

Run from this directory with Node.js 18+:

```sh
node --test tests/logic.test.cjs
```

The tests cover preservation of the old level after a deterministic generation failure, successful replacement of a level, incremental bridge indexing, state-free solution counting, the cluster fast-reject path, and expansion uniqueness (added islands, preserved player bridges, exactly one solution).

## Remaining audit items

This is the first targeted fix, not the complete audit. Other items to investigate include bridge-removal targeting, generator solution uniqueness, responsive canvas sizing, and frame-rate-independent animation.
