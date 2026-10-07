const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '..', 'logic.js'),
  'utf8'
);

const context = vm.createContext({});
vm.runInContext(
  source + '\nthis.BridgesGameLogic = BridgesGameLogic;',
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

test('создание одного и двух мостов, затем удаление', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  assert.equal(game.addBridge([0, 0], [0, 2]), true);
  assert.equal(game.bridges.get('0,0-0,2'), 1);

  assert.equal(game.addBridge([0, 0], [0, 2]), true);
  assert.equal(game.bridges.get('0,0-0,2'), 2);

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

test('нельзя выиграть с тремя мостами между островами', () => {
  const game = createGame(5, [[0, 0], [0, 2]]);

  game.bridges.set('0,0-0,2', 3);

  assert.equal(game.isConnected(), false);
  assert.equal(game.checkVictory(), false);
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