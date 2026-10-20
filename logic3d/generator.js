/*
 * Генерация 3D-полей вне основного потока.
 *
 * Тяжёлая часть — подбор поля и проверка единственности решения — уходит
 * в Web Worker (logic3d/worker.js). Клиент здесь один и тот же для двух
 * режимов:
 *
 *   1. Worker доступен  → generate()/expand() возвращают Promise;
 *   2. Worker недоступен (file://, старый браузер, ошибка загрузки) →
 *      те же методы считают всё синхронно в текущем потоке.
 *
 * Поэтому игра работает всегда, а «замирание» интерфейса на больших полях
 * (12+ островов) остаётся только в запасном режиме.
 *
 * Протокол — обычные объекты, пригодные для structured clone:
 *
 *   запрос:  { id, type: "generate", options }
 *            { id, type: "expand", board, options }
 *   ответ:   { id, ok: true, result } | { id, ok: false, error }
 *
 * Функции (rng) через границу потока не передаются: вместо них едет seed,
 * а mulberry32 строится уже на той стороне. Это заодно делает генерацию
 * воспроизводимой в тестах.
 *
 * Классический script-модуль: публикует BridgesGenerator3D в window и
 * module.exports для Node.
 */
(function (global) {
  "use strict";

  const Core =
    global.BridgesSpike3D ||
    (typeof require === "function" ? require("./spike.js") : null);

  if (!Core) {
    throw new Error(
      "BridgesGenerator3D: не найден logic3d/spike.js. Подключите его раньше."
    );
  }

  // Сколько раз пробуем генератор, прежде чем сдаться (как в старом коде).
  const GENERATE_TRIES = 3;

  // Сколько ждём ответ Worker, прежде чем уйти на синхронный путь.
  const WORKER_TIMEOUT_MS = 5000;

  const randomSeed = () =>
    (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

  const normalizeSeed = (value) => {
    if (!Number.isFinite(value)) return randomSeed();

    return Math.floor(value) >>> 0;
  };

  // ---------- чистые операции ----------

  /*
   * Поле с несколькими попытками. Возвращает board или null.
   */
  const generateBoard = (options, api) => {
    const core = api || Core;
    const opts = options || {};
    const seed = normalizeSeed(opts.seed);
    const tries = Math.max(1, Math.floor(opts.tries || GENERATE_TRIES));
    const rng = core.mulberry32(seed);

    for (let attempt = 0; attempt < tries; attempt++) {
      const board = core.generateBoard3d({
        size: opts.size,
        minIslands: opts.minIslands,
        maxIslands: opts.maxIslands,
        rng
      });

      if (board) return board;
    }

    return null;
  };

  /*
   * Расширение по цепочке планов: первый удачный план и становится
   * результатом. Воркеру едет вся цепочка — иначе каждый шаг был бы
   * отдельным round-trip.
   */
  const expandBoard = (board, options, api) => {
    const core = api || Core;
    const opts = options || {};
    const seed = normalizeSeed(opts.seed);
    const rng = core.mulberry32(seed);
    const maxBridgeCount = opts.maxBridgeCount || core.MAX_BRIDGE_3D || 2;
    const plans =
      Array.isArray(opts.plans) && opts.plans.length > 0
        ? opts.plans
        : [{ growth: opts.growth, addIslands: opts.addIslands }];

    for (const plan of plans) {
      const next = core.expandBoard3d(board, {
        maxBridgeCount,
        growth: plan.growth,
        addIslands: plan.addIslands,
        rng
      });

      if (next) return next;
    }

    return null;
  };

  /*
   * Обработчик сообщения воркера. Чистая функция: без postMessage и без
   * состояния — поэтому её можно проверять в Node.
   */
  const handleRequest = (request, api) => {
    const id = request && request.id;

    try {
      if (!request || typeof request !== "object") {
        throw new Error("Пустой запрос генератора");
      }

      if (request.type === "generate") {
        return { id, ok: true, result: generateBoard(request.options, api) };
      }

      if (request.type === "expand") {
        return {
          id,
          ok: true,
          result: expandBoard(request.board, request.options, api)
        };
      }

      throw new Error("Неизвестный тип запроса: " + request.type);
    } catch (error) {
      return {
        id,
        ok: false,
        error: String((error && error.message) || error)
      };
    }
  };

  // ---------- клиент ----------

  class BridgesGenerator3D {
    constructor(options) {
      const opts = options || {};

      this.api = opts.core || Core;
      this.workerUrl = opts.workerUrl || "logic3d/worker.js";
      this.timeoutMs = opts.timeoutMs || WORKER_TIMEOUT_MS;
      this.workerFactory = opts.workerFactory || this._defaultFactory();

      this._worker = null;
      this._seq = 0;
      this._pending = new Map();

      this._startWorker();
    }

    _defaultFactory() {
      if (typeof global.Worker !== "function") return null;

      const url = this.workerUrl;

      return () => new global.Worker(url);
    }

    get hasWorker() {
      return Boolean(this._worker);
    }

    _startWorker() {
      if (!this.workerFactory) return;

      let worker = null;

      try {
        worker = this.workerFactory();
      } catch (error) {
        // Нет Worker (file://, политика браузера) — работаем синхронно.
        worker = null;
      }

      if (!worker || typeof worker.postMessage !== "function") return;

      worker.onmessage = (event) => this._onMessage(event && event.data);
      worker.onerror = () => this._failWorker();

      this._worker = worker;
    }

    _onMessage(data) {
      if (!data || typeof data !== "object") return;

      const entry = this._pending.get(data.id);

      // Ответ на отменённый или устаревший запрос просто игнорируем.
      if (!entry) return;

      this._pending.delete(data.id);

      if (entry.timer !== null) clearTimeout(entry.timer);

      if (data.ok) {
        entry.resolve(data.result === undefined ? null : data.result);
      } else {
        entry.reject(new Error(data.error || "Ошибка генератора"));
      }
    }

    _failWorker() {
      const pending = Array.from(this._pending.values());

      this._pending.clear();
      this._stopWorker();

      for (const entry of pending) {
        if (entry.timer !== null) clearTimeout(entry.timer);
        entry.reject(new Error("Worker остановился"));
      }
    }

    _stopWorker() {
      const worker = this._worker;

      this._worker = null;

      if (worker && typeof worker.terminate === "function") {
        try {
          worker.terminate();
        } catch (error) {
          /* воркер уже мог умереть сам */
        }
      }
    }

    _request(payload) {
      const worker = this._worker;

      if (!worker) {
        return Promise.reject(new Error("Worker недоступен"));
      }

      const id = ++this._seq;
      const message = Object.assign({}, payload, { id });

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this._pending.delete(id);
          reject(new Error("Worker не ответил за " + this.timeoutMs + " мс"));
        }, this.timeoutMs);

        this._pending.set(id, { resolve, reject, timer });

        try {
          worker.postMessage(message);
        } catch (error) {
          this._pending.delete(id);
          clearTimeout(timer);
          reject(error);
        }
      });
    }

    /*
     * Поле. Если воркер молчит, умер или не смог — считаем синхронно.
     */
    generate(options) {
      const opts = Object.assign({ seed: randomSeed() }, options);

      opts.seed = normalizeSeed(opts.seed);

      if (!this._worker) return Promise.resolve(this.generateSync(opts));

      return this._request({ type: "generate", options: opts }).catch(() =>
        this.generateSync(opts)
      );
    }

    /*
     * Расширение: тот же принцип, что и у generate().
     */
    expand(board, options) {
      const opts = Object.assign({ seed: randomSeed() }, options);

      opts.seed = normalizeSeed(opts.seed);

      if (!this._worker) return Promise.resolve(this.expandSync(board, opts));

      return this._request({ type: "expand", board, options: opts }).catch(() =>
        this.expandSync(board, opts)
      );
    }

    generateSync(options) {
      return generateBoard(options, this.api);
    }

    expandSync(board, options) {
      return expandBoard(board, options, this.api);
    }

    dispose() {
      this._failWorker();
    }
  }

  BridgesGenerator3D.handleRequest = handleRequest;
  BridgesGenerator3D.generateBoard = generateBoard;
  BridgesGenerator3D.expandBoard = expandBoard;
  BridgesGenerator3D.GENERATE_TRIES = GENERATE_TRIES;
  BridgesGenerator3D.WORKER_TIMEOUT_MS = WORKER_TIMEOUT_MS;

  global.BridgesGenerator3D = BridgesGenerator3D;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BridgesGenerator3D;
  }
})(typeof window !== "undefined" ? window : globalThis);
