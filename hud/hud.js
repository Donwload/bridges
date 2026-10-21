/*
 * Общий HUD «Мостов»: переключатель режимов 2D / 3D.
 *
 * Обе страницы (`index.html` и `3d.html`) — отдельные документы, поэтому
 * переключение режима это обычная навигация. Здесь живёт всё, что должно
 * совпадать на обеих страницах:
 *
 *   - порядок и подписи режимов, адреса страниц;
 *   - разметка переключателя (сегменты-ссылки, `aria-current`);
 *   - запоминание последнего режима в общем ключе `localStorage`,
 *     чтобы на переключателе была видна прошлая сессия.
 *
 * Классический script-модуль: без сборщика, публикует `BridgesHUD`
 * в window и `module.exports` для Node (там тестируются чистые функции).
 */
(function (global) {
  "use strict";

  const MODE_KEY = "bridges-mode";

  // Порядок сегментов в переключателе.
  const MODE_ORDER = ["2d", "3d"];

  const MODES = {
    "2d": {
      id: "2d",
      label: "2D",
      href: "index.html",
      title: "Плоские мосты"
    },
    "3d": {
      id: "3d",
      label: "3D",
      href: "3d.html",
      title: "Объёмные мосты"
    }
  };

  const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);

  const isMode = (value) => typeof value === "string" && hasOwn(MODES, value);

  const normalizeMode = (value) => (isMode(value) ? value : "2d");

  const modeHref = (mode) => MODES[normalizeMode(mode)].href;

  /*
   * localStorage может быть недоступен: приватный режим, `file://`,
   * запрет хранилища в настройках. Тогда просто не запоминаем режим —
   * переключатель продолжает работать.
   */
  const safeStorage = () => {
    try {
      const storage = global.localStorage;

      if (!storage) return null;

      // Проверка доступа: обращение к хранилищу может бросать исключение.
      const probe = "__bridges_hud_probe__";

      storage.setItem(probe, "1");
      storage.removeItem(probe);

      return storage;
    } catch (error) {
      return null;
    }
  };

  /*
   * Последний выбранный режим или null, если его ещё не выбирали.
   * Испорченное значение считается отсутствующим.
   */
  const readMode = () => {
    const storage = safeStorage();

    if (!storage) return null;

    try {
      const value = storage.getItem(MODE_KEY);

      return isMode(value) ? value : null;
    } catch (error) {
      return null;
    }
  };

  const saveMode = (mode) => {
    const storage = safeStorage();

    if (!storage) return false;

    try {
      storage.setItem(MODE_KEY, normalizeMode(mode));

      return true;
    } catch (error) {
      return false;
    }
  };

  /*
   * Модель переключателя — обычные данные, поэтому проверяется в Node.
   *
   * recent — режим прошлой сессии. Пометка ставится только на «другой»
   * режим: на текущей странице она не нужна.
   */
  const switchModel = (current, recent) => {
    const active = normalizeMode(current);
    const last = isMode(recent) ? recent : null;

    return MODE_ORDER.map((id) => {
      const mode = MODES[id];

      return {
        id: id,
        label: mode.label,
        href: mode.href,
        title: mode.title,
        active: id === active,
        recent: last !== null && last === id && last !== active
      };
    });
  };

  const createSwitch = (current, options) => {
    const opts = options || {};
    const doc = opts.document || global.document;

    if (!doc || typeof doc.createElement !== "function") return null;

    const recent = opts.recent === undefined ? readMode() : opts.recent;
    const root = doc.createElement("div");

    root.className = "mode-switch";
    root.setAttribute("role", "group");
    root.setAttribute("aria-label", "Режим игры");

    for (const item of switchModel(current, recent)) {
      const link = doc.createElement("a");

      link.className =
        "mode-switch-option" + (item.active ? " is-active" : "");
      link.href = item.href;
      link.dataset.mode = item.id;
      link.title = item.recent
        ? item.title + " — прошлая сессия"
        : item.title;

      if (item.active) link.setAttribute("aria-current", "page");

      const label = doc.createElement("span");

      label.className = "mode-switch-label";
      label.textContent = item.label;
      link.appendChild(label);

      if (item.recent) {
        const dot = doc.createElement("span");

        dot.className = "mode-switch-dot";
        dot.setAttribute("aria-hidden", "true");
        link.appendChild(dot);
      }

      link.addEventListener("click", (event) => {
        saveMode(item.id);

        if (typeof opts.onSwitch === "function") {
          opts.onSwitch(item.id, event);
        }
      });

      root.appendChild(link);
    }

    return root;
  };

  /*
   * Поставить переключатель в контейнер (элемент или CSS-селектор).
   */
  const mountSwitch = (target, current, options) => {
    const doc = (options && options.document) || global.document;
    const node =
      typeof target === "string"
        ? doc && typeof doc.querySelector === "function"
          ? doc.querySelector(target)
          : null
        : target;

    if (!node) return null;

    const root = createSwitch(current, options);

    if (!root) return null;

    while (node.firstChild) node.removeChild(node.firstChild);

    node.appendChild(root);

    return root;
  };

  /*
   * Отметить текущий режим на <body>: по этому атрибуту включаются
   * стили конкретной страницы.
   */
  const applyMode = (mode, doc) => {
    const target = doc || global.document;

    if (!target || !target.body) return false;

    target.body.dataset.mode = normalizeMode(mode);

    return true;
  };

  const BridgesHUD = {
    MODE_KEY,
    MODES,
    MODE_ORDER,
    isMode,
    normalizeMode,
    modeHref,
    readMode,
    saveMode,
    switchModel,
    createSwitch,
    mountSwitch,
    applyMode
  };

  global.BridgesHUD = BridgesHUD;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BridgesHUD;
  }
})(typeof window !== "undefined" ? window : globalThis);
