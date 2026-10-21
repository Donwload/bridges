/*
 * Общий HUD: переключатель режимов 2D / 3D.
 *
 * Проверяются чистые части — модель переключателя, адреса страниц,
 * запоминание режима и сборка разметки на минимальной подделке DOM.
 * Настоящий DOM в Node недоступен, поэтому `document` подменяется
 * объектами с тем же небольшим набором методов.
 *
 * Запуск: node --test tests/*.test.cjs
 * (или отдельно: node --test tests/hud.test.cjs)
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const HUD = require("../hud/hud.js");

// ---------- подделки окружения ----------

function memoryStorage(seed) {
  const data = new Map(Object.entries(seed || {}));

  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
}

function useStorage(storage) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage
  });
}

function dropStorage() {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: undefined
  });
}

function fakeDocument() {
  const makeElement = (tag) => ({
    tag,
    className: "",
    textContent: "",
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    firstChild: null,
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(type, handler) {
      this.listeners[type] = this.listeners[type] || [];
      this.listeners[type].push(handler);
    },
    appendChild(child) {
      this.children.push(child);
      this.firstChild = this.children[0];

      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      this.firstChild = this.children[0] || null;
    },
    click() {
      for (const handler of this.listeners.click || []) {
        handler({ currentTarget: this, preventDefault() {} });
      }
    }
  });

  return {
    createElement: makeElement,
    body: makeElement("body"),
    querySelector: () => null
  };
}

// ---------- модель переключателя ----------

test("HUD: оба режима описаны и ведут на свои страницы", () => {
  assert.deepEqual(HUD.MODE_ORDER, ["2d", "3d"]);

  assert.equal(HUD.MODES["2d"].label, "2D");
  assert.equal(HUD.MODES["3d"].label, "3D");
  assert.equal(HUD.modeHref("2d"), "index.html");
  assert.equal(HUD.modeHref("3d"), "3d.html");

  const hrefs = HUD.MODE_ORDER.map((id) => HUD.MODES[id].href);

  assert.equal(new Set(hrefs).size, 2, "у режимов разные адреса");
  assert.equal(new Set(HUD.MODE_ORDER).size, 2);
});

test("HUD: модель помечает текущий режим и прошлую сессию", () => {
  const model = HUD.switchModel("2d", "3d");

  assert.deepEqual(
    model.map((item) => item.id),
    ["2d", "3d"],
    "порядок сегментов постоянный"
  );
  assert.equal(model[0].active, true);
  assert.equal(model[1].active, false);
  assert.equal(model[0].recent, false, "текущий режим не помечается как прошлый");
  assert.equal(model[1].recent, true, "3D — прошлая сессия");
});

test("HUD: прошлая сессия не помечается, если совпадает с текущей", () => {
  const model = HUD.switchModel("2d", "2d");

  assert.equal(model[0].active, true);
  assert.equal(model.some((item) => item.recent), false);

  const blank = HUD.switchModel("3d", null);

  assert.equal(blank[1].active, true);
  assert.equal(blank.some((item) => item.recent), false);
});

test("HUD: неизвестный режим сводится к 2D", () => {
  assert.equal(HUD.isMode("3d"), true);
  assert.equal(HUD.isMode("4d"), false);
  assert.equal(HUD.isMode(null), false);
  assert.equal(HUD.normalizeMode("4d"), "2d");
  assert.equal(HUD.modeHref("телепорт"), "index.html");

  const model = HUD.switchModel("телепорт", "мусор");

  assert.equal(model[0].active, true);
  assert.equal(model.some((item) => item.recent), false);
});

// ---------- запоминание режима ----------

test("HUD: режим запоминается и читается", () => {
  const storage = memoryStorage();

  useStorage(storage);

  assert.equal(HUD.readMode(), null, "пока ничего не выбрано");

  assert.equal(HUD.saveMode("3d"), true);
  assert.equal(HUD.readMode(), "3d");
  assert.equal(storage.data.get(HUD.MODE_KEY), "3d");

  assert.equal(HUD.saveMode("4d"), true);
  assert.equal(HUD.readMode(), "2d", "неизвестное значение нормализуется");

  dropStorage();
});

test("HUD: испорченное значение считается отсутствующим", () => {
  useStorage(memoryStorage({ "bridges-mode": "2d;3d" }));

  assert.equal(HUD.readMode(), null);

  dropStorage();
});

test("HUD: без localStorage переключатель продолжает работать", () => {
  dropStorage();

  assert.equal(HUD.readMode(), null);
  assert.equal(HUD.saveMode("3d"), false, "записать некуда — не ошибка");

  const throwing = {
    getItem() {
      throw new Error("хранилище запрещено");
    },
    setItem() {
      throw new Error("хранилище запрещено");
    },
    removeItem() {}
  };

  useStorage(throwing);

  assert.equal(HUD.readMode(), null);
  assert.equal(HUD.saveMode("3d"), false);

  dropStorage();
});

// ---------- разметка ----------

test("HUD: сборка переключателя без DOM не падает", () => {
  assert.equal(HUD.createSwitch("2d", { document: null }), null);
  assert.equal(HUD.mountSwitch("#modeSwitch", "2d"), null);
});

test("HUD: разметка содержит две ссылки и aria-current", () => {
  const doc = fakeDocument();
  const root = HUD.createSwitch("3d", { document: doc, recent: "2d" });

  assert.equal(root.className, "mode-switch");
  assert.equal(root.attributes.role, "group");
  assert.equal(root.children.length, 2);

  const [flat, voluminous] = root.children;

  assert.equal(flat.dataset.mode, "2d");
  assert.equal(flat.href, "index.html");
  assert.equal(flat.className, "mode-switch-option", "2D не активен");
  assert.equal(flat.attributes["aria-current"], undefined);
  assert.equal(flat.children.length, 2, "подпись + точка прошлой сессии");
  assert.equal(flat.children[0].className, "mode-switch-label");
  assert.equal(flat.children[0].textContent, "2D");
  assert.equal(flat.children[1].className, "mode-switch-dot");
  assert.match(flat.title, /прошлая сессия/);

  assert.equal(voluminous.dataset.mode, "3d");
  assert.equal(voluminous.href, "3d.html");
  assert.equal(voluminous.className, "mode-switch-option is-active");
  assert.equal(voluminous.attributes["aria-current"], "page");
  assert.equal(voluminous.children.length, 1, "у текущего режима точки нет");
  assert.equal(voluminous.title, "Объёмные мосты");
});

test("HUD: клик по сегменту запоминает режим", () => {
  const storage = memoryStorage();
  const doc = fakeDocument();

  useStorage(storage);

  const root = HUD.createSwitch("3d", { document: doc, recent: null });

  root.children[0].click();

  assert.equal(storage.data.get(HUD.MODE_KEY), "2d");

  root.children[1].click();

  assert.equal(storage.data.get(HUD.MODE_KEY), "3d");

  dropStorage();
});

test("HUD: переключатель ставится в контейнер и заменяет содержимое", () => {
  const doc = fakeDocument();
  const slot = doc.createElement("div");
  const stale = doc.createElement("span");

  slot.appendChild(stale);

  const first = HUD.mountSwitch(slot, "2d", { document: doc, recent: null });

  assert.ok(first);
  assert.equal(slot.children.length, 1);
  assert.equal(slot.children[0].className, "mode-switch");

  const second = HUD.mountSwitch(slot, "3d", { document: doc, recent: "2d" });

  assert.notEqual(second, first);
  assert.equal(slot.children.length, 1, "повторный вызов не плодит панели");
  assert.equal(slot.children[0].children[1].attributes["aria-current"], "page");
});

test("HUD: режим отмечается на body", () => {
  const doc = fakeDocument();

  assert.equal(HUD.applyMode("3d", doc), true);
  assert.equal(doc.body.dataset.mode, "3d");

  assert.equal(HUD.applyMode("чепуха", doc), true);
  assert.equal(doc.body.dataset.mode, "2d");

  assert.equal(HUD.applyMode("3d", null), false, "без body — просто false");
});
