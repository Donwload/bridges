/*
 * Скины 3D-режима: палитры сцены, названия, описания и сохранение выбора.
 *
 * Ключи палитры ровно те, что рисует renderer3d/game3d.js: фон, острова
 * (обычный, собранный, выбранный, цель), мост, сетка на полу, каркас куба,
 * три оси гизмо и цвета эффектов (искры, конфетти, светлячки, пыльца).
 *
 * Идентификаторы совпадают с 2D-скинами (`default`, `night`,
 * `experimental`), и выбор хранится под тем же ключом localStorage —
 * так режимы делят одну настройку.
 *
 * Классический script-модуль: публикует BridgesSkins3D в window и
 * module.exports для Node (как logic3d/spike.js).
 */
(function (global) {
  "use strict";

  /*
   * Базовый набор ключей палитры. Тесты сверяют по нему каждый скин,
   * чтобы новый скин нельзя было добавить «наполовину».
   */
  const PALETTE_KEYS = [
    "background",
    "island",
    "islandSatisfied",
    "islandSelected",
    "islandCandidate",
    "bridge",
    "grid",
    "box",
    "axisX",
    "axisY",
    "axisZ",
    "sparkle",
    "firefly",
    "pollen"
  ];

  // Фоновый слой эффектов, который включает скин.
  const AMBIENT_KINDS = ["none", "fireflies", "pollen"];

  const BRIDGE_SKINS_3D = {
    default: {
      name: "Лазурные острова",
      description: "Классическая светлая лагуна",
      palette: {
        background: [0.06, 0.1, 0.15],
        island: [0.93, 0.7, 0.34],
        islandSatisfied: [0.44, 0.8, 0.52],
        islandSelected: [1.0, 0.92, 0.6],
        islandCandidate: [0.55, 0.8, 1.0],
        bridge: [0.8, 0.54, 0.28],
        grid: [0.16, 0.26, 0.36],
        box: [0.24, 0.4, 0.55],
        axisX: [0.95, 0.35, 0.35],
        axisY: [0.42, 0.85, 0.45],
        axisZ: [0.4, 0.6, 0.98],
        sparkle: [0.99, 0.88, 0.3],
        firefly: [1.0, 0.88, 0.5],
        pollen: [0.95, 0.92, 0.78]
      },
      ambient: "none",
      confetti: [
        [0.99, 0.88, 0.28],
        [0.98, 0.75, 0.14],
        [0.94, 0.27, 0.27],
        [0.06, 0.72, 0.51],
        [0.23, 0.51, 0.96],
        [0.91, 0.47, 0.98]
      ]
    },

    night: {
      name: "Лунная ночь",
      description: "Тёмная вода и серебряные мосты",
      palette: {
        background: [0.02, 0.03, 0.08],
        island: [0.72, 0.78, 0.9],
        islandSatisfied: [0.35, 0.85, 0.78],
        islandSelected: [0.98, 0.95, 0.82],
        islandCandidate: [0.6, 0.85, 1.0],
        bridge: [0.8, 0.84, 0.9],
        grid: [0.12, 0.16, 0.28],
        box: [0.2, 0.28, 0.46],
        axisX: [0.88, 0.45, 0.5],
        axisY: [0.45, 0.86, 0.7],
        axisZ: [0.55, 0.62, 1.0],
        sparkle: [0.98, 0.92, 0.65],
        firefly: [1.0, 0.87, 0.45],
        pollen: [0.85, 0.9, 1.0]
      },
      ambient: "fireflies",
      confetti: [
        [0.89, 0.91, 0.94],
        [0.6, 0.96, 0.92],
        [0.31, 0.83, 0.75],
        [0.6, 0.62, 1.0],
        [0.84, 0.6, 0.98],
        [0.98, 0.85, 0.6]
      ]
    },

    /*
     * «Дикие биомы»: у каждого острова свой оттенок из islandVariants,
     * плюс фоновая пыльца — 3D-отголосок экспериментального 2D-скина.
     */
    experimental: {
      name: "Дикие биомы",
      description: "Эксперимент: биомы островов и пыльца",
      palette: {
        background: [0.07, 0.055, 0.05],
        island: [0.85, 0.62, 0.3],
        islandSatisfied: [0.98, 0.78, 0.32],
        islandSelected: [1.0, 0.93, 0.66],
        islandCandidate: [0.72, 0.9, 1.0],
        bridge: [0.78, 0.52, 0.24],
        grid: [0.2, 0.16, 0.13],
        box: [0.34, 0.28, 0.2],
        axisX: [0.98, 0.42, 0.3],
        axisY: [0.62, 0.88, 0.4],
        axisZ: [0.98, 0.72, 0.25],
        sparkle: [0.99, 0.63, 0.72],
        firefly: [1.0, 0.85, 0.45],
        pollen: [0.96, 0.9, 0.72]
      },
      ambient: "pollen",
      islandVariants: [
        [0.87, 0.66, 0.34],
        [0.92, 0.5, 0.26],
        [0.42, 0.8, 0.72],
        [0.74, 0.74, 0.76],
        [0.9, 0.6, 0.68]
      ],
      confetti: [
        [0.99, 0.7, 0.3],
        [0.96, 0.45, 0.3],
        [0.98, 0.85, 0.4],
        [0.42, 0.8, 0.72],
        [0.99, 0.63, 0.72],
        [0.85, 0.55, 0.95]
      ]
    }
  };

  // Общий с 2D-режимом ключ: одна настройка на оба режима.
  const SKIN_STORAGE_KEY = "bridges-skin";
  const DEFAULT_SKIN_3D = "default";

  const getSkin3D = (skinId) =>
    BRIDGE_SKINS_3D[skinId] || BRIDGE_SKINS_3D[DEFAULT_SKIN_3D];

  const isSkin3D = (skinId) =>
    Object.prototype.hasOwnProperty.call(BRIDGE_SKINS_3D, skinId);

  const listSkinIds3D = () => Object.keys(BRIDGE_SKINS_3D);

  /*
   * Палитра для WebGL: те же числа, но в Float32Array — форма, которую
   * ждут uniform3fv, и один объект на кадр вместо массива объектов.
   */
  const toFloatPalette = (skin) => {
    const source = (skin && skin.palette) || BRIDGE_SKINS_3D[DEFAULT_SKIN_3D].palette;
    const result = {};

    for (const key of PALETTE_KEYS) {
      const value = source[key] || BRIDGE_SKINS_3D[DEFAULT_SKIN_3D].palette[key];

      result[key] = new Float32Array([value[0], value[1], value[2]]);
    }

    return result;
  };

  const readSavedSkin3D = () => {
    try {
      const saved = global.localStorage
        ? global.localStorage.getItem(SKIN_STORAGE_KEY)
        : null;

      return isSkin3D(saved) ? saved : DEFAULT_SKIN_3D;
    } catch (error) {
      return DEFAULT_SKIN_3D;
    }
  };

  const saveSkin3D = (skinId) => {
    try {
      // Без хранилища сохранять некуда — сообщаем честно.
      if (!global.localStorage) return false;

      global.localStorage.setItem(SKIN_STORAGE_KEY, skinId);

      return true;
    } catch (error) {
      // Сохранение необязательно: игра работает и без localStorage.
      return false;
    }
  };

  const BridgesSkins3D = {
    BRIDGE_SKINS_3D,
    PALETTE_KEYS,
    AMBIENT_KINDS,
    SKIN_STORAGE_KEY,
    DEFAULT_SKIN_3D,
    getSkin3D,
    isSkin3D,
    listSkinIds3D,
    toFloatPalette,
    readSavedSkin3D,
    saveSkin3D
  };

  global.BridgesSkins3D = BridgesSkins3D;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BridgesSkins3D;
  }
})(typeof window !== "undefined" ? window : globalThis);
