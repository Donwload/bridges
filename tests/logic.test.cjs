const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const LOGIC_FILES = [
  'logic/core.js',
  'logic/solution-checker.js',
  'logic/geometry.js',
  'logic/board.js',
  'logic/expansion.js',
  'logic/level-generator.js',
  'logic.js'
];

const logicSource = LOGIC_FILES
  .map((file) =>
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  )
  .join('\n');

const context = vm.createContext({});

vm.runInContext(
  logicSource +
    '\nthis.SolutionChecker = SolutionChecker;' +
    '\nthis.BridgesGameLogic = BridgesGameLogic;',
  context
);

const BridgesGameLogic = context.BridgesGameLogic;

function createGame(size = 5, coordinates = []) {
  const game = new BridgesGameLogic(size);

  for (const [r, c] of coordinates) {
    game.islands.set(`${r},${c}`, 2);
  }

  return game;
}

test('использует отдельный SolutionChecker для проверки решений', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.islands.set('0,0', 1);
  game.islands.set('0,2', 1);

  assert.equal(
    game.solutionChecker instanceof context.SolutionChecker,
    true
  );

  assert.equal(game.solutionChecker.countSolutions(2), 1);
});

test('создание мостов 1..2 и удаление после максимума', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  for (let count = 1; count <= game.maxBridgeCount; count++) {
    assert.equal(game.addBridge([0, 0], [0, 2]), true);
    assert.equal(game.bridges.get('0,0-0,2'), count);
  }

  assert.equal(game.addBridge([0, 0], [0, 2]), true);
  assert.equal(game.bridges.has('0,0-0,2'), false);
});

test('запрещает соединение с несуществующим островом', () => {
  const game = createGame(5, [[0, 0]]);

  assert.equal(game.addBridge([0, 0], [0, 2]), false);
  assert.equal(game.bridges.size, 0);
});

test('запрещает соединение острова с самим собой', () => {
  const game = createGame(5, [[1, 1]]);

  assert.equal(game.addBridge([1, 1], [1, 1]), false);
  assert.equal(game.bridges.size, 0);
});

test('запрещает диагональное соединение', () => {
  const game = createGame(5, [[0, 0], [2, 2]]);

  assert.equal(game.addBridge([0, 0], [2, 2]), false);
  assert.equal(game.bridges.size, 0);
});

test('отклоняет некорректные координаты', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  assert.equal(game.addBridge(null, [0, 2]), false);
  assert.equal(game.addBridge([0, 0], [0.5, 2]), false);
  assert.equal(game.addBridge([-1, 0], [0, 2]), false);
  assert.equal(game.addBridge([0, 0], [5, 0]), false);
  assert.equal(game.bridges.size, 0);
});

test('запрещает мост через промежуточный остров', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 1],
    [0, 2]
  ]);

  assert.equal(game.addBridge([0, 0], [0, 2]), false);
  assert.equal(game.bridges.size, 0);
});

test('запрещает пересечение мостов', () => {
  const game = createGame(3, [
    [0, 1],
    [2, 1],
    [1, 0],
    [1, 2]
  ]);

  assert.equal(game.addBridge([0, 1], [2, 1]), true);
  assert.equal(game.addBridge([1, 0], [1, 2]), false);
  assert.equal(game.bridges.size, 1);
});

test('не изменяет мосты при отклонении некорректного соединения', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 2],
    [2, 2]
  ]);

  game.bridges.set('0,0-0,2', 1);

  assert.equal(game.addBridge([0, 0], [2, 2]), false);
  assert.equal(game.bridges.size, 1);
  assert.equal(game.bridges.get('0,0-0,2'), 1);
});

test('пустое поле не считается победой', () => {
  const game = createGame(5);

  assert.equal(game.isConnected(), false);
  assert.equal(game.checkVictory(), false);
});

test('связанные острова с правильными числами — победа', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.islands.set('0,0', 1);
  game.islands.set('0,2', 1);
  game.bridges.set('0,0-0,2', 1);

  assert.equal(game.isConnected(), true);
  assert.equal(game.checkVictory(), true);
});

test('связанные острова с двойным мостом — победа', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.islands.set('0,0', 2);
  game.islands.set('0,2', 2);
  game.bridges.set('0,0-0,2', 2);

  assert.equal(game.isConnected(), true);
  assert.equal(game.checkVictory(), true);
});

test('несвязанные группы островов не дают победу', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 1],
    [3, 3],
    [3, 4]
  ]);

  for (const key of game.islands.keys()) {
    game.islands.set(key, 1);
  }

  game.bridges.set('0,0-0,1', 1);
  game.bridges.set('3,3-3,4', 1);

  // Числа выполнены, но сеть разделена на две группы.
  assert.equal(game.isConnected(), false);
  assert.equal(game.checkVictory(), false);
});

test('мост к несуществующему острову делает состояние недопустимым', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.bridges.set('0,0-0,1', 1);

  assert.equal(game.isConnected(), false);
  assert.equal(game.checkVictory(), false);
});

test('нельзя выиграть с кратностью больше максимума', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.bridges.set('0,0-0,2', game.maxBridgeCount + 1);

  assert.equal(game.isConnected(), false);
  assert.equal(game.checkVictory(), false);
});

test('три моста между островами недопустимы', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.islands.set('0,0', 3);
  game.islands.set('0,2', 3);
  game.bridges.set('0,0-0,2', 3);

  assert.equal(game.isConnected(), false);
  assert.equal(game.checkVictory(), false);
});

test('запрос кратности больше двух ограничивается двумя', () => {
  const game = new BridgesGameLogic(5, {
    maxBridgeCount: 4
  });

  assert.equal(game.maxBridgeCount, 2);

  game.islands.set('0,0', 2);
  game.islands.set('0,2', 2);

  for (let count = 1; count <= 2; count++) {
    assert.equal(game.addBridge([0, 0], [0, 2]), true);
    assert.equal(game.bridges.get('0,0-0,2'), count);
  }

  assert.equal(game.addBridge([0, 0], [0, 2]), true);
  assert.equal(game.bridges.has('0,0-0,2'), false);
});

test('солвер поддерживает двойные мосты', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.islands.set('0,0', 2);
  game.islands.set('0,2', 2);

  assert.equal(game.solutionChecker.countSolutions(2), 1);
});

test('цепочка из трёх островов с двойными мостами имеет одно решение', () => {
  const game = createGame(5, [[0, 0], [0, 2], [0, 4]]);

  game.islands.set('0,0', 2);
  game.islands.set('0,2', 4);
  game.islands.set('0,4', 2);

  game.bridges.set('0,0-0,2', 2);
  game.bridges.set('0,2-0,4', 2);

  assert.equal(game.checkVictory(), true);
  assert.equal(game.solutionChecker.countSolutions(2), 1);
});

test('неверное число на острове не даёт победу', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.islands.set('0,0', 0);
  game.islands.set('0,2', 0);

  assert.equal(game.checkVictory(), false);
});

test('мост через промежуточный остров не даёт победу', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 1],
    [0, 2]
  ]);

  game.bridges.set('0,0-0,2', 1);

  assert.equal(game.checkVictory(), false);
});


test('два горизонтальных моста не считаются пересечением', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 2],
    [2, 0],
    [2, 2]
  ]);

  game.bridges.set('0,0-0,2', 1);

  assert.equal(
    game.checkIntersections([2, 0], [2, 2]),
    false
  );
});

test('два вертикальных моста не считаются пересечением', () => {
  const game = createGame(5, [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2]
  ]);

  game.bridges.set('0,0-2,0', 1);

  assert.equal(
    game.checkIntersections([0, 2], [2, 2]),
    false
  );
});

test('мосты с общим островом не считаются пересечением', () => {
  const game = createGame(5, [
    [1, 0],
    [1, 2],
    [0, 2]
  ]);

  game.bridges.set('1,0-1,2', 1);

  assert.equal(
    game.checkIntersections([1, 2], [0, 2]),
    false
  );
});

test('пересечение горизонтального и вертикального моста запрещено', () => {
  const game = createGame(5, [
    [0, 1],
    [2, 1],
    [1, 0],
    [1, 2]
  ]);

  game.bridges.set('0,1-2,1', 1);

  assert.equal(
    game.checkIntersections([1, 0], [1, 2]),
    true
  );
});

test('мосты, которые только касаются концами, не считаются пересечением', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 2],
    [2, 2]
  ]);

  game.bridges.set('0,0-0,2', 1);

  assert.equal(
    game.checkIntersections([0, 2], [2, 2]),
    false
  );
});

test('удаление удаляет именно указанный мост', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 2],
    [2, 0]
  ]);

  game.bridges.set('0,0-0,2', 1);
  game.bridges.set('0,0-2,0', 1);

  assert.equal(
    game.removeBridge([0, 0], [0, 2]),
    true
  );

  assert.equal(
    game.bridges.has('0,0-0,2'),
    false
  );

  assert.equal(
    game.bridges.has('0,0-2,0'),
    true
  );
});

test('удаление отсутствующего моста ничего не меняет', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 2]
  ]);

  assert.equal(
    game.removeBridge([0, 0], [0, 2]),
    false
  );

  assert.equal(game.bridges.size, 0);
});

test('areIslandsNeighbors не считает остров соседом самого себя', () => {
  const game = new BridgesGameLogic(7);

  game.islands.set('2,2', 1);

  assert.equal(
    game.areIslandsNeighbors([2, 2], [2, 2]),
    false
  );
});

test('areIslandsNeighbors не считает отсутствующий остров соседом', () => {
  const game = new BridgesGameLogic(7);

  game.islands.set('2,2', 1);

  assert.equal(
    game.areIslandsNeighbors([2, 2], [2, 5]),
    false
  );
});

test('индекс мостов обновляется при прямой работе с Map', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 2],
    [2, 0]
  ]);

  game.islands.set('0,0', 3);
  game.islands.set('0,2', 1);
  game.islands.set('2,0', 1);

  // Тесты и внешний код могут менять Map напрямую — индекс должен
  // оставаться актуальным и в этом случае.
  game.bridges.set('0,0-0,2', 2);
  game.bridges.set('0,0-2,0', 1);

  assert.equal(game.getIslandBridgesCount([0, 0]), 3);
  assert.equal(game.getIslandBridgesCount([0, 2]), 2);
  assert.equal(game.getIslandBridgesCount([2, 0]), 1);

  game.bridges.delete('0,0-0,2');

  assert.equal(game.getIslandBridgesCount([0, 0]), 1);
  assert.equal(game.getIslandBridgesCount([0, 2]), 0);

  game.bridges.clear();

  assert.equal(game.getIslandBridgesCount([0, 0]), 0);
});

test('countSolutionsForIslands не меняет состояние игры', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.islands.set('0,0', 1);
  game.islands.set('0,2', 1);

  const islandsBefore = game.islands;
  const bridgesBefore = game.bridges;

  game.bridges.set('0,0-0,2', 1);

  const snapshot = new Map(game.islands);
  const count = game.solutionChecker.countSolutionsForIslands(
    snapshot,
    2
  );

  assert.equal(count, 1);
  assert.equal(game.islands, islandsBefore);
  assert.equal(game.bridges, bridgesBefore);
  assert.equal(game.bridges.get('0,0-0,2'), 1);
});

test('expandLevel добавляет острова и сохраняет единственность решения', () => {
  const game = new BridgesGameLogic(5);

  game.islands.set('1,1', 1);
  game.islands.set('1,3', 2);
  game.islands.set('3,3', 1);

  game.bridges.set('1,1-1,3', 1);
  game.bridges.set('1,3-3,3', 1);

  assert.equal(game.checkVictory(), true);

  const ok = game.expandLevel({
    growth: 2,
    addIslands: 2,
    doubleChance: 0
  });

  assert.equal(ok, true);
  assert.equal(game.gridSize, 7);
  assert.equal(game.islands.size, 5);

  // Старые мосты игрока остаются на месте.
  assert.equal(game.bridges.size, 2);
  assert.equal(game.bridges.get('2,2-2,4'), 1);
  assert.equal(game.bridges.get('2,4-4,4'), 1);

  // Расширенная карта должна иметь ровно одно решение.
  assert.equal(
    game.solutionChecker.countSolutionsForIslands(
      new Map(game.islands),
      2
    ),
    1
  );

  for (const target of game.islands.values()) {
    assert.equal(Number.isInteger(target) && target >= 1 && target <= 8, true);
  }
});

test('кластеры без возможной связи сразу отклоняются', () => {
  const game = createGame(5, [
    [0, 0],
    [0, 2],
    [4, 4]
  ]);

  game.islands.set('0,0', 1);
  game.islands.set('0,2', 1);
  game.islands.set('4,4', 1);

  // Между (0,0)-(0,2) есть ребро, но (4,4) изолирован:
  // связного решения быть не может, полный перебор не нужен.
  assert.equal(game.solutionChecker.countSolutions(2), 0);
});