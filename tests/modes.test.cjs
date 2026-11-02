/*
 * Регрессия режимов 2D: нормализация настроек, профили фиксированных
 * карт и сохранение выбора в localStorage.
 *
 * Запуск: node --test tests/*.test.cjs
 * (или отдельно: node --test tests/modes.test.cjs)
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const Modes = require("../renderer/modes.js");

function createStorage(initial = null) {
  const values = new Map();

  if (initial !== null) {
    values.set(Modes.STORAGE_KEY, initial);
  }

  return {
    values,
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

test("режимы и сложности нормализуются к допустимым значениям", () => {
  assert.equal(Modes.normalizeMode("fixed"), "fixed");
  assert.equal(Modes.normalizeMode("expand"), "expand");
  assert.equal(Modes.normalizeMode("каша"), "expand");
  assert.equal(Modes.normalizeMode(null), "expand");

  assert.equal(Modes.normalizeDifficulty("easy"), "easy");
  assert.equal(Modes.normalizeDifficulty("hard"), "hard");
  assert.equal(Modes.normalizeDifficulty("ужас"), "medium");
  assert.equal(Modes.normalizeDifficulty(undefined), "medium");

  assert.equal(Modes.normalizeSize(7), 7);
  assert.equal(Modes.normalizeSize("25"), 25);
  assert.equal(Modes.normalizeSize(11), 10);
  assert.equal(Modes.normalizeSize(null), 10);
});

test("normalizeSettings отбрасывает лишние поля и чинит испорченные", () => {
  assert.deepEqual(Modes.normalizeSettings(null), {
    mode: "expand",
    difficulty: "medium",
    size: 10
  });

  assert.deepEqual(
    Modes.normalizeSettings({
      mode: "fixed",
      difficulty: "hard",
      size: "15",
      extra: true
    }),
    { mode: "fixed", difficulty: "hard", size: 15 }
  );

  assert.deepEqual(
    Modes.normalizeSettings({
      mode: "fixed",
      difficulty: "нет",
      size: 3
    }),
    { mode: "fixed", difficulty: "medium", size: 10 }
  );
});

test("профили фиксированных карт покрывают все размеры и сложности", () => {
  for (const size of Modes.SIZES) {
    for (const difficulty of Modes.DIFFICULTIES) {
      const profile = Modes.fixedProfile(difficulty, size);

      assert.equal(profile.gridSize, size);
      assert.ok(profile.minIslands > 0);
      assert.ok(profile.maxIslands >= profile.minIslands);
      assert.ok(profile.doubleChance >= 0 && profile.doubleChance <= 1);
      assert.ok(
        profile.maxIslands < size * size,
        `островов не должно быть больше клеток: ${size}×${size}`
      );
    }
  }
});

test("сложность повышает плотность и долю двойных мостов", () => {
  for (const size of Modes.SIZES) {
    const easy = Modes.fixedProfile("easy", size);
    const medium = Modes.fixedProfile("medium", size);
    const hard = Modes.fixedProfile("hard", size);

    assert.ok(easy.maxIslands <= medium.maxIslands);
    assert.ok(medium.maxIslands <= hard.maxIslands);

    assert.ok(easy.doubleChance < medium.doubleChance);
    assert.ok(medium.doubleChance < hard.doubleChance);
  }
});

test("сложная карта заметно плотнее простой", () => {
  for (const size of Modes.SIZES) {
    const easy = Modes.fixedProfile("easy", size);
    const hard = Modes.fixedProfile("hard", size);

    // Плотность «сложной» должна быть выше, а не на пару островов:
    // иначе получается карта на 20 мостов, где нечего решать.
    assert.ok(
      hard.minIslands > easy.maxIslands,
      `сложная ${size}×${size} должна быть плотнее простой`
    );

    // Почти все связи двойные — это и даёт «много мостов».
    assert.ok(hard.doubleChance >= 0.85);
  }

  // На 25×25 «сложная» рассыпает острова по всему полю:
  // 200–250 островов и ~500–670 мостов, без полных линий.
  const hard25 = Modes.fixedProfile("hard", 25);
  assert.ok(hard25.minIslands >= 200);
  assert.equal(hard25.maxIslands, 250);
  assert.equal(hard25.dense, true);
  assert.ok(hard25.defectChance > 0 && hard25.defectChance < 1);
  assert.equal(hard25.doubleChance, 0.9);
});

test("средняя карта использует плотную раскладку", () => {
  for (const size of Modes.SIZES) {
    const medium = Modes.fixedProfile("medium", size);
    const easy = Modes.fixedProfile("easy", size);

    assert.equal(medium.dense, true);
    assert.ok(medium.defectChance > 0 && medium.defectChance < 1);

    // «Средняя» заметно плотнее «простой», а не на пару островов.
    assert.ok(
      medium.minIslands > easy.maxIslands,
      `средняя ${size}×${size} должна быть плотнее простой`
    );
  }

  // На 25×25 «средняя» — 70–90 островов и ~120–230 мостов,
  // а не прежние ~35 мостов на разреженном поле.
  const medium25 = Modes.fixedProfile("medium", 25);

  assert.ok(medium25.minIslands >= 70);
  assert.ok(medium25.maxIslands >= 90);
});

test("фиксированный профиль не зависит от порядка аргументов", () => {
  assert.deepEqual(
    Modes.fixedProfile("hard", 25),
    Modes.fixedProfile("hard", "25")
  );

  assert.equal(Modes.fixedProfile("hard", 25).gridSize, 25);
  assert.equal(Modes.fixedProfile("hard", 25).maxIslands, 250);
});

test("подписи режима и сложности читаются человеком", () => {
  assert.equal(Modes.modeLabel("expand"), "Расширяющийся мир");
  assert.equal(Modes.modeLabel("fixed"), "Фиксированная карта");
  assert.equal(Modes.difficultyLabel("easy"), "простая");
  assert.equal(Modes.difficultyLabel("medium"), "средняя");
  assert.equal(Modes.difficultyLabel("hard"), "сложная");

  assert.equal(
    Modes.shortLabel({ mode: "fixed", difficulty: "hard", size: 15 }),
    "15×15 · сложная"
  );

  assert.equal(
    Modes.describe({ mode: "fixed", difficulty: "easy", size: 7 }),
    "Карта 7×7 · сложность: простая"
  );

  assert.equal(
    Modes.describe({ mode: "expand" }),
    "Расширяющийся мир"
  );
});

test("настройки сохраняются и загружаются из localStorage", () => {
  const storage = createStorage();

  assert.deepEqual(Modes.loadSettings(storage), {
    mode: "expand",
    difficulty: "medium",
    size: 10
  });

  const saved = Modes.saveSettings(
    { mode: "fixed", difficulty: "hard", size: 25 },
    storage
  );

  assert.deepEqual(saved, {
    mode: "fixed",
    difficulty: "hard",
    size: 25
  });

  assert.deepEqual(Modes.loadSettings(storage), {
    mode: "fixed",
    difficulty: "hard",
    size: 25
  });
});

test("испорченное хранилище не ломает загрузку", () => {
  const broken = createStorage("{не json");
  assert.deepEqual(Modes.loadSettings(broken), {
    mode: "expand",
    difficulty: "medium",
    size: 10
  });

  const invalid = createStorage(JSON.stringify({ mode: "fixed", size: 11 }));
  assert.deepEqual(Modes.loadSettings(invalid), {
    mode: "fixed",
    difficulty: "medium",
    size: 10
  });

  const throwing = {
    getItem() {
      throw new Error("storage disabled");
    },
    setItem() {
      throw new Error("storage disabled");
    }
  };

  assert.deepEqual(Modes.loadSettings(throwing), {
    mode: "expand",
    difficulty: "medium",
    size: 10
  });

  assert.deepEqual(
    Modes.saveSettings({ mode: "fixed", difficulty: "easy", size: 7 }, throwing),
    { mode: "fixed", difficulty: "easy", size: 7 }
  );
});
