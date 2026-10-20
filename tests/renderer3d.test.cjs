/*
 * Регрессия 3D-рендера: скины (палитры, сохранение, названия) и эффекты
 * (искры, конфетти, фоновый слой). 2D-набор живёт отдельно в
 * tests/logic.test.cjs и не трогается.
 *
 * WebGL здесь не нужен: симуляция частиц отделена от рисования.
 *
 * Запуск: node --test tests/*.test.cjs
 * (или отдельно: node --test tests/renderer3d.test.cjs)
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const Skins = require("../renderer3d/skins.js");
const Effects = require("../renderer3d/effects3d.js");

const { mulberry32 } = require("../logic3d/spike.js");

const { BRIDGE_SKINS_3D, PALETTE_KEYS, AMBIENT_KINDS } = Skins;

const isColor = (value) =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((c) => Number.isFinite(c) && c >= 0 && c <= 1);

test("скины: у каждого есть id, имя, описание и полная палитра", () => {
  const ids = Skins.listSkinIds3D();

  assert.ok(ids.length >= 3, "ожидаем минимум три скина");
  assert.equal(new Set(ids).size, ids.length, "id скинов уникальны");

  for (const id of ids) {
    const skin = BRIDGE_SKINS_3D[id];

    assert.equal(typeof skin.name, "string");
    assert.ok(skin.name.length > 0, id + ": пустое имя");
    assert.equal(typeof skin.description, "string");
    assert.ok(skin.description.length > 0, id + ": пустое описание");

    for (const key of PALETTE_KEYS) {
      assert.ok(
        Object.prototype.hasOwnProperty.call(skin.palette, key),
        id + ": нет ключа палитры " + key
      );
    }
  }
});

test("скины: все цвета палитры — тройки в диапазоне 0..1", () => {
  for (const id of Skins.listSkinIds3D()) {
    const skin = BRIDGE_SKINS_3D[id];

    for (const key of PALETTE_KEYS) {
      assert.ok(isColor(skin.palette[key]), id + "." + key + ": плохой цвет");
    }

    assert.ok(Array.isArray(skin.confetti) && skin.confetti.length > 0);
    for (const color of skin.confetti) {
      assert.ok(isColor(color), id + ": плохой цвет конфетти");
    }

    if (skin.islandVariants) {
      assert.ok(skin.islandVariants.length > 0);

      for (const color of skin.islandVariants) {
        assert.ok(isColor(color), id + ": плохой биом острова");
      }
    }
  }
});

test("скины: неизвестный id откатывается к дефолтному", () => {
  const fallback = Skins.getSkin3D("нет-такого-скина");

  assert.equal(fallback, BRIDGE_SKINS_3D[Skins.DEFAULT_SKIN_3D]);
  assert.equal(Skins.isSkin3D(Skins.DEFAULT_SKIN_3D), true);
  assert.equal(Skins.isSkin3D("нет-такого-скина"), false);
  assert.equal(Skins.isSkin3D("constructor"), false, "прототип не считается скином");
});

test("скины: фоновый слой соответствует скину", () => {
  for (const id of Skins.listSkinIds3D()) {
    assert.ok(
      AMBIENT_KINDS.includes(BRIDGE_SKINS_3D[id].ambient),
      id + ": неизвестный ambient"
    );
  }

  assert.equal(BRIDGE_SKINS_3D.default.ambient, "none");
  assert.equal(BRIDGE_SKINS_3D.night.ambient, "fireflies");
  assert.equal(BRIDGE_SKINS_3D.experimental.ambient, "pollen");
});

test("скины: toFloatPalette отдаёт Float32Array с теми же числами", () => {
  const skin = BRIDGE_SKINS_3D.night;
  const palette = Skins.toFloatPalette(skin);

  for (const key of PALETTE_KEYS) {
    assert.ok(palette[key] instanceof Float32Array, key + ": не Float32Array");
    assert.equal(palette[key].length, 3);

    const source = skin.palette[key];
    assert.equal(palette[key][0], Math.fround(source[0]));
    assert.equal(palette[key][1], Math.fround(source[1]));
    assert.equal(palette[key][2], Math.fround(source[2]));
  }

  // Кривая палитра не должна ронять рендер.
  const broken = Skins.toFloatPalette({ palette: { island: [2, -1, 0.5] } });

  assert.ok(broken.background instanceof Float32Array);
  assert.equal(broken.island[0], Math.fround(2));
});

test("скины: выбор сохраняется, а сбои localStorage не ломают игру", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

  const install = (value) => {
    Object.defineProperty(globalThis, "localStorage", {
      value,
      configurable: true,
      writable: true
    });
  };

  try {
    // Хранилище недоступно: тихо откатываемся к дефолту.
    install({
      getItem() {
        throw new Error("storage disabled");
      },
      setItem() {
        throw new Error("storage disabled");
      }
    });

    assert.equal(Skins.readSavedSkin3D(), Skins.DEFAULT_SKIN_3D);
    assert.equal(Skins.saveSkin3D("night"), false);

    const store = new Map();

    install({
      getItem: (key) => (store.has(key) ? store.get(key) : null),
      setItem: (key, value) => store.set(key, String(value))
    });

    assert.equal(Skins.saveSkin3D("night"), true);
    assert.equal(store.get(Skins.SKIN_STORAGE_KEY), "night");
    assert.equal(Skins.readSavedSkin3D(), "night");

    // Неизвестный id в хранилище — не повод падать.
    store.set(Skins.SKIN_STORAGE_KEY, "мусор");
    assert.equal(Skins.readSavedSkin3D(), Skins.DEFAULT_SKIN_3D);

    install(null);
    assert.equal(Skins.readSavedSkin3D(), Skins.DEFAULT_SKIN_3D);
    assert.equal(Skins.saveSkin3D("night"), false);
  } finally {
    if (descriptor) {
      Object.defineProperty(globalThis, "localStorage", descriptor);
    } else {
      delete globalThis.localStorage;
    }
  }
});

// ---------- эффекты ----------

const makeEffects = (seed = 1) => new Effects({ rng: mulberry32(seed) });

test("эффекты: конфетти запускается один раз и не превышает лимит", () => {
  const effects = makeEffects(7);
  const first = effects.startConfetti([0, 0, 0], 2);

  assert.equal(first, Effects.LIMITS.MAX_CONFETTI);
  assert.equal(effects.confetti.length, Effects.LIMITS.MAX_CONFETTI);

  const second = effects.startConfetti([0, 0, 0], 2);

  assert.equal(second, 0, "повторный залп не добавляет частиц");
  assert.equal(effects.confetti.length, Effects.LIMITS.MAX_CONFETTI);

  const allowed = new Set(
    BRIDGE_SKINS_3D.default.confetti.map((color) => color.join(","))
  );

  for (const flake of effects.confetti) {
    assert.ok(isColor(flake.color), "цвет щепки");
    assert.ok(allowed.has(flake.color.join(",")), "цвет из палитры скина");
    assert.ok(flake.maxLife > 0);
    assert.ok(flake.y > flake.floor);
  }
});

test("эффекты: конфетти живёт ограниченное время и падает вниз", () => {
  const effects = makeEffects(11);

  effects.startConfetti([0, 0, 0], 1);

  const startY = effects.confetti.map((flake) => flake.y);
  const startLife = effects.confetti[0].life;

  effects.update(1 / 60);

  assert.ok(effects.confetti[0].life > startLife, "время идёт");
  assert.notEqual(effects.confetti[0].y, startY[0], "частица движется");

  // Полминуты кадров — от залпа не должно остаться ничего.
  for (let i = 0; i < 1800; i++) effects.update(1 / 60);

  assert.equal(effects.confetti.length, 0);
  assert.equal(effects.counts().confetti, 0);
});

test("эффекты: искры только над собранными островами и не больше лимита", () => {
  const effects = makeEffects(3);
  const world = [0, 0, 0];

  assert.equal(effects.maybeSpawnSparkle(world, false, 1), false);
  assert.equal(effects.sparkles.length, 0);

  assert.equal(effects.maybeSpawnSparkle(world, true, 1), true);
  assert.equal(effects.sparkles.length, 1);

  const sparkle = effects.sparkles[0];

  assert.ok(sparkle.maxLife > 0);
  assert.ok(sparkle.size > 0);
  assert.ok(sparkle.y > world[1], "искра появляется над центром острова");

  for (let i = 0; i < Effects.LIMITS.MAX_SPARKLES * 4; i++) {
    effects.maybeSpawnSparkle(world, true, 1);
  }

  assert.equal(effects.sparkles.length, Effects.LIMITS.MAX_SPARKLES);

  // Искры поднимаются вверх и исчезают.
  const beforeY = effects.sparkles[0].y;

  effects.update(1 / 60);
  assert.ok(effects.sparkles[0].y > beforeY, "искра поднимается");

  for (let i = 0; i < 400; i++) effects.update(1 / 60);

  assert.equal(effects.sparkles.length, 0);
});

test("эффекты: фоновый слой включается по скину и сбрасывается", () => {
  const effects = makeEffects(5);

  assert.equal(effects.syncAmbient("none", [0, 0, 0], 2), 0);

  const fireflies = effects.syncAmbient("fireflies", [0, 0, 0], 2);

  assert.equal(fireflies, Effects.AMBIENT_COUNT.fireflies);
  assert.ok(fireflies <= Effects.LIMITS.MAX_AMBIENT);
  assert.equal(effects.ambientKind, "fireflies");

  // Повторный вызов с тем же скином не пересобирает частицы.
  const before = effects.ambient.map((particle) => particle.phase);
  effects.syncAmbient("fireflies", [1, 1, 1], 3);

  assert.deepEqual(
    effects.ambient.map((particle) => particle.phase),
    before
  );
  assert.deepEqual(effects.ambientCenter, [1, 1, 1]);
  assert.equal(effects.ambientExtent, 3);

  const pollen = effects.syncAmbient("pollen", [0, 0, 0], 2);

  assert.equal(pollen, Effects.AMBIENT_COUNT.pollen);
  assert.equal(effects.ambient.length, pollen);

  for (const particle of effects.ambient) {
    assert.ok(particle.size > 0);
    assert.ok(particle.alpha > 0 && particle.alpha <= 1);
  }

  effects.reset();

  assert.equal(effects.ambient.length, 0);
  assert.equal(effects.ambientKind, "none");
  assert.equal(effects.confettiStarted, false);
});

test("эффекты: цвета берутся из скина, шаг не зависит от частоты кадров", () => {
  const effects = makeEffects(9);

  effects.setLook(Skins.toFloatPalette(BRIDGE_SKINS_3D.night), BRIDGE_SKINS_3D.night.confetti);
  effects.startConfetti([0, 0, 0], 1);

  const nightColors = new Set(
    BRIDGE_SKINS_3D.night.confetti.map((color) => color.join(","))
  );

  for (const flake of effects.confetti) {
    assert.ok(nightColors.has(flake.color.join(",")));
  }

  const slow = makeEffects(2);
  const fast = makeEffects(2);

  slow.startConfetti([0, 0, 0], 1);
  fast.startConfetti([0, 0, 0], 1);

  slow.update(1 / 30);
  fast.update(1 / 60);

  // Один кадр при 30 Гц = два шага при 60 Гц.
  assert.ok(Math.abs(slow.step - 2) < 1e-9);
  assert.ok(Math.abs(fast.step - 1) < 1e-9);
  assert.ok(Math.abs(slow.confetti[0].life - 2) < 1e-9);

  // Огромная дельта после паузы вкладки не разгоняет частицы бесконечно.
  const paused = makeEffects(2);

  paused.startConfetti([0, 0, 0], 1);
  assert.equal(paused.update(5), 3);
});

test("эффекты: детерминированность при одинаковом seed", () => {
  const a = makeEffects(42);
  const b = makeEffects(42);

  a.startConfetti([0, 0, 0], 2);
  b.startConfetti([0, 0, 0], 2);

  assert.deepEqual(
    a.confetti.map((flake) => [flake.x, flake.y, flake.z, flake.color]),
    b.confetti.map((flake) => [flake.x, flake.y, flake.z, flake.color])
  );

  const c = makeEffects(43);

  c.startConfetti([0, 0, 0], 2);
  assert.notDeepEqual(c.confetti[0].x, a.confetti[0].x);
});
