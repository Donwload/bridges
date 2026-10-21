/*
 * Горячие клавиши без привязки к раскладке.
 *
 * У события клавиатуры есть два разных поля: `code` — физическая клавиша
 * (`KeyX`, `KeyS`), одинаковая во всех раскладках, и `key` — символ,
 * который на русской раскладке для той же клавиши будет «ч» или «ы».
 * Игра смотрит на `code`, поэтому подсказки «X / Y / Z» и «S» работают
 * и при включённой русской раскладке. `key` остаётся запасным путём —
 * для синтетических событий и браузеров, где `code` пустой.
 *
 * Классический script-модуль: публикует BridgesInput в window и
 * module.exports для Node.
 */
(function (global) {
  "use strict";

  const charOf = (value) =>
    typeof value === "string" ? value.toLowerCase() : "";

  const hasCode = (event) =>
    typeof event.code === "string" &&
    event.code !== "" &&
    event.code !== "Unidentified";

  /*
   * is(event, "KeyX", "x") — нажата ли физическая клавиша X в любой
   * раскладке. Третий аргумент — символ для запасного пути.
   */
  const is = (event, code, key) => {
    if (!event) return false;

    if (hasCode(event)) return event.code === code;

    return charOf(event.key) === charOf(key);
  };

  const BridgesInput = { is };

  global.BridgesInput = BridgesInput;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BridgesInput;
  }
})(typeof window !== "undefined" ? window : globalThis);
