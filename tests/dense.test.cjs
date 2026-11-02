/*
 * Плотные «сложные» карты: проверяем, что генератор действительно
 * заполняет всё поле, а не только каждую вторую клетку.
 *
 * Запуск: node --test tests/*.test.cjs
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const LOGIC_FILES = [
  "logic/core.js",
  "logic/solution-checker.js",
  "logic/geometry.js",
  "logic/board.js",
  "logic/expansion.js",
  "logic/level-generator.js",
  "logic.js"
];

const logicSource = LOGIC_FILES
  .map((file) =>
    fs.readFileSync(path.join(__dirname, "..", file), "utf8")
  )
  .join("\n");

const context = vm.createContext({ performance });

vm.runInContext(
  logicSource +
    "\nthis.BridgesGameLogic = BridgesGameLogic;" +
    "\nthis.SolutionChecker = SolutionChecker;",
  context
);

const BridgesGameLogic = context.BridgesGameLogic;
const SolutionChecker = context.SolutionChecker;

function generateDense(size, minIslands, maxIslands, options = {}) {
  const game = new BridgesGameLogic(size);

  const ok = game.generateValidLevel({
    minIslands,
    maxIslands,
    gridSize: size,
    doubleChance: options.doubleChance ?? 0.9,
    dense: true,
    defectChance: options.defectChance ?? 0.1
  });

  return { game, ok };
}

function islandPoints(game) {
  return [...game.islands.keys()].map((key) =>
    key.split(",").map(Number)
  );
}

function rowWidths(game) {
  const widths = new Map();

  for (const [row] of islandPoints(game)) {
    widths.set(row, (widths.get(row) ?? 0) + 1);
  }

  return [...widths.values()];
}

function columnHeights(game) {
  const heights = new Map();

  for (const [, col] of islandPoints(game)) {
    heights.set(col, (heights.get(col) ?? 0) + 1);
  }

  return [...heights.values()];
}

function assertFieldCovered(game, size) {
  const rows = new Set();
  const columns = new Set();

  for (const [row, col] of islandPoints(game)) {
    rows.add(row);
    columns.add(col);
  }

  // Каждый ряд и каждый столбец поля должны быть заняты.
  assert.equal(rows.size, size, "есть пустой ряд");
  assert.equal(columns.size, size, "есть пустой столбец");
}

test("плотная карта 25×25 занимает всю ширину поля", () => {
  const { game, ok } = generateDense(25, 200, 250);

  assert.equal(ok, true);
  assert.ok(game.islands.size >= 200);
  assert.ok(game.islands.size <= 250);

  const points = islandPoints(game);
  const columns = points.map(([, col]) => col);

  // Острова стоят от левого края до правого, а не в каждой второй
  // клетке: минимум и максимум по столбцам — края поля.
  assert.ok(Math.min(...columns) <= 1);
  assert.ok(Math.max(...columns) >= 23);
  assertFieldCovered(game, 25);

  const bridges =
    [...game.islands.values()].reduce((sum, value) => sum + value, 0) / 2;

  assert.ok(bridges >= 450, `мостов должно быть много: ${bridges}`);

  for (const target of game.islands.values()) {
    assert.ok(Number.isInteger(target));
    assert.ok(target >= 1 && target <= 8);
  }

  assert.equal(
    game.solutionChecker.countSolutionsForIslands(game.islands, 2),
    1
  );
});

test("на 7×7 нет полных линий и пустых полос", () => {
  const { game, ok } = generateDense(7, 25, 28);

  assert.equal(ok, true);
  assert.ok(game.islands.size >= 25);
  assert.ok(game.islands.size <= 28);

  const points = islandPoints(game);
  const rows = points.map(([row]) => row);
  const columns = points.map(([, col]) => col);

  // Карта покрывает всё поле, но ни один ряд/столбец не заполнен
  // целиком: иначе острова выглядят выстроенными в линию.
  assertFieldCovered(game, 7);
  assert.ok(Math.min(...rows) === 0);
  assert.ok(Math.max(...rows) === 6);
  assert.ok(Math.min(...columns) === 0);
  assert.ok(Math.max(...columns) === 6);

  assert.ok(
    Math.max(...rowWidths(game)) < 7,
    "ряд заполнен целиком — это линия"
  );
  assert.ok(
    Math.max(...columnHeights(game)) < 7,
    "столбец заполнен целиком — это линия"
  );

  assert.equal(
    game.solutionChecker.countSolutionsForIslands(game.islands, 2),
    1
  );
});

test("сложные карты одного размера не повторяют раскладку", () => {
  const signatures = new Set();

  for (let attempt = 0; attempt < 5; attempt++) {
    const { game, ok } = generateDense(7, 25, 28);

    assert.equal(ok, true);

    signatures.add(
      [...game.islands.keys()].sort().join("|")
    );
  }

  assert.ok(
    signatures.size > 1,
    "все сгенерированные карты совпали"
  );
});

test("плотный режим работает и на меньших сложных картах", () => {
  for (const [size, minIslands, maxIslands] of [
    [10, 45, 50],
    [15, 90, 105]
  ]) {
    const { game, ok } = generateDense(
      size,
      minIslands,
      maxIslands
    );

    assert.equal(ok, true, `${size}×${size}: карта не создалась`);
    assert.ok(game.islands.size >= minIslands);
    assert.ok(game.islands.size <= maxIslands);

    const columns = islandPoints(game).map(([, col]) => col);

    assert.ok(Math.min(...columns) <= 1);
    assert.ok(Math.max(...columns) >= size - 2);
    assertFieldCovered(game, size);

    assert.equal(
      game.solutionChecker.countSolutionsForIslands(
        game.islands,
        2
      ),
      1
    );
  }
});

test("средняя карта 25×25 заметно плотнее прежней", () => {
  const { game, ok } = generateDense(25, 70, 90, {
    doubleChance: 0.5,
    defectChance: 0.5
  });

  assert.equal(ok, true);
  assert.ok(game.islands.size >= 70);
  assert.ok(game.islands.size <= 90);

  const bridges =
    [...game.islands.values()].reduce((sum, value) => sum + value, 0) / 2;

  // Прежняя «средняя» давала около 35 мостов — это читалось как
  // пустое поле. Новая раскладка должна давать хотя бы 100.
  assert.ok(bridges >= 100, `мостов должно быть много: ${bridges}`);

  assertFieldCovered(game, 25);

  assert.ok(game.lastDenseStats);
  assert.equal(game.lastDenseStats.bridges, bridges);
  assert.ok(
    game.lastDenseStats.doubleShare >= 0 &&
      game.lastDenseStats.doubleShare <= 1
  );

  assert.equal(
    game.solutionChecker.countSolutionsForIslands(game.islands, 2),
    1
  );
});

test("солвер считает плотную карту за разумное время", () => {
  const { game } = generateDense(25, 200, 250);
  const checker = new SolutionChecker(game);

  const started = performance.now();
  const count = checker.countSolutionsForIslands(
    game.islands,
    2,
    performance.now() + 1000
  );
  const elapsed = performance.now() - started;

  assert.equal(count, 1);
  assert.ok(elapsed < 1000, `солвер слишком медленный: ${elapsed} мс`);
});
