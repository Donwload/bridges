/*
 * Регрессия выноса генерации в Web Worker: протокол сообщений, клиент
 * с запасным синхронным путём и приём готового расширения логикой.
 *
 * Настоящий Worker в Node недоступен, поэтому клиент проверяется на
 * подставном воркере с тем же интерфейсом (postMessage / onmessage /
 * onerror / terminate).
 *
 * Запуск: node --test tests/*.test.cjs
 * (или отдельно: node --test tests/generator3d.test.cjs)
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const Generator = require("../logic3d/generator.js");
const S = require("../logic3d/spike.js");
const { BridgesLogic3D } = require("../logic3d/game.js");

const SMALL = { size: 3, minIslands: 6, maxIslands: 8 };

const islandKeys = (board) => Array.from(board.islands.keys()).sort();

const countOf = (entry) => (typeof entry === "number" ? entry : entry.count);

// Подставной Worker: запоминает сообщения и отвечает, когда попросят.
class FakeWorker {
  constructor() {
    this.posted = [];
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
  }

  postMessage(message) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  reply(data) {
    if (this.onmessage) this.onmessage({ data });
  }

  replyLast(extra) {
    const last = this.posted[this.posted.length - 1];

    this.reply(Object.assign({ id: last.id, ok: true, result: null }, extra));
  }

  crash() {
    if (this.onerror) this.onerror({ message: "worker crashed" });
  }
}

const makeClient = (worker, extra) =>
  new Generator(Object.assign({ workerFactory: worker ? () => worker : null }, extra));

// Решённая карта: мосты из решения применены к логике.
function makeSolved(seed, options) {
  const board = Generator.generateBoard(Object.assign({ seed }, options || SMALL));
  const logic = new BridgesLogic3D(board.islands, 2, board.size);

  for (const [edgeKey, entry] of board.solution) {
    const ends = S.parseEdgeKey3d(edgeKey);

    for (let i = 0; i < countOf(entry); i++) {
      logic.cycleBridge(ends[0], ends[1]);
    }
  }

  return { board, logic };
}

// ---------- протокол ----------

test("воркер: generate отдаёт поле с единственным решением", () => {
  const response = Generator.handleRequest({
    id: 7,
    type: "generate",
    options: Object.assign({ seed: 11 }, SMALL)
  });

  assert.equal(response.id, 7);
  assert.equal(response.ok, true);
  assert.ok(response.result, "поле найдено");

  const board = response.result;

  assert.equal(board.size, 3);
  assert.ok(board.islands.size >= SMALL.minIslands);

  const solver = new S.Solver3D(new Map(board.islands), 2);

  assert.equal(solver.countSolutions(2), 1);
});

test("воркер: одинаковый seed даёт одинаковое поле", () => {
  const request = () => ({
    id: 1,
    type: "generate",
    options: Object.assign({ seed: 123456 }, SMALL)
  });

  const first = Generator.handleRequest(request());
  const second = Generator.handleRequest(request());

  assert.deepEqual(islandKeys(first.result), islandKeys(second.result));

  const other = Generator.handleRequest({
    id: 2,
    type: "generate",
    options: Object.assign({ seed: 999 }, SMALL)
  });

  assert.notDeepEqual(islandKeys(other.result), islandKeys(first.result));
});

test("воркер: невозможный заказ и мусор не роняют обработчик", () => {
  const empty = Generator.handleRequest({
    id: 3,
    type: "generate",
    options: { size: 3, minIslands: 20, maxIslands: 20, seed: 5, tries: 1 }
  });

  assert.equal(empty.ok, true);
  assert.equal(empty.result, null, "поле не нашлось — это не ошибка протокола");

  const unknown = Generator.handleRequest({ id: 4, type: "телепорт" });

  assert.equal(unknown.ok, false);
  assert.equal(unknown.id, 4);
  assert.match(unknown.error, /Неизвестный тип/);

  const junk = Generator.handleRequest(null);

  assert.equal(junk.ok, false);
  assert.match(junk.error, /Пустой запрос/);
});

test("воркер: expand двигает карту, а логика принимает результат", () => {
  const { logic } = makeSolved(21);
  const snapshot = logic.boardSnapshot();
  const oldIslands = snapshot.islands.size;
  const oldBridges = snapshot.bridges.size;
  const response = Generator.handleRequest({
    id: 9,
    type: "expand",
    board: snapshot,
    options: {
      seed: 77,
      maxBridgeCount: 2,
      plans: [{ growth: 2, addIslands: 2 }]
    }
  });

  assert.equal(response.ok, true);
  assert.ok(response.result, "расширение удалось");

  const board = response.result;

  assert.equal(board.size, snapshot.size + 2);
  assert.ok(board.islands.size > oldIslands);
  assert.equal(board.added.length, 2);
  assert.equal(board.bridges.size, oldBridges, "старые мосты сохранены");

  assert.equal(logic.applyExpansion(board), true);
  assert.equal(logic.size, board.size);
  assert.equal(logic.islandKeys.length, board.islands.size);
  assert.equal(logic.bridges.size, oldBridges);
});

test("логика: applyExpansion не двигает непройденную карту", () => {
  const { logic } = makeSolved(31);
  const board = logic.boardSnapshot();
  const expanded = Generator.expandBoard(board, {
    seed: 5,
    maxBridgeCount: 2,
    plans: [{ growth: 2, addIslands: 2 }]
  });

  assert.ok(expanded);

  // Снимаем один мост — карта перестаёт быть решённой.
  const [edgeKey] = Array.from(logic.bridges.keys());
  const ends = S.parseEdgeKey3d(edgeKey);

  while (logic.getMultiplicity(ends[0], ends[1]) > 0) {
    logic.cycleBridge(ends[0], ends[1]);
  }

  assert.equal(logic.isSolved(), false);
  assert.equal(logic.applyExpansion(expanded), false, "партия ещё не решена");
  assert.equal(logic.size, board.size, "размер не изменился");

  assert.equal(logic.applyExpansion(null), false);
  assert.equal(logic.applyExpansion({ size: 5 }), false);
  assert.equal(
    logic.applyExpansion({ size: 1, islands: new Map(), bridges: new Map() }),
    false
  );
});

// ---------- клиент ----------

test("клиент: без Worker считает синхронно и не падает", async () => {
  const client = makeClient(null);

  assert.equal(client.hasWorker, false);

  const board = await client.generate(Object.assign({ seed: 3 }, SMALL));

  assert.ok(board);
  assert.ok(board.islands.size >= SMALL.minIslands);
});

test("клиент: запрос уходит в Worker и возвращается ответом", async () => {
  const worker = new FakeWorker();
  const client = makeClient(worker);

  assert.equal(client.hasWorker, true);

  const promise = client.generate(Object.assign({ seed: 41 }, SMALL));

  assert.equal(worker.posted.length, 1);

  const message = worker.posted[0];

  assert.equal(message.type, "generate");
  assert.equal(message.options.seed, 41);
  assert.equal(typeof message.id, "number");

  const board = Generator.generateBoard(Object.assign({ seed: 41 }, SMALL));

  worker.reply({ id: message.id, ok: true, result: board });

  const result = await promise;

  assert.equal(result, board);

  client.dispose();
});

test("клиент: ошибка Worker уводит на синхронный путь", async () => {
  const worker = new FakeWorker();
  const client = makeClient(worker);
  const promise = client.generate(Object.assign({ seed: 51 }, SMALL));

  worker.replyLast({ ok: false, error: "внутри воркера всё сломалось" });

  const board = await promise;

  assert.ok(board, "клиент посчитал поле сам");
  assert.ok(board.islands.size >= SMALL.minIslands);

  client.dispose();
});

test("клиент: молчание Worker тоже заканчивается полем", async () => {
  const worker = new FakeWorker();
  const client = makeClient(worker, { timeoutMs: 20 });

  const started = Date.now();
  const board = await client.generate(Object.assign({ seed: 61 }, SMALL));

  assert.ok(board);
  assert.ok(Date.now() - started < 2000, "ожидание ограничено таймаутом");

  client.dispose();
});

test("клиент: падение Worker отбрасывает ожидание и уходит на запасной путь", async () => {
  const worker = new FakeWorker();
  const client = makeClient(worker);

  assert.equal(client.hasWorker, true);

  const pending = client.generate(Object.assign({ seed: 71 }, SMALL));

  worker.crash();

  const board = await pending;

  assert.ok(board);
  assert.equal(client.hasWorker, false, "воркер отключён");
  assert.equal(worker.terminated, true);

  // Следующий запрос уже не пытается говорить с мёртвым воркером.
  const again = await client.generate(Object.assign({ seed: 72 }, SMALL));

  assert.ok(again);
  assert.equal(worker.posted.length, 1);
});

test("клиент: expand возвращает расширение или null без падения", async () => {
  const worker = new FakeWorker();
  const client = makeClient(worker);
  const { logic } = makeSolved(81);

  const promise = client.expand(logic.boardSnapshot(), {
    seed: 5,
    plans: [{ growth: 2, addIslands: 2 }]
  });

  const message = worker.posted[0];

  assert.equal(message.type, "expand");
  assert.ok(message.board.islands instanceof Map);

  const expanded = Generator.expandBoard(message.board, {
    seed: 5,
    maxBridgeCount: 2,
    plans: [{ growth: 2, addIslands: 2 }]
  });

  worker.reply({ id: message.id, ok: true, result: expanded });

  const result = await promise;

  assert.ok(result);
  assert.equal(result.size, 5);

  // Неудача (null) — это не ошибка: клиент возвращает null и не падает.
  const empty = client.expand(logic.boardSnapshot(), { seed: 5 });

  worker.replyLast({ result: null });

  assert.equal(await empty, null);

  client.dispose();
});

test("клиент: dispose завершает воркер и снимает ожидание", async () => {
  const worker = new FakeWorker();
  const client = makeClient(worker);
  const pending = client.generate(Object.assign({ seed: 91 }, SMALL));

  client.dispose();

  assert.equal(worker.terminated, true);
  assert.equal(client.hasWorker, false);

  const board = await pending;

  assert.ok(board, "обещание разрешилось запасным путём");
});
