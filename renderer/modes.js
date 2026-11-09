/*
 * Режимы 2D-игры и профили фиксированных карт.
 *
 * Здесь нет DOM и рисования: только чистые данные и нормализация.
 * Поэтому файл одинаково работает в браузере (window.BridgesModes2D)
 * и в тестах Node (require("./renderer/modes.js")).
 *
 * Два режима:
 *   expand — расширяющийся мир: после победы карта растёт, старые мосты
 *            остаются на месте (прежнее поведение игры);
 *   fixed  — фиксированная карта выбранного размера и сложности.
 *
 * Профили подобраны по замерам генератора: даже 25×25 «сложная»
 * укладывается примерно в секунду, поэтому отдельный Worker не нужен.
 */
(function (root) {
  "use strict";

  const STORAGE_KEY = "bridges-2d-settings";

  const MODE_EXPAND = "expand";
  const MODE_FIXED = "fixed";
  const MODES = [MODE_EXPAND, MODE_FIXED];

  const DIFFICULTIES = ["easy", "medium", "hard"];
  const SIZES = [7, 10, 15, 25];

  const MODE_LABELS = {
    [MODE_EXPAND]: "Расширяющийся мир",
    [MODE_FIXED]: "Фиксированная карта"
  };

  const DIFFICULTY_LABELS = {
    easy: "простая",
    medium: "средняя",
    hard: "сложная"
  };

  const DEFAULT_SETTINGS = {
    mode: MODE_EXPAND,
    difficulty: "medium",
    size: 10
  };

  /*
   * minIslands / maxIslands — сколько островов пытаться поставить,
   * doubleChance — номинальная вероятность двойного моста. Для плотных
   * карт фактическая доля двойных связей зависит от раскладки, поэтому
   * генератор считает её отдельно, а статус показывает реальное число.
   *
   * «Средняя» и «сложная» рассыпают острова по всему полю: карта растёт
   * от случайного острова, новые острова встают в случайных направлениях,
   * а из кандидатов выбираются самые свободные участки. «Средняя» ставит
   * в 1,5–3 раза меньше островов, чем «сложная», но так же занимает все
   * ряды и столбцы и не складывается в линии. На 25×25 «средняя» — это
   * 70–90 островов и ~120–240 мостов, «сложная» — 200–250 островов и
   * ~460–610 мостов. Плотная схема включается флагом dense;
   * defectChance — доля связей, которые случайно ослабляются, чтобы
   * карта не была полностью «всё двойное». Для «сложной» дополнительно
   * включается reduceHighTargets: генератор точечно убирает восьмёрки,
   * проверяя солвером, что единственность решения сохраняется.
   */
  const PROFILES = {
    7: {
      easy: { minIslands: 6, maxIslands: 8, doubleChance: 0.2 },
      medium: {
        minIslands: 12,
        maxIslands: 16,
        doubleChance: 0.5,
        dense: true,
        defectChance: 0.5
      },
      hard: {
        minIslands: 25,
        maxIslands: 28,
        doubleChance: 0.9,
        dense: true,
        defectChance: 0.1,
        reduceHighTargets: true
      }
    },
    10: {
      easy: { minIslands: 10, maxIslands: 13, doubleChance: 0.2 },
      medium: {
        minIslands: 22,
        maxIslands: 30,
        doubleChance: 0.5,
        dense: true,
        defectChance: 0.5
      },
      hard: {
        minIslands: 45,
        maxIslands: 50,
        doubleChance: 0.9,
        dense: true,
        defectChance: 0.1,
        reduceHighTargets: true
      }
    },
    15: {
      easy: { minIslands: 16, maxIslands: 20, doubleChance: 0.2 },
      medium: {
        minIslands: 45,
        maxIslands: 60,
        doubleChance: 0.5,
        dense: true,
        defectChance: 0.5
      },
      hard: {
        minIslands: 90,
        maxIslands: 105,
        doubleChance: 0.9,
        dense: true,
        defectChance: 0.1,
        reduceHighTargets: true
      }
    },
    25: {
      easy: { minIslands: 24, maxIslands: 30, doubleChance: 0.2 },
      medium: {
        minIslands: 70,
        maxIslands: 90,
        doubleChance: 0.5,
        dense: true,
        defectChance: 0.5
      },
      hard: {
        minIslands: 200,
        maxIslands: 250,
        doubleChance: 0.9,
        dense: true,
        defectChance: 0.1,
        reduceHighTargets: true
      }
    }
  };

  function normalizeMode(value) {
    return MODES.includes(value) ? value : DEFAULT_SETTINGS.mode;
  }

  function normalizeDifficulty(value) {
    return DIFFICULTIES.includes(value)
      ? value
      : DEFAULT_SETTINGS.difficulty;
  }

  function normalizeSize(value) {
    const size = Number(value);

    return SIZES.includes(size) ? size : DEFAULT_SETTINGS.size;
  }

  /*
   * Приводит любой вход (localStorage, черновик диалога) к валидным
   * настройкам. Лишние поля отбрасываются, испорченные — заменяются
   * значениями по умолчанию.
   */
  function normalizeSettings(raw) {
    const source = raw && typeof raw === "object" ? raw : {};

    return {
      mode: normalizeMode(source.mode),
      difficulty: normalizeDifficulty(source.difficulty),
      size: normalizeSize(source.size)
    };
  }

  /*
   * Профиль фиксированной карты. Режим expand сюда не попадает:
   * у него своя кампания и расширение.
   */
  function fixedProfile(difficulty, size) {
    const level = normalizeDifficulty(difficulty);
    const gridSize = normalizeSize(size);
    const profile = PROFILES[gridSize][level];

    return {
      gridSize,
      minIslands: profile.minIslands,
      maxIslands: profile.maxIslands,
      doubleChance: profile.doubleChance,
      dense: profile.dense === true,
      defectChance: profile.defectChance ?? 0,
      reduceHighTargets: profile.reduceHighTargets === true
    };
  }

  function modeLabel(value) {
    return MODE_LABELS[normalizeMode(value)];
  }

  function difficultyLabel(value) {
    return DIFFICULTY_LABELS[normalizeDifficulty(value)];
  }

  /*
   * Короткая подпись для кнопки в шапке.
   */
  function shortLabel(settings) {
    const normalized = normalizeSettings(settings);

    if (normalized.mode === MODE_EXPAND) {
      return "Расширение";
    }

    return (
      normalized.size +
      "×" +
      normalized.size +
      " · " +
      difficultyLabel(normalized.difficulty)
    );
  }

  /*
   * Подробная подпись для статуса и диалогов.
   */
  function describe(settings) {
    const normalized = normalizeSettings(settings);

    if (normalized.mode === MODE_EXPAND) {
      return "Расширяющийся мир";
    }

    return (
      "Карта " +
      normalized.size +
      "×" +
      normalized.size +
      " · сложность: " +
      difficultyLabel(normalized.difficulty)
    );
  }

  function readStorage(storage) {
    try {
      return storage && typeof storage.getItem === "function"
        ? storage.getItem(STORAGE_KEY)
        : null;
    } catch (error) {
      // Приватный режим и file:// могут запрещать доступ к localStorage.
      return null;
    }
  }

  function loadSettings(storage) {
    const target =
      storage ||
      (typeof localStorage !== "undefined" ? localStorage : null);
    const raw = readStorage(target);

    if (!raw) return { ...DEFAULT_SETTINGS };

    try {
      return normalizeSettings(JSON.parse(raw));
    } catch (error) {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings, storage) {
    const normalized = normalizeSettings(settings);
    const target =
      storage ||
      (typeof localStorage !== "undefined" ? localStorage : null);

    try {
      if (target && typeof target.setItem === "function") {
        target.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
    } catch (error) {
      // Сохранить не удалось — игра всё равно продолжает работать.
    }

    return normalized;
  }

  const api = {
    STORAGE_KEY,
    MODE_EXPAND,
    MODE_FIXED,
    MODES,
    DIFFICULTIES,
    SIZES,
    DEFAULT_SETTINGS,
    PROFILES,
    normalizeMode,
    normalizeDifficulty,
    normalizeSize,
    normalizeSettings,
    fixedProfile,
    modeLabel,
    difficultyLabel,
    shortLabel,
    describe,
    loadSettings,
    saveSettings
  };

  root.BridgesModes2D = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
