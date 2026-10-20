/*
 * Главный класс логики игры «Мосты».
 *
 * Код разделён на классические script-модули в папке logic/.
 * Каждый модуль добавляет свою часть методов к прототипу класса.
 * Это сохраняет прямой запуск index.html без сборщика и ES-модулей.
 */
const {
  DEFAULT_MAX_BRIDGE_COUNT,
  MAX_ALLOWED_BRIDGE_COUNT,
  BridgeStore
} = globalThis.BridgesLogicCore;

class BridgesGameLogic {
  constructor(gridSize = 7, options = {}) {
    this.gridSize = gridSize;
    this.islands = new Map();
    this.bridges = new BridgeStore(this);

    // Кратность связи: 1 — обычный мост, 2 — двойной.
    // Больше двух мостов между одной парой островов быть не может.
    const requested = Number.isInteger(options.maxBridgeCount)
      ? options.maxBridgeCount
      : DEFAULT_MAX_BRIDGE_COUNT;

    this.maxBridgeCount = Math.max(
      1,
      Math.min(MAX_ALLOWED_BRIDGE_COUNT, requested)
    );

    this.solutionChecker = new SolutionChecker(this);
  }
}

Object.assign(
  BridgesGameLogic.prototype,
  globalThis.BridgesLogicParts.geometry,
  globalThis.BridgesLogicParts.board,
  globalThis.BridgesLogicParts.expansion,
  globalThis.BridgesLogicParts.generator
);

if (typeof window !== "undefined") {
  window.BridgesGameLogic = BridgesGameLogic;
}
