/*
 * Регрессия 3D-режима: геометрия, генератор расширения карты и логика
 * партии. 2D-набор живёт отдельно в tests/logic.test.cjs и не трогается.
 *
 * Запуск: node --test tests/*.test.cjs
 * (или отдельно: node --test tests/logic3d.test.cjs)
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  key3d,
  parseKey3d,
  parseEdgeKey3d,
  edgeKey3d,
  visibleNeighbours3d,
  Solver3D,
  mulberry32,
  generateBoard3d,
  expandBoard3d
} = require("../logic3d/spike.js");

const { BridgesLogic3D } = require("../logic3d/game.js");

const SHIFT_ALL = 1;

// Кратности мостов решения в виде, который понимает expandBoard3d.
function asCounts(solution) {
  const map = new Map();

  for (const [edgeKey, entry] of solution) {
    map.set(edgeKey, typeof entry === "number" ? entry : entry.count);
  }

  return map;
}

// Готовая карта от генератора: расширяться можно только от неё.
function makeBoard(seed, size = 3, minIslands = 6, maxIslands = 8) {
  const rng = mulberry32(seed);
  const board = generateBoard3d({ size, minIslands, maxIslands, rng });

  assert.ok(board, "генератор обязан собрать карту для теста");

  return board;
}

// Проставляет всё решение карты через публичные правила игры.
function solveWithLogic(logic, solution) {
  for (const entry of solution.values()) {
    for (let i = 0; i < entry.count; i++) {
      const placed = logic.cycleBridge(entry.meta.p1, entry.meta.p2);

      assert.ok(placed >= 0, "мост решения должен ставиться по правилам");
    }
  }
}

test("ключ моста 3D разбирается на два конца", () => {
  assert.deepEqual(parseEdgeKey3d("0,1,2-0,3,2"), [
    [0, 1, 2],
    [0, 3, 2]
  ]);

  assert.equal(parseEdgeKey3d("0,1,2"), null);
  assert.equal(parseEdgeKey3d("каша"), null);
  assert.equal(parseEdgeKey3d(null), null);
});

test("видимый сосед — ближайший, дальние перекрыты", () => {
  const islands = new Set(["0,0,0", "2,0,0", "4,0,0", "0,2,0"]);

  assert.deepEqual(visibleNeighbours3d([0, 0, 0], islands, 5).sort(), [
    "0,2,0",
    "2,0,0"
  ]);

  assert.deepEqual(visibleNeighbours3d([2, 0, 0], islands, 5).sort(), [
    "0,0,0",
    "4,0,0"
  ]);

  assert.deepEqual(visibleNeighbours3d([1, 1, 0], islands, 5), []);
});

test("расширение растит куб и переносит старую карту в центр", () => {
  const board = makeBoard(101);
  const counts = asCounts(board.solution);
  const islandsBefore = [...board.islands.keys()].sort();

  const result = expandBoard3d(
    { size: board.size, islands: board.islands, bridges: counts },
    { addIslands: 2, growth: 2, rng: mulberry32(101) }
  );

  assert.ok(result);
  assert.equal(result.size, board.size + 2);
  assert.equal(result.shift, SHIFT_ALL);
  assert.equal(result.added.length, 2);
  assert.equal(result.islands.size, board.islands.size + 2);
  assert.equal(result.bridges.size, counts.size);

  // Вход не портим.
  assert.deepEqual([...board.islands.keys()].sort(), islandsBefore);
  assert.equal(board.islands.size, islandsBefore.length);

  // Старые острова сдвинуты на shift по всем трём осям.
  for (const key of board.islands.keys()) {
    const coord = parseKey3d(key);

    assert.ok(
      result.islands.has(
        key3d([
          coord[0] + SHIFT_ALL,
          coord[1] + SHIFT_ALL,
          coord[2] + SHIFT_ALL
        ])
      )
    );
  }

  // Старые мосты сохранены: те же кратности, концы сдвинуты.
  for (const [edgeKey, count] of counts) {
    const ends = parseEdgeKey3d(edgeKey);
    const moved = edgeKey3d(
      [ends[0][0] + SHIFT_ALL, ends[0][1] + SHIFT_ALL, ends[0][2] + SHIFT_ALL],
      [ends[1][0] + SHIFT_ALL, ends[1][1] + SHIFT_ALL, ends[1][2] + SHIFT_ALL]
    );

    assert.equal(result.bridges.get(moved), count);
  }
});

test("каждый новый остров — лист с вынужденным мостом", () => {
  const board = makeBoard(202);

  const result = expandBoard3d(
    {
      size: board.size,
      islands: board.islands,
      bridges: asCounts(board.solution)
    },
    { addIslands: 3, growth: 2, rng: mulberry32(202) }
  );

  assert.ok(result);
  assert.equal(result.added.length, 3);

  const finalSet = new Set(result.islands.keys());

  for (const key of result.added) {
    const neighbours = visibleNeighbours3d(
      parseKey3d(key),
      finalSet,
      result.size
    );

    assert.equal(neighbours.length, 1, "у листа ровно один видимый сосед");

    const plan = result.solution.get(
      edgeKey3d(parseKey3d(key), parseKey3d(neighbours[0]))
    );

    assert.ok(plan, "вынужденный мост входит в решение");
    assert.equal(result.islands.get(key), plan.count);
    assert.ok(plan.count >= 1 && plan.count <= 2);
  }

  // Никакие два новых острова не лежат на общей линии.
  for (let i = 0; i < result.added.length; i++) {
    for (let j = i + 1; j < result.added.length; j++) {
      const a = parseKey3d(result.added[i]);
      const b = parseKey3d(result.added[j]);
      const shared = [0, 1, 2].filter((axis) => a[axis] === b[axis]);

      assert.ok(shared.length <= 1, "новые острова не делят линию");
    }
  }
});

test("расширенная карта по-прежнему имеет ровно одно решение", () => {
  for (const seed of [1, 2, 3, 7, 11, 42, 99, 1234]) {
    const board = makeBoard(seed);
    const rng = mulberry32(seed * 31);

    let current = {
      size: board.size,
      islands: board.islands,
      bridges: asCounts(board.solution)
    };

    for (let step = 1; step <= 3; step++) {
      const result = expandBoard3d(current, {
        addIslands: 2 + step,
        growth: current.size + 2 <= 7 ? 2 : 0,
        rng
      });

      assert.ok(result, `seed ${seed}, шаг ${step}: расширение удалось`);
      assert.equal(result.added.length, 2 + step);

      for (const value of result.islands.values()) {
        assert.ok(value >= 1 && value <= 8, "числа в допустимом диапазоне");
      }

      const solutions = new Solver3D(result.islands, 2).countSolutions(
        2,
        Date.now() + 30000
      );

      assert.equal(solutions, 1, `seed ${seed}, шаг ${step}: одно решение`);

      current = {
        size: result.size,
        islands: result.islands,
        bridges: asCounts(result.solution)
      };
    }
  }
});

test("одно и то же зерно даёт одну и ту же карту", () => {
  const board = makeBoard(303);
  const input = {
    size: board.size,
    islands: board.islands,
    bridges: asCounts(board.solution)
  };
  const options = () => ({ addIslands: 3, growth: 2, rng: mulberry32(808) });

  const first = expandBoard3d(input, options());
  const second = expandBoard3d(input, options());

  assert.deepEqual([...first.added], [...second.added]);
  assert.deepEqual(
    [...first.islands.keys()].sort(),
    [...second.islands.keys()].sort()
  );

  for (const [key, value] of first.islands) {
    assert.equal(second.islands.get(key), value);
  }
});

test("расширение отказывается работать без решённой карты", () => {
  const board = makeBoard(404);
  const counts = asCounts(board.solution);

  assert.equal(expandBoard3d(null), null);
  assert.equal(
    expandBoard3d({ size: board.size, islands: new Map(), bridges: new Map() }),
    null
  );
  assert.equal(
    expandBoard3d({
      size: board.size,
      islands: board.islands,
      bridges: new Map()
    }),
    null
  );
  assert.equal(
    expandBoard3d({
      size: 1,
      islands: board.islands,
      bridges: counts
    }),
    null
  );
});

test("логика расширяет только решённую партию", () => {
  const board = makeBoard(505);
  const logic = new BridgesLogic3D(board.islands, 2, board.size);

  assert.equal(logic.size, board.size);

  // Мостов ещё нет.
  assert.equal(logic.expandLevel({ addIslands: 2, growth: 2 }), false);
  assert.equal(logic.size, board.size);

  // Один мост из решения — карта ещё не решена.
  const first = [...board.solution.values()][0];

  logic.cycleBridge(first.meta.p1, first.meta.p2);
  assert.equal(logic.isSolved(), false);
  assert.equal(logic.expandLevel({ addIslands: 2, growth: 2 }), false);
  assert.equal(logic.isSolved(), false);
});

test("после победы логика продолжает партию на новой карте", () => {
  const board = makeBoard(606);
  const logic = new BridgesLogic3D(board.islands, 2, board.size);

  solveWithLogic(logic, board.solution);
  assert.equal(logic.isSolved(), true);

  const islandsBefore = logic.islandKeys.length;
  const bridgesBefore = logic.bridges.size;

  assert.equal(
    logic.expandLevel({ addIslands: 3, growth: 2, rng: mulberry32(606) }),
    true
  );

  assert.equal(logic.size, board.size + 2);
  assert.equal(logic.islandKeys.length, islandsBefore + 3);
  assert.equal(logic.bridges.size, bridgesBefore);
  assert.equal(logic.isSolved(), false, "новые листья ещё не подключены");

  // Числа и суммы согласованы, старые мосты на месте.
  for (const key of logic.islandKeys) {
    const value = logic.islands.get(key);

    assert.ok(Number.isInteger(value) && value >= 1 && value <= 8);
    assert.ok(logic.countAt(key) <= value);
  }

  // Достраиваем вынужденные мосты — карта должна сойтись.
  const result = expandBoard3d(
    {
      size: board.size,
      islands: board.islands,
      bridges: asCounts(board.solution)
    },
    { addIslands: 3, growth: 2, rng: mulberry32(606) }
  );

  assert.ok(result);
  assert.deepEqual(
    [...logic.islandKeys].sort(),
    [...result.islands.keys()].sort()
  );

  for (const [edgeKey, entry] of result.solution) {
    if (logic.bridges.has(edgeKey)) continue;

    const ends = parseEdgeKey3d(edgeKey);

    for (let i = 0; i < entry.count; i++) {
      assert.ok(
        logic.cycleBridge(ends[0], ends[1]) >= 0,
        "вынужденный мост ставится по правилам игры"
      );
    }
  }

  assert.equal(logic.isSolved(), true);
});

test("повторные расширения держат поле в разумных границах", () => {
  const board = makeBoard(707, 3, 6, 8);
  const logic = new BridgesLogic3D(board.islands, 2, board.size);

  solveWithLogic(logic, board.solution);

  const expectedSizes = [5, 7, 7];

  let state = {
    size: board.size,
    islands: board.islands,
    bridges: asCounts(board.solution)
  };

  for (let step = 0; step < expectedSizes.length; step++) {
    const addIslands = 2 + step;
    const growth = state.size + 2 <= 7 ? 2 : 0;
    const seed = 1000 + step;

    // Тот же расчёт, что делает логика, но чистотой функцией.
    const expected = expandBoard3d(state, {
      addIslands,
      growth,
      rng: mulberry32(seed)
    });

    assert.ok(expected, `шаг ${step + 1}: расширение удалось`);

    const islandsBefore = logic.islandKeys.length;
    const bridgesBefore = logic.bridges.size;

    assert.equal(
      logic.expandLevel({ addIslands, growth, rng: mulberry32(seed) }),
      true
    );

    assert.equal(logic.size, expectedSizes[step]);
    assert.equal(logic.islandKeys.length, islandsBefore + addIslands);
    assert.equal(logic.bridges.size, bridgesBefore, "старые мосты на месте");
    assert.equal(logic.isSolved(), false, "листья ещё не подключены");

    for (const [key, value] of expected.islands) {
      assert.equal(logic.islands.get(key), value, "числа совпали с расчётом");
    }

    // Достраиваем вынужденные мосты по правилам игры.
    for (const [edgeKey, entry] of expected.solution) {
      if (logic.bridges.has(edgeKey)) continue;

      const ends = parseEdgeKey3d(edgeKey);

      for (let i = 0; i < entry.count; i++) {
        assert.ok(
          logic.cycleBridge(ends[0], ends[1]) >= 0,
          "вынужденный мост ставится"
        );
      }
    }

    assert.equal(logic.isSolved(), true);

    state = {
      size: expected.size,
      islands: expected.islands,
      bridges: asCounts(expected.solution)
    };
  }

  assert.equal(logic.size, 7);
  assert.ok(logic.islandKeys.length > board.islands.size);
});
