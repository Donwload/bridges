/*
 * Основной модуль 3D-каркаса «Мосты».
 *
 * Собирает генератор (logic3d/spike.js), логику партии (logic3d/game.js)
 * и WebGL-рисование в одну живую сцену: сферы-острова, мосты-трубки,
 * поворот камеры, выбор острова и гизмо трёх осей.
 *
 * Публикует Bridges3DApp в window.
 */
(function (global) {
  "use strict";

  const RMath = global.RMath;
  const GL3D = global.GL3D;
  const Core = global.BridgesSpike3D;
  const Skins = global.BridgesSkins3D;
  const Effects = global.BridgesEffects3D;

  if (!RMath || !GL3D || !Core || !Skins || !Effects) {
    throw new Error(
      "Bridges3DApp: сначала подключите renderer3d/math.js, renderer3d/gl.js, " +
      "renderer3d/skins.js, renderer3d/effects3d.js и logic3d/spike.js."
    );
  }

  const { key3d, parseKey3d, mulberry32, generateBoard3d, MAX_BRIDGE_3D } = Core;

  const CELL = 1;
  const ARM_LENGTH = 1.4;

  const AXIS_DIRS = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];

  // Сколько островов просить у генератора для каждого размера куба.
  const SIZE_CONFIG = {
    3: { min: 6, max: 8 },
    4: { min: 7, max: 10 },
    5: { min: 10, max: 14 },
    6: { min: 14, max: 18 }
  };

  // Мягкий предел куба: дальше новые острова встают внутрь поля.
  const MAX_SIZE_3D = 7;

  // Жёсткий предел: сюда куб дорастает, только если внутри стало тесно.
  const HARD_MAX_SIZE_3D = 9;

  // Сколько новых островов просит каждое следующее расширение: 2, 3, 4, 4…
  const expansionIslands = (done) => Math.min(4, 2 + done);

  // Цвета сцены теперь приходят из скина: renderer3d/skins.js.
  // Дефолтная палитра скина `default` совпадает с прежней жёсткой.

  const LIGHT_DIR = new Float32Array([0.35, 0.85, 0.4]);

  class Bridges3DApp {
    constructor(options) {
      this.canvas = options.canvas;
      this.labelsEl = options.labelsEl || null;
      this.statusEl = options.statusEl || null;
      this.bannerEl = options.bannerEl || null;
      this.bannerSubEl = options.bannerSubEl || null;
      this.skinButtonEl = options.skinButtonEl || null;
      this.skinPanelEl = options.skinPanelEl || null;

      this.gl = GL3D.createContext(this.canvas);
      this.meshProgram = GL3D.createMeshProgram(this.gl);
      this.lineProgram = GL3D.createLineProgram(this.gl);
      this.sphereMesh = GL3D.createSphere(this.gl, 18, 24);
      this.tubeMesh = GL3D.createCylinder(this.gl, 16);

      // Частиц бывает до сотни — им хватает низкополигональной сферы.
      this.particleMesh = GL3D.createSphere(this.gl, 5, 7);

      this.camera = new global.OrbitCamera();

      this.skinId = Skins.readSavedSkin3D();
      this.skin = Skins.getSkin3D(this.skinId);
      this.palette = Skins.toFloatPalette(this.skin);

      this.effects = new Effects();
      this.effects.setLook(this.palette, this.skin.confetti);

      this.lastFrameTime = 0;

      this.size = options.size || 3;
      this.level = 1;
      this.expansionsDone = 0;
      this.islandRadius = 0.3 * CELL;

      this.logic = null;
      this.selectedKey = null;
      this.selectedCoord = null;
      this.chosenAxis = null;
      this.candidates = [];

      this.labels = new Map();

      this.tmpModel = RMath.identity();
      this.tmpNormal = new Float32Array(9);
      this.invViewProj = RMath.identity();
      this.rect = { left: 0, top: 0, width: 1, height: 1 };

      this.drag = {
        active: false,
        moved: false,
        lastX: 0,
        lastY: 0,
        button: 0
      };

      this._loopBound = () => this._loop();

      this._bindInput();
      this._bindSkinUI();
      this.newLevel(this.size);
      this._syncSkinUI();

      // Первый кадр рисуем сразу, дальнейшие — по requestAnimationFrame.
      // Так картинка не зависит от того, успел ли сработать rAF.
      this._loop();
    }

    // ---------- уровень ----------

    newLevel(size) {
      this.size = Math.round(RMath.clamp(size || this.size, 3, 6));

      const range = SIZE_CONFIG[this.size] || SIZE_CONFIG[3];
      const rng = mulberry32(
        (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
      );

      let board = null;

      for (let attempt = 0; attempt < 3 && !board; attempt++) {
        board = generateBoard3d({
          size: this.size,
          minIslands: range.min,
          maxIslands: range.max,
          rng
        });
      }

      if (!board) {
        board = generateBoard3d({
          size: 3,
          minIslands: 4,
          maxIslands: 6,
          rng
        });
      }

      this.size = board.size;
      this.level = 1;
      this.expansionsDone = 0;

      this.logic = new global.BridgesLogic3D(
        board.islands,
        MAX_BRIDGE_3D,
        this.size
      );
      this.selectedKey = null;
      this.selectedCoord = null;
      this.chosenAxis = null;
      this.candidates = [];

      this.gridMesh = this._buildGrid();
      this.boxMesh = this._buildBox();

      this.camera.fitToSize(this.size);
      this.camera.target = [0, 0, 0];

      this._buildLabels();
      this._hideBanner();
      this._updateStatus();

      // Новый уровень — чистые эффекты: конфетти прошлой победы не тащим.
      this.effects.reset();
      this.effects.syncAmbient(this.skin.ambient, [0, 0, 0], this._extent());
    }

    /*
     * Полуразмер куба в мировых единицах: по нему центрируются эффекты.
     */
    _extent() {
      return (this.size - 1) / 2 + 0.6;
    }

    // ---------- скины ----------

    /*
     * Смена скина: палитра, цвета эффектов, сетка и каркас куба.
     * Сетка и каркас запекают цвет прямо в вершины, поэтому их
     * приходится пересобирать — они маленькие, это дёшево.
     */
    setSkin(skinId) {
      const next = Skins.isSkin3D(skinId) ? skinId : Skins.DEFAULT_SKIN_3D;

      this.skinId = next;
      this.skin = Skins.getSkin3D(next);
      this.palette = Skins.toFloatPalette(this.skin);

      this.effects.setLook(this.palette, this.skin.confetti);
      this.effects.syncAmbient(this.skin.ambient, [0, 0, 0], this._extent());

      Skins.saveSkin3D(next);

      if (global.document && global.document.body) {
        global.document.body.dataset.skin = next;
      }

      if (this.gridMesh) this.gridMesh = this._buildGrid();
      if (this.boxMesh) this.boxMesh = this._buildBox();

      this._syncSkinUI();

      return next;
    }

    /*
     * Быстрое переключение скинов: кнопка в HUD, клавиша S.
     */
    _cycleSkin(direction) {
      const ids = Skins.listSkinIds3D();
      const index = Math.max(0, ids.indexOf(this.skinId));
      const step = direction === undefined ? 1 : direction;

      return this.setSkin(ids[(index + step + ids.length) % ids.length]);
    }

    _toggleSkinPanel(open) {
      const panel = this.skinPanelEl;

      if (!panel) return;

      const nextOpen = open === undefined
        ? panel.classList.contains("hidden")
        : Boolean(open);

      panel.classList.toggle("hidden", !nextOpen);
      panel.setAttribute("aria-hidden", nextOpen ? "false" : "true");

      if (this.skinButtonEl) {
        this.skinButtonEl.setAttribute("aria-expanded", nextOpen ? "true" : "false");
      }
    }

    _hideSkinPanel() {
      this._toggleSkinPanel(false);
    }

    /*
     * Карточки панели берут названия, описания и цвета прямо из скина:
     * новый скин не требует правок в разметке.
     */
    _bindSkinUI() {
      const button = this.skinButtonEl;
      const panel = this.skinPanelEl;

      if (button) {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          this._toggleSkinPanel();
        });
      }

      if (!panel) return;

      const toCss = (rgb) =>
        "rgb(" +
        rgb.map((value) => Math.round(value * 255)).join(", ") +
        ")";

      for (const card of panel.querySelectorAll("[data-skin-id]")) {
        const skinId = card.getAttribute("data-skin-id");
        const skin = Skins.BRIDGE_SKINS_3D[skinId];

        if (!skin) continue;

        const nameEl = card.querySelector(".skin-name");
        const descEl = card.querySelector(".skin-desc");
        const swatches = card.querySelectorAll(".skin-swatch");
        const colors = [
          skin.palette.island,
          skin.palette.bridge,
          skin.palette.islandSatisfied
        ];

        if (nameEl) nameEl.textContent = skin.name;
        if (descEl) descEl.textContent = skin.description;

        swatches.forEach((el, index) => {
          if (colors[index]) el.style.background = toCss(colors[index]);
        });

        card.addEventListener("click", () => {
          this.setSkin(skinId);
          this._hideSkinPanel();
        });
      }

      const closeEl = panel.querySelector("[data-skin-close]");

      if (closeEl) {
        closeEl.addEventListener("click", () => this._hideSkinPanel());
      }
    }

    _syncSkinUI() {
      if (this.skinButtonEl) {
        this.skinButtonEl.textContent = "Скин: " + this.skin.name;
      }

      if (this.skinPanelEl) {
        for (const card of this.skinPanelEl.querySelectorAll("[data-skin-id]")) {
          card.classList.toggle(
            "active",
            card.getAttribute("data-skin-id") === this.skinId
          );
        }
      }
    }

    /*
     * Цвет острова: в экспериментальном скине у каждого острова свой
     * биом из islandVariants, в остальных — общий цвет палитры.
     */
    _islandColor(key) {
      const variants = this.skin.islandVariants;

      if (!variants || variants.length === 0) return this.palette.island;

      let hash = 0;

      for (let i = 0; i < key.length; i++) {
        hash = (hash * 31 + key.charCodeAt(i)) | 0;
      }

      return variants[Math.abs(hash) % variants.length];
    }

    /*
     * Продолжение после победы: куб растёт, старые острова сдвигаются
     * в центр, вокруг появляются новые листья. Старые мосты остаются,
     * новые острова игрок достраивает сам.
     *
     * Куб растёт до мягкого предела, а если внутри стало тесно — до
     * жёсткого: иначе бесконечная партия упёрлась бы в потолок, где
     * новые листья уже некуда ставить.
     */
    expandLevel() {
      const size = this.logic.size;
      const addIslands = expansionIslands(this.expansionsDone);
      const canGrow = size + 2 <= HARD_MAX_SIZE_3D;

      const plans = [];
      const seen = new Set();

      const addPlan = (count, growth) => {
        const planKey = count + "|" + growth;

        if (seen.has(planKey)) return;

        seen.add(planKey);
        plans.push({ addIslands: count, growth });
      };

      // Обычный шаг: пока поле не упёрлось в мягкий предел — растим куб.
      addPlan(addIslands, size + 2 <= MAX_SIZE_3D ? 2 : 0);
      // Внутри стало тесно — всё равно подращиваем куб, до жёсткого предела.
      if (canGrow) addPlan(addIslands, 2);
      // Последняя попытка: всего один остров, куда угодно.
      addPlan(1, canGrow ? 2 : 0);

      let ok = false;

      for (const plan of plans) {
        // При отказе состояние партии не меняется, поэтому можно
        // спокойно пробовать следующий вариант.
        ok = this.logic.expandLevel({
          size,
          growth: plan.growth,
          addIslands: plan.addIslands
        });

        if (ok) break;
      }

      if (!ok) {
        if (this.statusEl) {
          this.statusEl.textContent =
            "Не удалось расширить карту. Нажмите ещё раз.";
        }

        return false;
      }

      this.size = this.logic.size;
      this.level++;
      this.expansionsDone++;

      this.gridMesh = this._buildGrid();
      this.boxMesh = this._buildBox();

      this.camera.fitToSize(this.size);

      this._clearSelection();
      this._buildLabels();
      this._hideBanner();
      this._updateStatus();

      // Карта выросла — эффекты переезжают в новый центр куба.
      this.effects.reset();
      this.effects.syncAmbient(this.skin.ambient, [0, 0, 0], this._extent());

      return true;
    }

    worldOf(coord) {
      const half = (this.size - 1) / 2;

      return [
        (coord[0] - half) * CELL,
        (coord[1] - half) * CELL,
        (coord[2] - half) * CELL
      ];
    }

    _buildGrid() {
      const half = (this.size - 1) / 2;
      const extent = half + 0.7;
      const y = -extent;
      const [r, g, b] = this.palette.grid;
      const vertices = [];

      for (let i = -half; i <= half; i++) {
        vertices.push(-extent, y, i * CELL, r, g, b);
        vertices.push(extent, y, i * CELL, r, g, b);
        vertices.push(i * CELL, y, -extent, r, g, b);
        vertices.push(i * CELL, y, extent, r, g, b);
      }

      return GL3D.createLines(this.gl, vertices);
    }

    _buildBox() {
      const e = (this.size - 1) / 2 + 0.5;
      const [r, g, b] = this.palette.box;
      const corner = (x, y, z) => [x * e, y * e, z * e];

      const edges = [
        [corner(-1, -1, -1), corner(1, -1, -1)],
        [corner(-1, -1, -1), corner(-1, 1, -1)],
        [corner(-1, -1, -1), corner(-1, -1, 1)],
        [corner(1, 1, 1), corner(-1, 1, 1)],
        [corner(1, 1, 1), corner(1, -1, 1)],
        [corner(1, 1, 1), corner(1, 1, -1)],
        [corner(1, -1, -1), corner(1, 1, -1)],
        [corner(1, -1, -1), corner(1, -1, 1)],
        [corner(-1, 1, -1), corner(1, 1, -1)],
        [corner(-1, 1, -1), corner(-1, 1, 1)],
        [corner(-1, -1, 1), corner(1, -1, 1)],
        [corner(-1, -1, 1), corner(-1, 1, 1)]
      ];

      const vertices = [];

      for (const [a, c] of edges) {
        vertices.push(a[0], a[1], a[2], r, g, b);
        vertices.push(c[0], c[1], c[2], r, g, b);
      }

      return GL3D.createLines(this.gl, vertices);
    }

    // ---------- ввод ----------

    _bindInput() {
      const canvas = this.canvas;

      canvas.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;

        // Синтетические события (тесты) не имеют активного указателя.
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch {
          /* указателя нет — просто продолжаем */
        }

        this.drag.active = true;
        this.drag.moved = false;
        this.drag.lastX = e.clientX;
        this.drag.lastY = e.clientY;
        this.drag.button = e.button;
      });

      canvas.addEventListener("pointermove", (e) => {
        if (!this.drag.active) return;

        const dx = e.clientX - this.drag.lastX;
        const dy = e.clientY - this.drag.lastY;

        if (Math.abs(dx) + Math.abs(dy) > 3) this.drag.moved = true;

        if (this.drag.moved) {
          this.camera.rotate(dx, dy);
          this.drag.lastX = e.clientX;
          this.drag.lastY = e.clientY;
        }
      });

      const endDrag = (e) => {
        if (!this.drag.active) return;

        this.drag.active = false;

        if (!this.drag.moved) {
          this._onClick(e.clientX, e.clientY);
        }
      };

      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointercancel", endDrag);

      canvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          this.camera.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
        },
        { passive: false }
      );

      canvas.addEventListener("contextmenu", (e) => e.preventDefault());

      global.addEventListener("keydown", (e) => {
        // Скины доступны всегда: S листает, Esc закрывает панель.
        if (e.key === "s" || e.key === "S") {
          this._cycleSkin(1);
          return;
        }

        if (e.key === "Escape") this._hideSkinPanel();

        if (!this.selectedCoord) return;

        if (e.key === "x" || e.key === "X") this._chooseAxis(0);
        if (e.key === "y" || e.key === "Y") this._chooseAxis(1);
        if (e.key === "z" || e.key === "Z") this._chooseAxis(2);
        if (e.key === "Escape") this._clearSelection();
      });
    }

    _onClick(clientX, clientY) {
      const hitKey = this._pickIsland(clientX, clientY);

      if (hitKey) {
        if (!this.selectedKey) {
          this._select(hitKey);
          return;
        }

        if (hitKey === this.selectedKey) {
          this._clearSelection();
          return;
        }

        if (this.chosenAxis !== null && this.candidates.indexOf(hitKey) >= 0) {
          const target = parseKey3d(hitKey);
          const result = this.logic.cycleBridge(this.selectedCoord, target);

          if (result >= 0) this._afterChange();
          return;
        }

        this._select(hitKey);
        return;
      }

      if (this.selectedKey && this.chosenAxis === null) {
        const axis = this._pickArm(clientX, clientY);

        if (axis !== null) {
          this._chooseAxis(axis);
          return;
        }
      }

      this._clearSelection();
    }

    _select(key) {
      this.selectedKey = key;
      this.selectedCoord = parseKey3d(key);
      this.chosenAxis = null;
      this.candidates = [];
    }

    _chooseAxis(axis) {
      this.chosenAxis = axis;

      const reachable = this.logic.reachableAlongAxis(this.selectedCoord, axis);

      this.candidates = reachable
        .filter((entry) => this.logic.canConnect(this.selectedCoord, entry.coord))
        .map((entry) => entry.key);
    }

    _clearSelection() {
      this.selectedKey = null;
      this.selectedCoord = null;
      this.chosenAxis = null;
      this.candidates = [];
    }

    _afterChange() {
      this._updateStatus();

      if (this.logic.isSolved()) {
        this._showBanner();
        // Конфетти запускается один раз: startConfetti() сам себя бережёт.
        this.effects.startConfetti([0, 0, 0], this._extent());
      } else {
        this._hideBanner();
      }

      // Отсеиваем цели, которые стали недостижимы после нового моста.
      if (this.selectedCoord && this.chosenAxis !== null) {
        this._chooseAxis(this.chosenAxis);
      }
    }

    // ---------- выбор объектов ----------

    _pickIsland(clientX, clientY) {
      const ndcX = ((clientX - this.rect.left) / this.rect.width) * 2 - 1;
      const ndcY = 1 - ((clientY - this.rect.top) / this.rect.height) * 2;
      const ray = RMath.rayFromNdc(this.invViewProj, ndcX, ndcY);

      let bestKey = null;
      let bestT = Infinity;
      const pickRadius = this.islandRadius * 1.3;

      for (const key of this.logic.islandKeys) {
        const world = this.worldOf(parseKey3d(key));
        const t = RMath.raySphere(ray.origin, ray.dir, world, pickRadius);

        if (t !== null && t < bestT) {
          bestT = t;
          bestKey = key;
        }
      }

      return bestKey;
    }

    _pickArm(clientX, clientY) {
      if (!this.selectedCoord) return null;

      const px = clientX - this.rect.left;
      const py = clientY - this.rect.top;
      const base = this.worldOf(this.selectedCoord);

      let bestAxis = null;
      let bestDistance = 18;

      for (let axis = 0; axis < 3; axis++) {
        const dir = AXIS_DIRS[axis];
        const tip = [
          base[0] + dir[0] * ARM_LENGTH,
          base[1] + dir[1] * ARM_LENGTH,
          base[2] + dir[2] * ARM_LENGTH
        ];
        const a = this.project(base);
        const b = this.project(tip);

        if (!a || !b) continue;

        const distance = this._distanceToSegment(px, py, a.x, a.y, b.x, b.y);

        if (distance < bestDistance) {
          bestDistance = distance;
          bestAxis = axis;
        }
      }

      return bestAxis;
    }

    _distanceToSegment(px, py, ax, ay, bx, by) {
      const dx = bx - ax;
      const dy = by - ay;
      const lengthSq = dx * dx + dy * dy;
      const t = lengthSq > 0
        ? RMath.clamp(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0, 1)
        : 0;
      const cx = ax + t * dx;
      const cy = ay + t * dy;

      return Math.hypot(px - cx, py - cy);
    }

    project(world) {
      const m = this.camera.viewProj;

      const x = m[0] * world[0] + m[4] * world[1] + m[8] * world[2] + m[12];
      const y = m[1] * world[0] + m[5] * world[1] + m[9] * world[2] + m[13];
      const w = m[3] * world[0] + m[7] * world[1] + m[11] * world[2] + m[15];

      if (w <= 0.0001) return null;

      const ndcX = x / w;
      const ndcY = y / w;

      return {
        x: (ndcX * 0.5 + 0.5) * this.rect.width,
        y: (1 - (ndcY * 0.5 + 0.5)) * this.rect.height,
        depth: w
      };
    }

    // ---------- отрисовка ----------

    _resize() {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(global.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));

      if (this.canvas.width !== width || this.canvas.height !== height) {
        this.canvas.width = width;
        this.canvas.height = height;
      }

      this.rect = rect;
    }

    _loop() {
      const gl = this.gl;

      const now = global.performance ? global.performance.now() : Date.now();
      const delta = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 0;

      this.lastFrameTime = now;

      // Шаг эффектов не зависит от частоты кадров: скорость в «шагах» 60 Гц.
      this.effects.update(delta);

      this._resize();

      const aspect = this.canvas.width / this.canvas.height;
      const viewProj = this.camera.update(aspect);

      RMath.invert(this.invViewProj, viewProj);

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      gl.clearColor(
        this.palette.background[0],
        this.palette.background[1],
        this.palette.background[2],
        1
      );
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);

      gl.useProgram(this.lineProgram.program);
      gl.uniformMatrix4fv(this.lineProgram.uniforms.uViewProj, false, viewProj);
      GL3D.drawLines(gl, this.lineProgram, this.gridMesh, 0.5);
      GL3D.drawLines(gl, this.lineProgram, this.boxMesh, 0.3);

      gl.useProgram(this.meshProgram.program);
      gl.uniformMatrix4fv(this.meshProgram.uniforms.uViewProj, false, viewProj);
      gl.uniform3fv(this.meshProgram.uniforms.uEye, this.camera.eyePos);
      gl.uniform3fv(this.meshProgram.uniforms.uLightDir, LIGHT_DIR);

      this._drawBridges();
      this._drawIslands();
      this._drawGizmo();
      this._drawEffects();

      this._updateLabels();

      requestAnimationFrame(this._loopBound);
    }

    _drawBridges() {
      const gl = this.gl;
      const mp = this.meshProgram;

      gl.useProgram(mp.program);

      for (const entry of this.logic.bridges.values()) {
        const w1 = this.worldOf(entry.meta.p1);
        const w2 = this.worldOf(entry.meta.p2);

        if (entry.count >= 2) {
          const perp = (entry.meta.axis + 1) % 3;

          for (const sign of [-1, 1]) {
            const offset = [0, 0, 0];
            offset[perp] = sign * 0.13;

            RMath.modelTube(
              this.tmpModel,
              [w1[0] + offset[0], w1[1] + offset[1], w1[2] + offset[2]],
              [w2[0] + offset[0], w2[1] + offset[1], w2[2] + offset[2]],
              0.05
            );
            RMath.normalFromModel(this.tmpNormal, this.tmpModel);
            GL3D.drawMesh(
              gl, mp, this.tubeMesh, this.tmpModel, this.tmpNormal,
              this.palette.bridge, 0
            );
          }
        } else {
          RMath.modelTube(this.tmpModel, w1, w2, 0.06);
          RMath.normalFromModel(this.tmpNormal, this.tmpModel);
          GL3D.drawMesh(
            gl, mp, this.tubeMesh, this.tmpModel, this.tmpNormal,
            this.palette.bridge, 0
          );
        }
      }
    }

    _drawIslands() {
      const gl = this.gl;
      const mp = this.meshProgram;

      gl.useProgram(mp.program);

      for (const key of this.logic.islandKeys) {
        const world = this.worldOf(parseKey3d(key));
        const target = this.logic.islands.get(key);
        const current = this.logic.countAt(key);

        let color = this._islandColor(key);
        let highlight = 0;

        if (key === this.selectedKey) {
          color = this.palette.islandSelected;
          highlight = 0.22;
        } else if (this.candidates.indexOf(key) >= 0) {
          color = this.palette.islandCandidate;
          highlight = 0.1;
        } else if (current === target) {
          color = this.palette.islandSatisfied;
        }

        RMath.modelSphere(this.tmpModel, world, this.islandRadius);
        RMath.normalFromModel(this.tmpNormal, this.tmpModel);
        GL3D.drawMesh(
          gl, mp, this.sphereMesh, this.tmpModel, this.tmpNormal,
          color, highlight
        );
      }
    }

    /*
     * Искры над собранными островами, конфетти победы и фоновый слой
     * скина. Частицы рисуются после геометрии — поверх сцены.
     */
    _drawEffects() {
      const keys = this.logic.islandKeys;

      if (
        keys.length > 0 &&
        this.effects.sparkles.length < Effects.LIMITS.MAX_SPARKLES
      ) {
        const key = keys[Math.floor(Math.random() * keys.length)];

        if (this.logic.isSatisfied(key)) {
          this.effects.maybeSpawnSparkle(
            this.worldOf(parseKey3d(key)),
            this.logic.countAt(key) > 0,
            0.12
          );
        }
      }

      this.effects.syncAmbient(this.skin.ambient, [0, 0, 0], this._extent());

      this.effects.draw(this.gl, {
        meshProgram: this.meshProgram,
        sphereMesh: this.particleMesh,
        tubeMesh: this.tubeMesh,
        tmpModel: this.tmpModel,
        tmpNormal: this.tmpNormal
      });
    }

    _drawGizmo() {
      if (!this.selectedCoord) return;

      const gl = this.gl;
      const mp = this.meshProgram;

      gl.useProgram(mp.program);

      const base = this.worldOf(this.selectedCoord);
      const colors = [this.palette.axisX, this.palette.axisY, this.palette.axisZ];

      for (let axis = 0; axis < 3; axis++) {
        const dir = AXIS_DIRS[axis];
        const tip = [
          base[0] + dir[0] * ARM_LENGTH,
          base[1] + dir[1] * ARM_LENGTH,
          base[2] + dir[2] * ARM_LENGTH
        ];

        RMath.modelTube(this.tmpModel, base, tip, 0.045);
        RMath.normalFromModel(this.tmpNormal, this.tmpModel);
        GL3D.drawMesh(
          gl, mp, this.tubeMesh, this.tmpModel, this.tmpNormal,
          colors[axis], this.chosenAxis === axis ? 0.35 : 0
        );
      }
    }

    // ---------- подписи ----------

    _buildLabels() {
      if (!this.labelsEl) return;

      this.labelsEl.innerHTML = "";
      this.labels.clear();

      for (const key of this.logic.islandKeys) {
        const div = document.createElement("div");
        div.className = "label3d";
        this.labelsEl.appendChild(div);
        this.labels.set(key, div);
      }
    }

    _updateLabels() {
      if (!this.labelsEl) return;

      for (const key of this.logic.islandKeys) {
        const div = this.labels.get(key);

        if (!div) continue;

        const point = this.project(this.worldOf(parseKey3d(key)));

        if (!point) {
          div.style.display = "none";
          continue;
        }

        const target = this.logic.islands.get(key);
        const current = this.logic.countAt(key);

        div.style.display = "block";
        div.style.transform =
          "translate(-50%, -50%) translate(" +
          point.x.toFixed(1) + "px, " + point.y.toFixed(1) + "px)";
        div.textContent = current > 0 ? current + "/" + target : String(target);
        div.classList.toggle("done", current === target);
        div.classList.toggle("selected", key === this.selectedKey);
        div.classList.toggle("candidate", this.candidates.indexOf(key) >= 0);
      }
    }

    // ---------- статус ----------

    _updateStatus() {
      if (!this.statusEl) return;

      let satisfied = 0;

      for (const key of this.logic.islandKeys) {
        if (this.logic.isSatisfied(key)) satisfied++;
      }

      this.statusEl.textContent =
        "Уровень " + this.level +
        " · поле " + this.size + "×" + this.size + "×" + this.size +
        " · островов " + this.logic.islandKeys.length +
        " · собрано " + satisfied + "/" + this.logic.islandKeys.length;
    }

    /*
     * Баннер победы заодно сообщает, что даст кнопка «Расширить».
     */
    _showBanner() {
      if (this.bannerSubEl) {
        this.bannerSubEl.textContent =
          "Уровень " + this.level + " пройден! В следующем уровне " +
          "новых островов: " + expansionIslands(this.expansionsDone) + ".";
      }

      if (this.bannerEl) this.bannerEl.classList.remove("hidden");
    }

    _hideBanner() {
      if (this.bannerEl) this.bannerEl.classList.add("hidden");
    }
  }

  global.Bridges3DApp = Bridges3DApp;
})(typeof window !== "undefined" ? window : globalThis);
