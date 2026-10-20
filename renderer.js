/*
 * Скины — это только палитры отрисовки. Игровая логика, координаты,
 * размеры и правила от скина не зависят.
 */
const BRIDGE_SKINS = {
  default: {
    name: "Лазурные острова",
    description: "Классическая светлая лагуна",
    preview: "day",
    colors: {
      waterTop: "#7DD3FC",
      waterMid: "#22D3EE",
      waterDeep: "#0891B2",
      waterBottom: "#0369A1",
      waterSunStrong: "rgba(253, 224, 71, 0.16)",
      waterSunSoft: "rgba(253, 224, 71, 0.02)",
      waterDeepSoft: "rgba(7, 72, 103, 0.22)",
      waterDeepEdge: "rgba(7, 72, 103, 0.5)",
      waterVignette: "rgba(0, 40, 80, 0.18)",
      wave1: "rgba(255, 255, 255, 0.12)",
      wave2: "rgba(255, 255, 255, 0.08)",
      birdStroke: "rgba(35, 28, 23, 0.62)",
      birdFill: "rgba(35, 28, 23, 0.7)",

      dirtTop: "#8B6253",
      dirtBottom: "#4D342C",
      grassA: "#B7E08A",
      grassB: "#8BCB68",
      grassC: "#62AA56",
      grassD: "#438542",
      doneA: "#C4E89A",
      doneB: "#91CE70",
      doneC: "#62AA56",
      doneD: "#438542",
      overA: "#F18A80",
      overB: "#D85B53",
      overC: "#A83E38",
      outline: "#356B35",
      outlineDone: "#326F39",
      outlineOver: "#963832",

      treeTrunk: "#68473A",
      treeDark: "#438447",
      treeLight: "#57964D",
      treeDoneDark: "#4E944B",
      treeDoneLight: "#65A956",
      treeOutline: "#326B39",

      progressTrack: "rgba(48, 69, 46, 0.48)",
      progressFill: "#F4D27A",
      progressDot: "#FFF4C7",
      overRing: "rgba(194, 58, 51, 0.88)",
      overBadge: "#B83B35",
      numberGlow: "253, 224, 71",
      flower: "#FCD34D",
      flowerDone: "#FDE047",

      bridgeShadow: "rgba(45, 30, 22, 0.24)",
      woodTop: "#B88969",
      woodMid: "#A87558",
      woodBottom: "#80533F",
      woodHighlight: "rgba(225, 190, 155, 0.30)",
      plankLine: "rgba(91, 57, 42, 0.65)",
      plankLight: "rgba(235, 205, 170, 0.22)",
      plankShadeA: "rgba(70, 43, 32, 0.08)",
      plankShadeB: "rgba(255, 225, 190, 0.07)",
      beam: "#704836",
      rope: "rgba(91, 61, 45, 0.85)",
      ropeHanger: "rgba(70, 43, 32, 0.55)",
      nail: "#6E4736",
      woodTopLight: "rgba(255, 235, 205, 0.32)",
      woodEnd: "rgba(65, 40, 30, 0.22)",
      bridgeGap: "rgba(55, 39, 31, 0.30)"
    }
  },

  night: {
    name: "Лунная ночь",
    description: "Тёмная вода и серебряные мосты",
    preview: "night",
    colors: {
      waterTop: "#312E81",
      waterMid: "#1E3A8A",
      waterDeep: "#0F172A",
      waterBottom: "#020617",
      waterSunStrong: "rgba(226, 232, 240, 0.22)",
      waterSunSoft: "rgba(226, 232, 240, 0.04)",
      waterDeepSoft: "rgba(2, 6, 23, 0.35)",
      waterDeepEdge: "rgba(2, 6, 23, 0.7)",
      waterVignette: "rgba(0, 0, 0, 0.45)",
      wave1: "rgba(191, 219, 254, 0.18)",
      wave2: "rgba(191, 219, 254, 0.10)",
      birdStroke: "rgba(226, 232, 240, 0.7)",
      birdFill: "rgba(226, 232, 240, 0.78)",

      dirtTop: "#6B7280",
      dirtBottom: "#1F2937",
      grassA: "#A7F3D0",
      grassB: "#6EE7B7",
      grassC: "#10B981",
      grassD: "#047857",
      doneA: "#D9F99D",
      doneB: "#A3E635",
      doneC: "#65A30D",
      doneD: "#3F6212",
      overA: "#FDA4AF",
      overB: "#F43F5E",
      overC: "#9F1239",
      outline: "#065F46",
      outlineDone: "#3F6212",
      outlineOver: "#9F1239",

      treeTrunk: "#4B5563",
      treeDark: "#047857",
      treeLight: "#10B981",
      treeDoneDark: "#4D7C0F",
      treeDoneLight: "#65A30D",
      treeOutline: "#064E3B",

      progressTrack: "rgba(15, 23, 42, 0.6)",
      progressFill: "#A7F3D0",
      progressDot: "#ECFDF5",
      overRing: "rgba(244, 63, 94, 0.9)",
      overBadge: "#9F1239",
      numberGlow: "167, 243, 208",
      flower: "#FDE68A",
      flowerDone: "#FEF3C7",

      bridgeShadow: "rgba(2, 6, 23, 0.5)",
      woodTop: "#9CA3AF",
      woodMid: "#6B7280",
      woodBottom: "#374151",
      woodHighlight: "rgba(226, 232, 240, 0.18)",
      plankLine: "rgba(15, 23, 42, 0.7)",
      plankLight: "rgba(226, 232, 240, 0.14)",
      plankShadeA: "rgba(15, 23, 42, 0.18)",
      plankShadeB: "rgba(226, 232, 240, 0.06)",
      beam: "#1F2937",
      rope: "rgba(203, 213, 225, 0.85)",
      ropeHanger: "rgba(15, 23, 42, 0.6)",
      nail: "#111827",
      woodTopLight: "rgba(241, 245, 249, 0.24)",
      woodEnd: "rgba(2, 6, 23, 0.3)",
      bridgeGap: "rgba(15, 23, 42, 0.45)"
    }
  }
};

const SKIN_STORAGE_KEY = "bridges-skin";

class BridgesGameRenderer {
  constructor(canvasId, logic) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.logic = logic;
    this.statusElement = document.getElementById('gameStatus');

    this.gridSize = 7;
    this.cellSize = 85;
    this.offset = 60;

    this.colors = {
      water_base: "#4FC3F7",
      water_dark: "#0288D1",
      water_light: "#81D4FA",
      island_dirt: "#5D4037",
      island_grass: "#66BB6A",
      island_grass_light: "#81C784",
      island_shadow: "rgba(0,0,0,0.3)",
      bridge_wood: "#795548",
      bridge_plank: "#A1887F",
      bridge_rope: "#D7CCC8",
      btn_bg: "#FFB74D",
      btn_bg_hover: "#FFA726",
      btn_border: "#E65100",
      text_dark: "#3E2723",
      text_white: "#FFFFFF",
      progress_empty: "rgba(255,255,255,0.3)",
      progress_fill: "#4CAF50",
      progress_over: "#FF5252"
    };


    this.selectedIsland = null;
    this.hoveredIsland = null;
    this.btn1Hovered = false;
    this.btn2Hovered = false;
    this.isVictoryShown = false;

    // Вид: приближение и сдвиг карты.
    this.zoom = 1;
    this.minZoom = 1;
    this.maxZoom = 8;
    this.fitScale = 1;
    this.viewScale = 1;
    this.viewX = 0;
    this.viewY = 0;
    this.panning = null;
    this.pointers = new Map();
    this.pinch = null;
    this.hoverZoomBtn = null;

    // Режим бесконечного расширения: после каждой победы карта растёт.
    this.endless = true;

    // Сколько расширений уже сделано (нужно для растущего прироста островов).
    this.expansionsDone = 0;

    this.level = 1;

    this.levels = [
        { minIslands: 6,  maxIslands: 7,  gridSize: 7, name: "🌱 Начало" },
        { minIslands: 7,  maxIslands: 8,  gridSize: 7, name: "🌿 Тропа" },
        { minIslands: 8,  maxIslands: 9,  gridSize: 7, name: "🏡 Деревня" },
        { minIslands: 9,  maxIslands: 10, gridSize: 7, name: "🏰 Замок" },
        { minIslands: 10, maxIslands: 11, gridSize: 8, name: "⚔️ Испытание" },
        { minIslands: 11, maxIslands: 12, gridSize: 8, name: "🛡️ Крепость" },
        { minIslands: 12, maxIslands: 13, gridSize: 8, name: "👑 Королевство" },
        { minIslands: 13, maxIslands: 14, gridSize: 9, name: "🏯 Империя" },
        { minIslands: 14, maxIslands: 15, gridSize: 9, name: "🔥 Великий путь" },
        { minIslands: 15, maxIslands: 16, gridSize: 9, name: "🐉 Легенда" }
    ];
    
    this.time = 0;
    this.victoryAlpha = 0;
    this.lastMousePos = { x: 0, y: 0 };
    this.confetti = [];
    this.confettiStarted = false;
    this.sparkles = [];
    this.birds = [];

    for (let i = 0; i < 7; i++) {
        this.birds.push({
            x: Math.random() * 2000 - 400,
            y: Math.random() * 400 + 60,
            vx: 0.6 + Math.random() * 1.2,
            vy: (Math.random() - 0.5) * 0.4,
            flap: Math.random() * Math.PI * 2,
            scale: 0.8 + Math.random() * 0.7
        });
    }

    // Кэш статичной части мира.
    //
    // Мир разбит на кластеры-чанки. Мосты и острова рисуются в отдельные
    // offscreen-слои и перерисовываются только тогда, когда меняются.
    // Каждый кадр эти слои просто копируются на экран, поэтому игровой цикл
    // больше не пересчитывает и не перерисовывает всю карту заново.
    this.chunkSize = 256;
    this.chunkScale = 1;
    this.bridgeChunks = new Map();
    this.islandChunks = new Map();
    this.worldElements = null;
    this.waterCache = null;

    this.initSkin();

    this.updateCanvasGeometry();

    this.setupEvents();
    this.setupSkinUI();
    this.startAnimationLoop();
  }

  /**
   * Загружает сохранённый скин. Скин влияет только на палитру отрисовки.
   */
  initSkin() {
    let saved = null;

    try {
      saved = localStorage.getItem(SKIN_STORAGE_KEY);
    } catch (error) {
      saved = null;
    }

    const skinId = saved && BRIDGE_SKINS[saved] ? saved : "default";

    this.skinId = skinId;
    this.skin = BRIDGE_SKINS[skinId].colors;

    document.body.dataset.skin = skinId;
  }

  /**
   * Переключает скин и сбрасывает кэш мира, чтобы все чанки и вода
   * перерисовались с новой палитрой.
   */
  setSkin(skinId) {
    if (!BRIDGE_SKINS[skinId] || skinId === this.skinId) return false;

    this.skinId = skinId;
    this.skin = BRIDGE_SKINS[skinId].colors;

    document.body.dataset.skin = skinId;

    try {
      localStorage.setItem(SKIN_STORAGE_KEY, skinId);
    } catch (error) {
      // Сохранение необязательно: игра работает и без localStorage.
    }

    this.invalidateWorldCache();
    this.updateSkinUI();

    return true;
  }

  setupSkinUI() {
    this.skinModal = document.getElementById("skinModal");
    this.skinButton = document.getElementById("skinButton");
    this.skinClose = document.getElementById("skinClose");

    if (!this.skinModal || !this.skinButton) return;

    const open = () => {
      this.skinModal.hidden = false;
      document.body.classList.add("skin-modal-open");

      this.updateSkinUI();
      this.drawSkinPreviews();

      this.skinClose?.focus();
    };

    const close = () => {
      this.skinModal.hidden = true;
      document.body.classList.remove("skin-modal-open");

      this.skinButton.focus();
    };

    this.skinButton.addEventListener("click", open);

    this.skinClose?.addEventListener("click", close);

    this.skinModal
      .querySelectorAll("[data-close-skins]")
      .forEach((element) => element.addEventListener("click", close));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.skinModal.hidden) {
        close();
      }
    });

    this.skinModal.querySelectorAll("[data-skin-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.setSkin(button.dataset.skinId);
        close();
      });
    });

    this.updateSkinUI();
    this.drawSkinPreviews();
  }

  updateSkinUI() {
    if (!this.skinModal) return;

    this.skinModal
      .querySelectorAll("[data-skin-id]")
      .forEach((button) => {
        const active = button.dataset.skinId === this.skinId;

        button.classList.toggle("is-active", active);
        button.setAttribute(
          "aria-pressed",
          active ? "true" : "false"
        );
      });
  }

  drawSkinPreviews() {
    if (!this.skinModal) return;

    this.skinModal
      .querySelectorAll("canvas[data-preview-skin]")
      .forEach((canvas) => {
        const skin = BRIDGE_SKINS[canvas.dataset.previewSkin];

        if (skin) this.drawSkinPreview(canvas, skin);
      });
  }

  /**
   * Миниатюра-«скриншот» скина для карточки выбора.
   */
  drawSkinPreview(canvas, skin) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const c = skin.colors;

    ctx.clearRect(0, 0, w, h);

    const water = ctx.createLinearGradient(0, 0, w, h);
    water.addColorStop(0, c.waterTop);
    water.addColorStop(0.4, c.waterMid);
    water.addColorStop(1, c.waterDeep);

    ctx.fillStyle = water;
    ctx.fillRect(0, 0, w, h);

    const isNight = skin.preview === "night";

    /*
     * Солнце или луна.
     */
    ctx.save();
    ctx.fillStyle = isNight
      ? "rgba(226, 232, 240, 0.88)"
      : "rgba(253, 224, 71, 0.9)";
    ctx.shadowColor = isNight
      ? "rgba(226, 232, 240, 0.5)"
      : "rgba(253, 224, 71, 0.6)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.24, isNight ? 10 : 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isNight) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.beginPath();
      ctx.arc(w * 0.78 + 5, h * 0.24 - 3, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    /*
     * Волны.
     */
    ctx.strokeStyle = c.wave1;
    ctx.lineWidth = 1.2;

    for (let y = h * 0.4; y < h; y += 16) {
      ctx.beginPath();

      for (let x = -10; x <= w + 10; x += 16) {
        const yy = y + Math.sin(x * 0.08 + y) * 2;

        if (x === -10) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }

      ctx.stroke();
    }

    /*
     * Мост между островами.
     */
    const by = h * 0.58;

    const wood = ctx.createLinearGradient(0, by - 6, 0, by + 6);
    wood.addColorStop(0, c.woodTop);
    wood.addColorStop(0.5, c.woodMid);
    wood.addColorStop(1, c.woodBottom);

    ctx.fillStyle = wood;
    ctx.fillRect(w * 0.28, by - 5, w * 0.44, 10);

    ctx.strokeStyle = c.beam;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, by - 5);
    ctx.lineTo(w * 0.72, by - 5);
    ctx.moveTo(w * 0.28, by + 5);
    ctx.lineTo(w * 0.72, by + 5);
    ctx.stroke();

    /*
     * Два острова с числами.
     */
    const drawIsland = (x, y, radius) => {
      ctx.fillStyle = c.dirtBottom;
      ctx.beginPath();
      ctx.arc(x, y + 3, radius, 0, Math.PI * 2);
      ctx.fill();

      const grass = ctx.createRadialGradient(
        x - radius * 0.35,
        y - radius * 0.45,
        1,
        x,
        y,
        radius
      );

      grass.addColorStop(0, c.grassA);
      grass.addColorStop(0.6, c.grassB);
      grass.addColorStop(1, c.grassD);

      ctx.fillStyle = grass;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FFFDF7";
      ctx.font = `700 ${Math.round(radius * 0.9)}px "Fredoka", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("3", x, y + 1);
    };

    drawIsland(w * 0.30, h * 0.58, 16);
    drawIsland(w * 0.70, h * 0.58, 16);
  }

  startAnimationLoop() {
    let lastTimestamp = null;
    let animationFrameId = null;

    const animate = (timestamp) => {
      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
      }

      const deltaTime = Math.min(
        (timestamp - lastTimestamp) / 1000,
        0.05
      );

      lastTimestamp = timestamp;

      this.time += deltaTime * 1.2;

      if (this.isVictoryShown && this.victoryAlpha < 1) {
        this.victoryAlpha = Math.min(
          1,
          this.victoryAlpha + deltaTime * 2.4
        );
      }

      this.draw();

      animationFrameId = requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (animationFrameId !== null || document.hidden) {
        return;
      }

      lastTimestamp = null;
      animationFrameId = requestAnimationFrame(animate);
    };

    const stopAnimation = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      lastTimestamp = null;
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    });

    startAnimation();
  }

  setupEvents() {
      // Колесо мыши — приближение.
      this.canvas.addEventListener('wheel', (e) => {
          e.preventDefault();

          const pos = this.getMousePos(e);
          const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

          this.zoomAt(pos.x, pos.y, factor);
      }, { passive: false });

      this.canvas.addEventListener('pointermove', (e) => {
          const pos = this.getMousePos(e);

          if (e.pointerType === 'touch' && this.pointers.has(e.pointerId)) {
              this.pointers.set(e.pointerId, pos);
          }

          // Два пальца — приближение/отдаление.
          if (this.pinch && this.pointers.size >= 2) {
              this.updatePinch();
              return;
          }

          // Перетаскивание пустого места — сдвиг карты.
          if (this.panning && this.panning.pointerId === e.pointerId) {
              this.viewX =
                  this.panning.originX + (pos.x - this.panning.startX);
              this.viewY =
                  this.panning.originY + (pos.y - this.panning.startY);

              this.clampView();
              return;
          }

          this.lastMousePos = this.toWorld(pos.x, pos.y);

          this.onMouseMove(pos);

          if (this.selectedIsland && e.pointerType !== 'mouse') {
              this.canvas.setPointerCapture?.(e.pointerId);
          }
      });

      this.canvas.addEventListener('pointerdown', (e) => {
          const pos = this.getMousePos(e);

          // Второй палец — начинаем pinch.
          if (e.pointerType === 'touch') {
              this.pointers.set(e.pointerId, pos);

              if (this.pointers.size === 2) {
                  this.startPinch();
                  return;
              }

              if (this.pointers.size > 2) return;
          }

          // Средняя кнопка мыши — сдвиг карты.
          if (e.button === 1) {
              e.preventDefault();
              this.startPan(pos, e.pointerId);
              return;
          }

          // ПКМ: сразу удаляем мост под курсором.
          if (e.button === 2) {
              e.preventDefault();
              this.onContextMenu(pos);
              return;
          }

          // Только основная кнопка мыши / touch.
          if (e.button !== 0) return;

          // Кнопки приближения.
          const zoomButton = this.getZoomButtonClicked(pos.x, pos.y);

          if (zoomButton) {
              const cx = this.viewportW / 2;
              const cy = this.viewportH / 2;

              if (zoomButton === 'in') this.zoomAt(cx, cy, 1.4);
              if (zoomButton === 'out') this.zoomAt(cx, cy, 1 / 1.4);
              if (zoomButton === 'reset') this.resetView();

              return;
          }

          // На телефоне касание существующего моста удаляет его.
          if (e.pointerType === 'touch') {
              const bridge = this.findBridgeAtPos(pos.x, pos.y);

              if (bridge) {
                  const removed = this.logic.removeBridge(
                      bridge[0],
                      bridge[1]
                  );

                  if (removed) {
                      this.invalidateBridgeArea(
                          bridge[0],
                          bridge[1]
                      );
                  }

                  this.selectedIsland = null;
                  this.lastMousePos = this.toWorld(pos.x, pos.y);

                  if (removed && this.logic.checkVictory()) {
                      this.isVictoryShown = true;
                  }

                  return;
              }
          }

          // Клик по пустому месту начинает сдвиг карты.
          const island = this.getIslandAtPos(pos.x, pos.y);
          const overButton = this.isVictoryShown
              ? this.isOverVictoryButton(pos)
              : this.getBtnClicked(pos.x, pos.y) !== 0;

          if (!island && !overButton) {
              this.startPan(pos, e.pointerId);
              return;
          }

          this.onMouseDown(pos);

          if (this.selectedIsland) {
              this.canvas.setPointerCapture?.(e.pointerId);
          }
      });

      this.canvas.addEventListener('pointerup', (e) => {
          const pos = this.getMousePos(e);

          if (e.pointerType === 'touch') {
              this.pointers.delete(e.pointerId);

              if (this.pinch && this.pointers.size < 2) {
                  this.pinch = null;
              }
          }

          if (this.panning && this.panning.pointerId === e.pointerId) {
              this.panning = null;
              this.canvas.style.cursor = 'grab';

              if (this.canvas.hasPointerCapture?.(e.pointerId)) {
                  this.canvas.releasePointerCapture(e.pointerId);
              }

              return;
          }

          if (e.button !== 0) return;

          this.onMouseUp(pos);

          if (this.canvas.hasPointerCapture?.(e.pointerId)) {
              this.canvas.releasePointerCapture(e.pointerId);
          }
      });

      this.canvas.addEventListener('pointercancel', (e) => {
          this.pointers.delete(e.pointerId);
          this.pinch = null;
          this.panning = null;
          this.selectedIsland = null;

          if (this.canvas.hasPointerCapture?.(e.pointerId)) {
              this.canvas.releasePointerCapture(e.pointerId);
          }
      });

      this.canvas.addEventListener('contextmenu', (e) => {
          e.preventDefault();
      });

      // Клавиатура: + / − — зум, 0 — показать всю карту.
      this.canvas.addEventListener('keydown', (e) => {
          if (e.key === '+' || e.key === '=') {
              e.preventDefault();
              this.zoomAt(this.viewportW / 2, this.viewportH / 2, 1.25);
          } else if (e.key === '-' || e.key === '_') {
              e.preventDefault();
              this.zoomAt(this.viewportW / 2, this.viewportH / 2, 1 / 1.25);
          } else if (e.key === '0') {
              e.preventDefault();
              this.resetView();
          }
      });
  }

  isOverVictoryButton(pos) {
      if (!this.isVictoryShown) return false;

      const button = this.getVictoryButtonRect();

      return (
          pos.x >= button.x &&
          pos.x <= button.x + button.width &&
          pos.y >= button.y &&
          pos.y <= button.y + button.height
      );
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  updateCanvasGeometry() {
      const boardPadding = 35;

      // Размер игровой сетки в «мировых» пикселях.
      const boardSize = this.gridSize * this.cellSize;

      // Мир целиком (с отступами по краям).
      this.worldW = boardSize + boardPadding * 2;
      this.worldH = boardSize + boardPadding * 2;

      // Canvas ограничен по размеру, чтобы большие карты не тормозили:
      // на экран выводится вписанная карта, а приближение делает зум.
      const VIEW_LIMIT = 1100;
      this.fitScale = Math.min(1, VIEW_LIMIT / this.worldW);

      this.viewportW = Math.round(this.worldW * this.fitScale);
      this.viewportH = Math.round(this.worldH * this.fitScale);

      this.buttonBarHeight = 92;

      this.canvasW = this.viewportW;
      this.canvasH = this.viewportH + this.buttonBarHeight;

      this.canvas.width = this.canvasW;
      this.canvas.height = this.canvasH;

      // На небольших полях рисуем кластеры с запасом по чёткости,
      // чтобы приближение не превращало острова в мыло. На больших
      // картах память важнее, поэтому там остаётся масштаб 1:1.
      this.chunkScale = this.worldW <= 1200 ? 2 : 1;

      /*
        * offset — это координата ЦЕНТРА первой клетки.
        *
        * Поэтому к внешнему отступу добавляем половину клетки.
        */
      this.offset = boardPadding + this.cellSize / 2;

      // Новая карта — показываем её целиком.
      this.resetView();

      // Кнопки располагаем по центру нижней панели.
      const buttonWidth = 230;
      const buttonGap = 20;
      const buttonHeight = 45;

      const totalButtonsWidth = buttonWidth * 2 + buttonGap;
      const buttonsStartX = (this.canvasW - totalButtonsWidth) / 2;
      const buttonsY =
          this.viewportH + (this.buttonBarHeight - buttonHeight) / 2;

      this.btn1Coords = [
          buttonsStartX,
          buttonsY,
          buttonsStartX + buttonWidth,
          buttonsY + buttonHeight
      ];

      this.btn2Coords = [
          buttonsStartX + buttonWidth + buttonGap,
          buttonsY,
          buttonsStartX + buttonWidth * 2 + buttonGap,
          buttonsY + buttonHeight
      ];

      // Кнопки приближения в правом верхнем углу.
      const zSize = 34;
      const zGap = 8;
      const zX = this.canvasW - zSize - 12;
      const zY = 12;

      this.zoomInRect = { x: zX, y: zY, w: zSize, h: zSize };
      this.zoomOutRect = { x: zX, y: zY + zSize + zGap, w: zSize, h: zSize };
      this.zoomResetRect = {
          x: zX,
          y: zY + (zSize + zGap) * 2,
          w: zSize,
          h: zSize
      };

      // Геометрия мира изменилась: старые кластеры и вода больше не годятся.
      this.invalidateWorldCache();
  }

  /**
   * Полный сброс кэша мира. Вызывается при смене размера поля/карты.
   */
  invalidateWorldCache() {
      this.bridgeChunks.clear();
      this.islandChunks.clear();
      this.worldElements = null;
      this.waterCache = null;
  }

  /**
   * Индекс элементов мира: заранее посчитанные габариты мостов и островов.
   * Нужен, чтобы при сборке кластера рисовать только то, что попадает
   * в его границы, и не разбирать ключи повторно.
   */
  ensureWorldElements() {
      if (this.worldElements) return this.worldElements;

      const islandMargin = 42;
      // У двойного моста крайняя дорожка смещена на 11 px,
      // а канаты добавляют ещё 11 px. Запас нужен, чтобы кластер
      // не обрезал внешние дорожки.
      const bridgeMargin = 26;

      const islands = [];
      const bridges = [];

      for (const [key, target] of this.logic.islands.entries()) {
          const [r, c] = key.split(',').map(Number);

          if (!Number.isInteger(r) || !Number.isInteger(c)) continue;

          const cx = c * this.cellSize + this.offset;
          const cy = r * this.cellSize + this.offset;

          islands.push({
              key,
              r,
              c,
              target,
              cx,
              cy,
              minX: cx - islandMargin,
              maxX: cx + islandMargin,
              minY: cy - islandMargin,
              maxY: cy + islandMargin
          });
      }

      for (const meta of this.logic.getBridgeMetas()) {
          if (meta.invalid) continue;

          const count = this.logic.bridges.get(meta.edgeKey) || 0;

          const x1 = meta.c1 * this.cellSize + this.offset;
          const y1 = meta.r1 * this.cellSize + this.offset;
          const x2 = meta.c2 * this.cellSize + this.offset;
          const y2 = meta.r2 * this.cellSize + this.offset;

          bridges.push({
              meta,
              count,
              x1,
              y1,
              x2,
              y2,
              minX: Math.min(x1, x2) - bridgeMargin,
              maxX: Math.max(x1, x2) + bridgeMargin,
              minY: Math.min(y1, y2) - bridgeMargin,
              maxY: Math.max(y1, y2) + bridgeMargin
          });
      }

      this.worldElements = { islands, bridges };

      return this.worldElements;
  }

  /**
   * Сбрасывает только те кластеры, которые пересекает прямоугольник.
   */
  invalidateWorldArea(minX, minY, maxX, maxY) {
      const size = this.chunkSize;

      const firstCol = Math.max(0, Math.floor(minX / size));
      const lastCol = Math.floor(maxX / size);
      const firstRow = Math.max(0, Math.floor(minY / size));
      const lastRow = Math.floor(maxY / size);

      for (let row = firstRow; row <= lastRow; row++) {
          for (let col = firstCol; col <= lastCol; col++) {
              const key = `${col},${row}`;

              this.bridgeChunks.delete(key);
              this.islandChunks.delete(key);
          }
      }
  }

  /**
   * После добавления/удаления моста пересобираем индекс и сбрасываем
   * кластеры вокруг обоих островов: меняется и мост, и внешний вид
   * островов на его концах.
   */
  invalidateBridgeArea(i1, i2) {
      this.worldElements = null;
      this.ensureWorldElements();

      if (
          !Array.isArray(i1) ||
          !Array.isArray(i2) ||
          i1.length < 2 ||
          i2.length < 2
      ) {
          this.invalidateWorldCache();
          return;
      }

      const x1 = i1[1] * this.cellSize + this.offset;
      const y1 = i1[0] * this.cellSize + this.offset;
      const x2 = i2[1] * this.cellSize + this.offset;
      const y2 = i2[0] * this.cellSize + this.offset;

      const margin = 60;

      this.invalidateWorldArea(
          Math.min(x1, x2) - margin,
          Math.min(y1, y2) - margin,
          Math.max(x1, x2) + margin,
          Math.max(y1, y2) + margin
      );
  }

  getChunkKey(col, row) {
      return `${col},${row}`;
  }

  getBridgeChunk(col, row, width, height) {
      const key = this.getChunkKey(col, row);

      let canvas = this.bridgeChunks.get(key);

      if (canvas) return canvas;

      canvas = document.createElement('canvas');
      canvas.width = width * this.chunkScale;
      canvas.height = height * this.chunkScale;

      const chunkCtx = canvas.getContext('2d');
      const originX = col * this.chunkSize;
      const originY = row * this.chunkSize;

      chunkCtx.scale(this.chunkScale, this.chunkScale);
      chunkCtx.translate(-originX, -originY);

      const previousCtx = this.ctx;
      this.ctx = chunkCtx;

      try {
          for (const bridge of this.ensureWorldElements().bridges) {
              if (
                  bridge.maxX < originX ||
                  bridge.minX > originX + width ||
                  bridge.maxY < originY ||
                  bridge.minY > originY + height
              ) {
                  continue;
              }

              this.drawMedievalBridge(
                  bridge.x1,
                  bridge.y1,
                  bridge.x2,
                  bridge.y2,
                  bridge.count
              );
          }
      } finally {
          this.ctx = previousCtx;
      }

      this.bridgeChunks.set(key, canvas);

      return canvas;
  }

  getIslandChunk(col, row, width, height) {
      const key = this.getChunkKey(col, row);

      let canvas = this.islandChunks.get(key);

      if (canvas) return canvas;

      canvas = document.createElement('canvas');
      canvas.width = width * this.chunkScale;
      canvas.height = height * this.chunkScale;

      const chunkCtx = canvas.getContext('2d');
      const originX = col * this.chunkSize;
      const originY = row * this.chunkSize;

      chunkCtx.scale(this.chunkScale, this.chunkScale);
      chunkCtx.translate(-originX, -originY);

      const previousCtx = this.ctx;
      this.ctx = chunkCtx;

      try {
          for (const island of this.ensureWorldElements().islands) {
              if (
                  island.maxX < originX ||
                  island.minX > originX + width ||
                  island.maxY < originY ||
                  island.minY > originY + height
              ) {
                  continue;
              }

              const current = this.logic.getIslandBridgesCount([
                  island.r,
                  island.c
              ]);

              const isComplete = current === island.target;

              this.drawCartoonIsland(
                  island.cx,
                  island.cy,
                  island.target,
                  current,
                  false,
                  false
              );

              this.drawIslandDecorations(
                  island.cx,
                  island.cy,
                  island.target,
                  isComplete
              );
          }
      } finally {
          this.ctx = previousCtx;
      }

      this.islandChunks.set(key, canvas);

      return canvas;
  }

  /**
   * Рисует статичные кластеры мостов и островов.
   * Мосты всегда ниже островов, поэтому слои копируются по очереди.
   */
  drawWorldChunks() {
      const ctx = this.ctx;
      const size = this.chunkSize;

      const left = Math.max(0, -this.viewX / this.viewScale);
      const top = Math.max(0, -this.viewY / this.viewScale);
      const right = Math.min(
          this.worldW,
          (this.viewportW - this.viewX) / this.viewScale
      );
      const bottom = Math.min(
          this.worldH,
          (this.viewportH - this.viewY) / this.viewScale
      );

      if (right <= left || bottom <= top) return;

      const firstCol = Math.max(0, Math.floor(left / size));
      const firstRow = Math.max(0, Math.floor(top / size));

      const lastCol = Math.min(
          Math.ceil(this.worldW / size) - 1,
          Math.floor(right / size)
      );

      const lastRow = Math.min(
          Math.ceil(this.worldH / size) - 1,
          Math.floor(bottom / size)
      );

      // Слой мостов.
      for (let row = firstRow; row <= lastRow; row++) {
          for (let col = firstCol; col <= lastCol; col++) {
              const originX = col * size;
              const originY = row * size;

              const width = Math.min(size, this.worldW - originX);
              const height = Math.min(size, this.worldH - originY);

              if (width <= 0 || height <= 0) continue;

              const chunk = this.getBridgeChunk(
                  col,
                  row,
                  width,
                  height
              );

              ctx.drawImage(
                  chunk,
                  0,
                  0,
                  chunk.width,
                  chunk.height,
                  originX,
                  originY,
                  width,
                  height
              );
          }
      }

      // Слой островов.
      for (let row = firstRow; row <= lastRow; row++) {
          for (let col = firstCol; col <= lastCol; col++) {
              const originX = col * size;
              const originY = row * size;

              const width = Math.min(size, this.worldW - originX);
              const height = Math.min(size, this.worldH - originY);

              if (width <= 0 || height <= 0) continue;

              const chunk = this.getIslandChunk(
                  col,
                  row,
                  width,
                  height
              );

              ctx.drawImage(
                  chunk,
                  0,
                  0,
                  chunk.width,
                  chunk.height,
                  originX,
                  originY,
                  width,
                  height
              );
          }
      }
  }

  /**
   * Подсветка наведения/выбора — динамический слой поверх статичного кэша.
   */
  drawIslandHighlights() {
      const drawOne = (island, isSelected) => {
          if (!island) return;

          const cx = island[1] * this.cellSize + this.offset;
          const cy = island[0] * this.cellSize + this.offset;

          const isHovered =
              !isSelected &&
              this.hoveredIsland &&
              this.hoveredIsland[0] === island[0] &&
              this.hoveredIsland[1] === island[1];

          this.drawIslandHighlight(
              cx,
              cy,
              isHovered,
              isSelected
          );
      };

      const sameIsland = (first, second) =>
          Boolean(
              first &&
              second &&
              first[0] === second[0] &&
              first[1] === second[1]
          );

      if (!sameIsland(this.hoveredIsland, this.selectedIsland)) {
          drawOne(this.hoveredIsland, false);
      }

      drawOne(this.selectedIsland, true);
  }

  /**
   * Показывает всю карту целиком.
   */
  resetView() {
      this.zoom = this.minZoom;
      this.viewScale = this.fitScale;
      this.viewX = (this.viewportW - this.worldW * this.viewScale) / 2;
      this.viewY = (this.viewportH - this.worldH * this.viewScale) / 2;
  }

  /**
   * Не даёт утащить карту за пределы экрана и центрирует её,
   * если она меньше окна.
   */
  clampView() {
      this.viewScale = this.fitScale * this.zoom;

      const contentW = this.worldW * this.viewScale;
      const contentH = this.worldH * this.viewScale;

      if (contentW <= this.viewportW) {
          this.viewX = (this.viewportW - contentW) / 2;
      } else {
          this.viewX = Math.min(
              0,
              Math.max(this.viewportW - contentW, this.viewX)
          );
      }

      if (contentH <= this.viewportH) {
          this.viewY = (this.viewportH - contentH) / 2;
      } else {
          this.viewY = Math.min(
              0,
              Math.max(this.viewportH - contentH, this.viewY)
          );
      }
  }

  /**
   * Приближение вокруг точки экрана.
   */
  zoomAt(screenX, screenY, factor) {
      const newZoom = Math.max(
          this.minZoom,
          Math.min(this.maxZoom, this.zoom * factor)
      );

      if (Math.abs(newZoom - this.zoom) < 1e-4) {
          return;
      }

      const oldScale = this.viewScale;

      // Мировая точка под курсором.
      const wx = (screenX - this.viewX) / oldScale;
      const wy = (screenY - this.viewY) / oldScale;

      this.zoom = newZoom;
      this.viewScale = this.fitScale * this.zoom;

      this.viewX = screenX - wx * this.viewScale;
      this.viewY = screenY - wy * this.viewScale;

      this.clampView();
  }

  toWorld(x, y) {
      return {
          x: (x - this.viewX) / this.viewScale,
          y: (y - this.viewY) / this.viewScale
      };
  }

  getZoomButtonClicked(x, y) {
      const hit = (rect) =>
          rect &&
          x >= rect.x &&
          x <= rect.x + rect.w &&
          y >= rect.y &&
          y <= rect.y + rect.h;

      if (hit(this.zoomInRect)) return 'in';
      if (hit(this.zoomOutRect)) return 'out';
      if (hit(this.zoomResetRect)) return 'reset';

      return null;
  }

  startPan(pos, pointerId) {
      this.panning = {
          pointerId,
          startX: pos.x,
          startY: pos.y,
          originX: this.viewX,
          originY: this.viewY
      };

      this.selectedIsland = null;
      this.canvas.style.cursor = 'grabbing';
      this.canvas.setPointerCapture?.(pointerId);
  }

  startPinch() {
      const points = [...this.pointers.values()];

      if (points.length < 2) return;

      const [a, b] = points;

      this.pinch = {
          distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
          zoom: this.zoom,
          centerX: (a.x + b.x) / 2,
          centerY: (a.y + b.y) / 2
      };

      this.panning = null;
      this.selectedIsland = null;
  }

  updatePinch() {
      const points = [...this.pointers.values()];

      if (points.length < 2 || !this.pinch) return;

      const [a, b] = points;
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;

      this.zoomAt(
          this.pinch.centerX,
          this.pinch.centerY,
          distance / this.pinch.distance
      );

      // Двигаем карту вслед за пальцами.
      this.viewX += centerX - this.pinch.centerX;
      this.viewY += centerY - this.pinch.centerY;

      this.pinch.distance = distance;
      this.pinch.centerX = centerX;
      this.pinch.centerY = centerY;
      this.pinch.zoom = this.zoom;

      this.clampView();
  }

  /**
   * Сложность уровня: 0 — легко, 1 — максимум.
   */
  getDifficulty() {
      return Math.min(1, (Math.max(1, this.level) - 1) / 14);
  }

  /**
   * Вероятность двойного моста. Именно она делает карты сложнее:
   * числа на островах растут, а вариантов распределения становится меньше.
   * Между одной парой островов допустимо не более двух мостов.
   */
  getDoubleChance() {
      return 0.15 + 0.6 * this.getDifficulty();
  }

  generateNewLevel(level = this.level) {
    // Для бесконечного режима уровни за пределами кампании
    // генерируются на текущем размере поля.
    const profile = this.levels[level - 1] ?? {
        minIslands: 8,
        maxIslands: 12,
        gridSize: this.gridSize,
        name: "🧭 Новые земли"
    };

    const success = this.logic.generateValidLevel({
        minIslands: profile.minIslands,
        maxIslands: profile.maxIslands,
        gridSize: profile.gridSize,
        doubleChance: this.getDoubleChance()
    });

    if (success) {
      this.gridSize = profile.gridSize;

      this.updateCanvasGeometry();

      this.selectedIsland = null;
      this.hoveredIsland = null;
      this.lastMousePos = { x: 0, y: 0 };

      if (this.statusElement) {
          this.statusElement.textContent =
              `Уровень ${this.level}: ${profile.name} · ` +
              `двойных связей: ${Math.round(this.getDoubleChance() * 100)}% · ` +
              `мостов на связь: до ${this.logic.maxBridgeCount}`;
      }
    } else if (this.statusElement) {
        this.statusElement.textContent =
            this.logic.islands.size > 0
                ? "Не удалось создать новую карту. Предыдущая карта сохранена."
                : "Не удалось создать уровень. Попробуйте обновить страницу.";
    }

    return success;
}

  /**
   * Расширяет пройденную карту и начинает следующий уровень.
   * Старые острова и уже построенные мосты остаются на месте,
   * вокруг поля появляются новые острова.
   */
  expandLevel() {
    // Каждое следующее расширение добавляет на 2 острова больше:
    // 2, 4, 6, 8, ...
    const addIslands = 2 * (this.expansionsDone + 1);

    // Под растущее число островов даём и больше места. Новые острова
    // теперь ищут самые свободные клетки по всей карте, а не только
    // во внешней полосе, поэтому поле растёт умеренно. Небольшой запас
    // нужен, чтобы внешней полосы хватало на уникальные строки и
    // столбцы новых листьев без лишних повторных попыток.
    const growth = Math.max(
        2,
        2 * Math.ceil(addIslands / 4) +
            (addIslands >= 8 ? 2 : 0)
    );

    const success = this.logic.expandLevel({
        growth,
        addIslands,
        doubleChance: this.getDoubleChance()
    });

    if (!success) {
        if (this.statusElement) {
            this.statusElement.textContent =
                "Не удалось расширить карту. Нажмите ещё раз.";
        }

        return false;
    }

    this.level++;
    this.expansionsDone++;
    this.gridSize = this.logic.gridSize;

    this.updateCanvasGeometry();

    this.selectedIsland = null;
    this.hoveredIsland = null;
    this.lastMousePos = { x: 0, y: 0 };

    this.isVictoryShown = false;
    this.victoryAlpha = 0;
    this.confettiStarted = false;

    if (this.statusElement) {
        this.statusElement.textContent =
            `Уровень ${this.level}: карта расширена, старые мосты сохранены. ` +
            `Добавлено островов: ${addIslands}. ` +
            `Двойных связей: ${Math.round(this.getDoubleChance() * 100)}%. ` +
            `Всего: ${this.logic.islands.size}, поле ${this.gridSize}×${this.gridSize}`;
    }

    return true;
  }


  getIslandAtPos(x, y) {
      const p = this.toWorld(x, y);
      return this.logic.getIslandAtPos(p.x, p.y, this.cellSize, this.offset);
  }

  findBridgeAtPos(x, y) {
      // Переводим экранные координаты в мировые (с учётом зума).
      const world = this.toWorld(x, y);

      x = world.x;
      y = world.y;
      // Для двойного моста крайняя дорожка смещена на 11 px,
      // плюс половина толщины настила. Радиус должен её доставать.
      const HIT_RADIUS = 18;
      const END_MARGIN = 30;

      for (const edgeKey of this.logic.bridges.keys()) {
          const [k1, k2] = edgeKey.split('-');

          const [r1, c1] = k1.split(',').map(Number);
          const [r2, c2] = k2.split(',').map(Number);

          const x1 = c1 * this.cellSize + this.offset;
          const y1 = r1 * this.cellSize + this.offset;

          const x2 = c2 * this.cellSize + this.offset;
          const y2 = r2 * this.cellSize + this.offset;

          const dx = x2 - x1;
          const dy = y2 - y1;

          const lengthSquared = dx * dx + dy * dy;

          if (lengthSquared === 0) continue;

          let t =
              ((x - x1) * dx + (y - y1) * dy) /
              lengthSquared;

          // Не позволяем удалить мост кликом по самому острову.
          const length = Math.sqrt(lengthSquared);
          const margin = END_MARGIN / length;

          if (t < margin || t > 1 - margin) {
              continue;
          }

          t = Math.max(0, Math.min(1, t));

          const closestX = x1 + t * dx;
          const closestY = y1 + t * dy;

          const distance = Math.hypot(
              x - closestX,
              y - closestY
          );

          if (distance <= HIT_RADIUS) {
              return [
                  [r1, c1],
                  [r2, c2]
              ];
          }
      }

      return null;
  }
  
  getBtnClicked(x, y) {
    const [x1, y1, x2, y2] = this.btn1Coords;
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return 1;
    const [x3, y3, x4, y4] = this.btn2Coords;
    if (x >= x3 && x <= x4 && y >= y3 && y <= y4) return 2;
    return 0;
  }

  getVictoryButtonRect() {
    const width = 200;
    const height = 45;

    return {
      x: this.canvasW / 2 - width / 2,
      y: this.canvasH / 2 + 50,
      width,
      height
    };
  }

  onMouseMove(pos) {
    const zoomButton = this.getZoomButtonClicked(pos.x, pos.y);
    this.hoverZoomBtn = zoomButton;

    if (this.isVictoryShown) {
        this.canvas.style.cursor = zoomButton ? 'pointer' : 'default';
        return;
    }

    const island = this.getIslandAtPos(pos.x, pos.y);
    const islandChanged = JSON.stringify(island) !== JSON.stringify(this.hoveredIsland);
    if (islandChanged) this.hoveredIsland = island;

    const btn = this.getBtnClicked(pos.x, pos.y);
    const btnChanged = (btn === 1) !== this.btn1Hovered || (btn === 2) !== this.btn2Hovered;
    if (btnChanged) { this.btn1Hovered = (btn === 1); this.btn2Hovered = (btn === 2); }

    this.canvas.style.cursor = (zoomButton || btn || island) ? 'pointer' : 'grab';
  }

  onMouseDown(pos) {
    if (this.isVictoryShown) {
        const button = this.getVictoryButtonRect();

        if (
            pos.x >= button.x &&
            pos.x <= button.x + button.width &&
            pos.y >= button.y &&
            pos.y <= button.y + button.height
        ) {
            // Бесконечный режим: расширяем пройденную карту.
            if (this.endless) {
                this.expandLevel();
                return;
            }

            // Кампания завершена.
            // Начинаем её заново с первого уровня.
            if (this.level >= this.levels.length) {
                this.level = 1;
            } else {
                this.level++;
            }

            if (this.generateNewLevel(this.level)) {
                this.isVictoryShown = false;
                this.victoryAlpha = 0;
                this.confettiStarted = false;
                this.selectedIsland = null;
                this.hoveredIsland = null;
            }
        }

        return;
    }


    const btn = this.getBtnClicked(pos.x, pos.y);
    if (btn === 1) {
        if (this.generateNewLevel()) {
            this.selectedIsland = null;
            this.hoveredIsland = null;
        }
        return;
    }

    if (btn === 2) {
        this.logic.reset();
        this.invalidateWorldCache();
        this.selectedIsland = null;
        this.hoveredIsland = null;
        return;
    }

    const island = this.getIslandAtPos(pos.x, pos.y);
    if (island) this.selectedIsland = island;
  }

  onMouseUp(pos) {
    if (this.selectedIsland && !this.isVictoryShown) {
      const targetIsland = this.getIslandAtPos(pos.x, pos.y);
      if (targetIsland && JSON.stringify(targetIsland) !== JSON.stringify(this.selectedIsland)) {
        const added = this.logic.addBridge(
            this.selectedIsland,
            targetIsland
        );

        if (added) {
            this.invalidateBridgeArea(
                this.selectedIsland,
                targetIsland
            );
        } else {
            this.flashWarning();
        }
      }
      this.selectedIsland = null;
      if (this.logic.checkVictory()) this.isVictoryShown = true;
    }
  }

  onContextMenu(pos) {
      if (this.isVictoryShown) return;

      const bridge = this.findBridgeAtPos(pos.x, pos.y);

      if (!bridge) {
          return;
      }

      const removed = this.logic.removeBridge(
          bridge[0],
          bridge[1]
      );

      if (removed) {
          this.invalidateBridgeArea(
              bridge[0],
              bridge[1]
          );

          this.selectedIsland = null;

          if (this.logic.checkVictory()) {
              this.isVictoryShown = true;
          }
      }
  }

  flashWarning() {
    this.canvas.style.transform = "translateX(-5px)";
    setTimeout(() => this.canvas.style.transform = "translateX(5px)", 50);
    setTimeout(() => this.canvas.style.transform = "translateX(-5px)", 100);
    setTimeout(() => this.canvas.style.transform = "translateX(0)", 150);
  }

  /**
   * Статичная основа воды: градиент, свечение и затемнение по краям.
   * Строится один раз на текущую геометрию мира и дальше просто копируется.
   */
  buildWaterCache() {
      const maxDimension = Math.max(this.worldW, this.worldH);
      const scale = Math.min(1, 1600 / maxDimension);

      const width = Math.max(1, Math.round(this.worldW * scale));
      const height = Math.max(1, Math.round(this.worldH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');

      const gradient = ctx.createLinearGradient(0, 0, width, height);

      gradient.addColorStop(0, this.skin.waterTop);
      gradient.addColorStop(0.30, this.skin.waterMid);
      gradient.addColorStop(0.70, this.skin.waterDeep);
      gradient.addColorStop(1, this.skin.waterBottom);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      /*
       * Солнечный отблеск на воде.
       */
      const sun = ctx.createRadialGradient(
          width * 0.5,
          height * 0.14,
          0,
          width * 0.5,
          height * 0.14,
          width * 0.95
      );

      sun.addColorStop(0, this.skin.waterSunStrong);
      sun.addColorStop(0.45, this.skin.waterSunSoft);
      sun.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = sun;
      ctx.fillRect(0, 0, width, height);

      /*
       * Глубина у краёв света.
       */
      const deep = ctx.createLinearGradient(0, height * 0.5, 0, height);

      deep.addColorStop(0, "rgba(255, 255, 255, 0)");
      deep.addColorStop(0.65, this.skin.waterDeepSoft);
      deep.addColorStop(1, this.skin.waterDeepEdge);

      ctx.fillStyle = deep;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(
          width * 0.25,
          height * 0.12,
          0,
          width * 0.25,
          height * 0.12,
          width * 0.8
      );

      glow.addColorStop(0, "rgba(255,255,255,0.20)");
      glow.addColorStop(0.45, "rgba(255,255,255,0.06)");
      glow.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      const vignette = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.28,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.72
      );

      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(0.72, "rgba(0,40,80,0.04)");
      vignette.addColorStop(1, this.skin.waterVignette);

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      this.waterCache = { canvas, width, height };
  }

  /**
   * Вода: статичная основа + лёгкая анимация бликов поверх неё.
   */
  drawWater() {
      if (
          !this.waterCache ||
          this.waterCache.worldW !== this.worldW ||
          this.waterCache.worldH !== this.worldH
      ) {
          this.buildWaterCache();
          this.waterCache.worldW = this.worldW;
          this.waterCache.worldH = this.worldH;
      }

      this.ctx.drawImage(
          this.waterCache.canvas,
          0,
          0,
          this.waterCache.width,
          this.waterCache.height,
          0,
          0,
          this.worldW,
          this.worldH
      );

      this.drawWaterAnimation();
  }

  drawWaterAnimation() {
      const w = this.worldW;
      const h = this.worldH;

      /*
      * Медленные горизонтальные ряби.
      *
      * Они двигаются достаточно медленно, чтобы вода
      * ощущалась живой, но не отвлекала от головоломки.
      */
      this.ctx.save();

      const waveSpacing = 48;
      const waveOffset = (this.time * 18) % waveSpacing;

      this.ctx.lineWidth = 1.5;

      for (let row = -waveSpacing; row < h + waveSpacing; row += waveSpacing) {
          const y = row + waveOffset;

          this.ctx.strokeStyle = this.skin.wave1;

          this.ctx.beginPath();

          for (let x = -40; x <= w + 40; x += 32) {
              const wave =
                  Math.sin(
                      x * 0.035 +
                      this.time * 1.2 +
                      row * 0.03
                  ) * 3;

              if (x === -40) {
                  this.ctx.moveTo(x, y + wave);
              } else {
                  this.ctx.lineTo(x, y + wave);
              }
          }

          this.ctx.stroke();
      }

      /*
       * Вторая, более редкая волна, движется в ту же сторону, но медленнее.
       */
      const waveSpacing2 = 64;
      const waveOffset2 = (this.time * 10) % waveSpacing2;

      this.ctx.lineWidth = 1.2;
      this.ctx.strokeStyle = this.skin.wave2;

      for (let row = -waveSpacing2; row < h + waveSpacing2; row += waveSpacing2) {
          const y = row + waveOffset2;

          this.ctx.beginPath();

          for (let x = -40; x <= w + 40; x += 40) {
              const wave =
                  Math.sin(x * 0.025 - this.time * 0.9 + row * 0.02) * 2.5;

              if (x === -40) {
                  this.ctx.moveTo(x, y + wave);
              } else {
                  this.ctx.lineTo(x, y + wave);
              }
          }

          this.ctx.stroke();
      }

      /*
       * Каустики — движущиеся светлые пятна от «линзы» воды.
       */
      this.ctx.save();
      this.ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < 6; i++) {
          const cx2 = ((i * 137 + this.time * 22) % (w + 80)) - 40;
          const cy2 = ((i * 91 + this.time * 15) % (h + 80)) - 40;
          const size = 30 + Math.sin(this.time + i) * 10;
          const alpha = 0.06 + Math.sin(this.time * 1.3 + i) * 0.03;

          const grad = this.ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, size);
          grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          grad.addColorStop(1, "rgba(255, 255, 255, 0)");

          this.ctx.fillStyle = grad;
          this.ctx.fillRect(cx2 - size, cy2 - size, size * 2, size * 2);
      }

      this.ctx.restore();

      this.ctx.restore();

      /*
      * Небольшие мягкие блики.
      *
      * Их положение детерминировано, поэтому они не
      * создаются заново каждый кадр.
      */
      this.ctx.save();

      for (let i = 0; i < 12; i++) {
          const baseX = (i * 83 + 37) % w;
          const baseY = (i * 61 + 29) % h;

          const x =
              (baseX + this.time * (5 + (i % 3))) % (w + 40) - 20;

          const y =
              baseY +
              Math.sin(this.time * 0.7 + i) * 7;

          const alpha =
              0.10 +
              Math.sin(this.time * 1.1 + i) * 0.04;

          this.ctx.fillStyle = `rgba(255,255,255,${alpha})`;

          this.ctx.beginPath();

          this.ctx.ellipse(
              x,
              y,
              10 + (i % 3) * 4,
              2,
              -0.12,
              0,
              Math.PI * 2
          );

          this.ctx.fill();
      }

      this.ctx.restore();
  }

  /**
   * Птицы над водой — чисто декоративный динамический слой.
   * Летят медленно, обтекают мир по горизонтали.
   */
  drawBirds() {
      if (!this.worldW || !this.worldH) return;

      this.ctx.save();

      this.ctx.fillStyle = this.skin.birdFill;
      this.ctx.strokeStyle = this.skin.birdStroke;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";

      for (const b of this.birds) {
          b.x += b.vx;
          b.y += b.vy;
          b.flap += 0.3;

          if (b.x > this.worldW + 60) {
              b.x = -60;
              b.y = Math.random() * (this.worldH * 0.5) + 40;
          }
          if (b.y < 20) b.vy = Math.abs(b.vy);
          if (b.y > this.worldH - 20) b.vy = -Math.abs(b.vy);

          const s = b.scale;
          const flap = Math.sin(b.flap);
          const tipY = (-1.2 - flap * 2.8) * s;
          const controlY = (-4.8 - flap * 2.4) * s;

          this.ctx.save();
          this.ctx.translate(b.x, b.y);

          // Птица всегда летит головой вперёд.
          this.ctx.scale(b.vx < 0 ? -1 : 1, 1);

          /*
           * Крылья рисуем одной плавной «чайкой». Тонкая линия
           * с изгибом читается как птица гораздо лучше, чем
           * сплошной широкий силуэт.
           */
          this.ctx.lineWidth = Math.max(1.1, 1.5 * s);
          this.ctx.beginPath();
          this.ctx.moveTo(-9 * s, tipY);
          this.ctx.quadraticCurveTo(-4.5 * s, controlY, 0, 0);
          this.ctx.quadraticCurveTo(4.5 * s, controlY, 9 * s, tipY);
          this.ctx.stroke();

          /*
           * Раздвоенный хвост.
           */
          this.ctx.beginPath();
          this.ctx.moveTo(-1.6 * s, 0.25 * s);
          this.ctx.lineTo(-4.4 * s, -0.25 * s);
          this.ctx.moveTo(-1.6 * s, 0.35 * s);
          this.ctx.lineTo(-4.6 * s, 0.85 * s);
          this.ctx.stroke();

          /*
           * Корпус и клюв.
           */
          this.ctx.beginPath();
          this.ctx.ellipse(
              0,
              0.35 * s,
              2.2 * s,
              0.9 * s,
              0,
              0,
              Math.PI * 2
          );
          this.ctx.fill();

          this.ctx.beginPath();
          this.ctx.moveTo(2.0 * s, 0.1 * s);
          this.ctx.lineTo(3.9 * s, 0.3 * s);
          this.ctx.lineTo(2.0 * s, 0.72 * s);
          this.ctx.closePath();
          this.ctx.fill();

          this.ctx.restore();
      }

      this.ctx.restore();
  }

  /**
   * Мелкие искорки над выполненными островами.
   */
  drawIslandSparkles() {
      const islands = Array.from(this.logic.islands.keys());

      if (islands.length === 0) return;

      if (Math.random() < 0.1) {
          const key = islands[Math.floor(Math.random() * islands.length)];
          const [r, c] = key.split(",").map(Number);

          const current = this.logic.getIslandBridgesCount([r, c]);
          const target = this.logic.islands.get(key);

          if (current === target && current > 0) {
              const cx = c * this.cellSize + this.offset;
              const cy = r * this.cellSize + this.offset;

              this.sparkles.push({
                  x: cx + (Math.random() - 0.5) * 44,
                  y: cy + (Math.random() - 0.5) * 44,
                  vx: (Math.random() - 0.5) * 0.6,
                  vy: -0.5 - Math.random() * 0.9,
                  size: 1.5 + Math.random() * 2.5,
                  life: 0,
                  maxLife: 18 + Math.random() * 22
              });
          }
      }

      this.ctx.save();
      this.ctx.fillStyle = "#FDE047";

      for (let i = this.sparkles.length - 1; i >= 0; i--) {
          const s = this.sparkles[i];

          s.x += s.vx;
          s.y += s.vy;
          s.life++;

          const t = s.life / s.maxLife;

          if (t >= 1) {
              this.sparkles.splice(i, 1);
              continue;
          }

          this.ctx.globalAlpha = 1 - t;
          this.ctx.beginPath();
          this.ctx.arc(s.x, s.y, s.size * (1 - t), 0, Math.PI * 2);
          this.ctx.fill();
      }

      this.ctx.restore();
  }

  /**
   * Конфетти при победе.
   */
  startConfetti() {
      if (this.confettiStarted) return;
      this.confettiStarted = true;

      const colors = [
          "#FDE047",
          "#FBBF24",
          "#EF4444",
          "#10B981",
          "#3B82F6",
          "#E879F9"
      ];

      for (let i = 0; i < 90; i++) {
          this.confetti.push({
              x: this.canvasW / 2 + (Math.random() - 0.5) * 140,
              y: this.canvasH / 2 + (Math.random() - 0.5) * 100,
              vx: (Math.random() - 0.5) * 7,
              vy: -2 - Math.random() * 5,
              rot: Math.random() * Math.PI * 2,
              vr: (Math.random() - 0.5) * 0.25,
              color: colors[Math.floor(Math.random() * colors.length)],
              size: 4 + Math.random() * 6,
              life: 0,
              maxLife: 50 + Math.random() * 110,
              gravity: 0.15 + Math.random() * 0.25
          });
      }
  }

  drawConfetti() {
      this.ctx.save();

      for (let i = this.confetti.length - 1; i >= 0; i--) {
          const p = this.confetti[i];

          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.rot += p.vr;
          p.life++;

          const t = p.life / p.maxLife;

          if (t >= 1 || p.y > this.canvasH + 60) {
              this.confetti.splice(i, 1);
              continue;
          }

          this.ctx.save();
          this.ctx.translate(p.x, p.y);
          this.ctx.rotate(p.rot);
          this.ctx.globalAlpha = 1 - t;
          this.ctx.fillStyle = p.color;
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.7);
          this.ctx.restore();
      }

      this.ctx.restore();
  }

  /**
   * Подсветка выбранного/наведённого острова.
   * Вынесена из drawCartoonIsland, чтобы статичный кэш островов
   * не перерисовывался при каждом движении мыши.
   */
  drawIslandHighlight(cx, cy, isHovered, isSelected) {
      if (!isSelected && !isHovered) return;

      const radius = 28;

      if (isSelected) {
          this.ctx.save();

          this.ctx.strokeStyle = "#F6D396";
          this.ctx.lineWidth = 4 + 1.5 * Math.sin(this.time * 6);

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius + 5, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.strokeStyle = "rgba(255,244,214,0.45)";
          this.ctx.lineWidth = 2;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius + 8, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.restore();
          return;
      }

      this.ctx.save();

      this.ctx.strokeStyle = "rgba(255,255,255,0.78)";
      this.ctx.lineWidth = 3;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 2, radius + 3, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.restore();
  }

  /**
   * Небольшие декоративные детали вокруг острова (цветочки, камешки, пеньки).
   * Положение детерминировано от координат острова, поэтому картинка
   * стабильна и хранится внутри кэшированного чанка островов.
   */
  drawIslandDecorations(cx, cy, target, isComplete) {
      const r = 28;
      const seed = cx * 131 + cy * 37 + target * 13;

      const rand = (n) => {
          const x = Math.sin(seed + n * 7.3) * 9017.1;
          return x - Math.floor(x);
      };

      const count = 4 + Math.floor(rand(0) * 4);

      this.ctx.save();

      for (let i = 0; i < count; i++) {
          const angle = rand(i * 1.3) * Math.PI * 2;
          const dist = r - 7 + rand(i * 2.7) * 11;
          const x = cx + Math.cos(angle) * dist;
          const y = cy - 2 + Math.sin(angle) * dist;
          const type = Math.floor(rand(i * 3.9) * 3);

          if (type === 0) {
              /*
               * Маленький цветочек с травинкой.
               */
              this.ctx.fillStyle = isComplete
                  ? this.skin.flowerDone
                  : this.skin.flower;
              this.ctx.beginPath();
              this.ctx.arc(
                  x,
                  y,
                  1.3 + rand(i * 5.1) * 1.2,
                  0,
                  Math.PI * 2
              );
              this.ctx.fill();

              this.ctx.strokeStyle = "rgba(98, 66, 56, 0.4)";
              this.ctx.lineWidth = 0.8;
              this.ctx.lineCap = "round";
              this.ctx.beginPath();
              this.ctx.moveTo(x, y + 2);
              this.ctx.lineTo(x, y + 4 + rand(i * 7.9) * 2);
              this.ctx.stroke();
          } else if (type === 1) {
              /*
               * Камешек у берега.
               */
              this.ctx.fillStyle = "rgba(120, 95, 80, 0.75)";
              this.ctx.beginPath();
              this.ctx.arc(x, y, 2 + rand(i * 4.3) * 1.5, 0, Math.PI * 2);
              this.ctx.fill();

              this.ctx.strokeStyle = "rgba(60, 40, 30, 0.45)";
              this.ctx.lineWidth = 0.7;
              this.ctx.stroke();
          } else {
              /*
               * О piccole пеньки/кораблик из коры.
               */
              this.ctx.fillStyle = "rgba(100, 75, 60, 0.6)";
              this.ctx.fillRect(
                  x - 1,
                  y - 1,
                  2 + rand(i * 3.1) * 2,
                  2 + rand(i * 3.1) * 1.5
              );
          }
      }

      this.ctx.restore();
  }

  drawCartoonIsland(cx, cy, target, current, isHovered, isSelected) {
      const radius = 28;

      const isOverfilled = current > target;
      const isComplete = current === target;
      const fillRatio = target > 0 ? Math.min(current / target, 1) : 0;

      /*
        * 1. Мягкая тень под островом
        */
      this.ctx.save();
      this.ctx.fillStyle = "rgba(35, 28, 23, 0.30)";
      this.ctx.beginPath();
      this.ctx.ellipse(cx + 1, cy + 9, radius * 0.88, radius * 0.36, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();

      /*
        * 2. Земля под травой
        */
      const dirtGradient = this.ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
      dirtGradient.addColorStop(0, this.skin.dirtTop);
      dirtGradient.addColorStop(1, this.skin.dirtBottom);

      this.ctx.fillStyle = dirtGradient;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy + 5, radius, 0, Math.PI * 2);
      this.ctx.fill();

      /*
        * 3. Трава
        */
      const grassGradient = this.ctx.createRadialGradient(cx - 10, cy - 13, 3, cx, cy, radius);

      if (isOverfilled) {
          /*
            * Переполнение — красный,
            * но не кислотный.
            */
          grassGradient.addColorStop(0, this.skin.overA);
          grassGradient.addColorStop(0.55, this.skin.overB);
          grassGradient.addColorStop(1, this.skin.overC);
      } else if (isComplete) {
          /*
            * Заполненный остров —
            * более светлый и сочный.
            */
          grassGradient.addColorStop(0, this.skin.doneA);
          grassGradient.addColorStop(0.42, this.skin.doneB);
          grassGradient.addColorStop(0.78, this.skin.doneC);
          grassGradient.addColorStop(1, this.skin.doneD);
      } else {
          /*
            * Обычный остров.
            */
          grassGradient.addColorStop(0, this.skin.grassA);
          grassGradient.addColorStop(0.45, this.skin.grassB);
          grassGradient.addColorStop(0.78, this.skin.grassC);
          grassGradient.addColorStop(1, this.skin.grassD);
      }

      this.ctx.fillStyle = grassGradient;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 2, radius, 0, Math.PI * 2);
      this.ctx.fill();

      /*
        * 4. Мягкий блик на поверхности острова
        */
      if (!isOverfilled) {
          this.ctx.save();

          const shine = this.ctx.createRadialGradient(cx - 11, cy - 14, 1, cx - 7, cy - 10, 20);
          shine.addColorStop(0, isComplete ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.22)");
          shine.addColorStop(1, "rgba(255,255,255,0)");

          this.ctx.fillStyle = shine;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius - 1, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.restore();
      }

      /*
        * 5. Небольшие травинки
        */
      if (!isOverfilled) {
          this.ctx.save();

          this.ctx.strokeStyle = isComplete ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.15)";
          this.ctx.lineWidth = 1.4;
          this.ctx.lineCap = "round";

          const grassMarks = [
              [-15, -8, -19, -12],
              [11, -15, 15, -19],
              [-17, 7, -21, 6],
              [15, 8, 19, 6]
          ];

          for (const [x1, y1, x2, y2] of grassMarks) {
              this.ctx.beginPath();
              this.ctx.moveTo(cx + x1, cy + y1);
              this.ctx.lineTo(cx + x2, cy + y2);
              this.ctx.stroke();
          }

          this.ctx.restore();
      }

      /*
        * 6. Дерево
        *
        * Оно находится слева сверху,
        * поэтому не конфликтует с цифрой.
        */
      if (!isSelected && !isOverfilled) {
          const treeX = cx - 14;
          const treeY = cy - 15;

          /*
            * Ствол.
            */
          this.ctx.fillStyle = this.skin.treeTrunk;
          this.ctx.fillRect(treeX - 2, treeY + 5, 4, 10);

          /*
            * Нижняя часть кроны.
            */
          this.ctx.fillStyle = isComplete
              ? this.skin.treeDoneDark
              : this.skin.treeDark;
          this.ctx.beginPath();
          this.ctx.arc(treeX, treeY + 3, 7, 0, Math.PI * 2);
          this.ctx.fill();

          /*
            * Верхняя часть кроны.
            */
          this.ctx.fillStyle = isComplete
              ? this.skin.treeDoneLight
              : this.skin.treeLight;
          this.ctx.beginPath();
          this.ctx.arc(treeX + 3, treeY - 2, 6, 0, Math.PI * 2);
          this.ctx.fill();

          /*
            * Контур дерева.
            */
          this.ctx.strokeStyle = this.skin.treeOutline;
          this.ctx.lineWidth = 1.2;
          this.ctx.beginPath();
          this.ctx.arc(treeX, treeY + 3, 7, 0, Math.PI * 2);
          this.ctx.stroke();
      }

      /*
        * 7. Основная обводка острова
        */
      let outlineColor;
      let outlineWidth;

      if (isOverfilled) {
          outlineColor = this.skin.outlineOver;
          outlineWidth = 3;
      } else if (isComplete) {
          outlineColor = this.skin.outlineDone;
          outlineWidth = 3;
      } else {
          outlineColor = this.skin.outline;
          outlineWidth = 2.5;
      }

      this.ctx.strokeStyle = outlineColor;
      this.ctx.lineWidth = outlineWidth;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 2, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      /*
        * 8. ПРОГРЕСС
        *
        * Сначала тёмная дорожка,
        * затем золотистый прогресс.
        */
      if (!isComplete && !isOverfilled) {
          const progressRadius = radius + 7;

          this.ctx.save();

          /*
            * Тёмная дорожка.
            */
          this.ctx.strokeStyle = this.skin.progressTrack;
          this.ctx.lineWidth = 5;
          this.ctx.lineCap = "round";

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, progressRadius, -Math.PI / 2, Math.PI * 1.5);
          this.ctx.stroke();

          /*
            * Заполненная часть.
            */
          if (fillRatio > 0) {
              this.ctx.strokeStyle = this.skin.progressFill;
              this.ctx.lineWidth = 5;
              this.ctx.lineCap = "round";

              this.ctx.beginPath();
              this.ctx.arc(cx, cy - 2, progressRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fillRatio);
              this.ctx.stroke();

              /*
                * Светлый блик на конце прогресса.
                */
              const angle = -Math.PI / 2 + Math.PI * 2 * fillRatio;
              const dotX = cx + Math.cos(angle) * progressRadius;
              const dotY = cy - 2 + Math.sin(angle) * progressRadius;

              this.ctx.fillStyle = this.skin.progressDot;
              this.ctx.beginPath();
              this.ctx.arc(dotX, dotY, 2.5, 0, Math.PI * 2);
              this.ctx.fill();
          }

          this.ctx.restore();
      }

      /*
        * 9. ЗАПОЛНЕННЫЙ ОСТРОВ
        */
      if (isComplete) {
          this.ctx.save();

          /*
            * Внутренняя светлая окантовка.
            */
          this.ctx.strokeStyle = "rgba(225,245,210,0.60)";
          this.ctx.lineWidth = 2;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius - 4, 0, Math.PI * 2);
          this.ctx.stroke();

          /*
            * Маленькая галочка.
            */
          const checkX = cx + 16;
          const checkY = cy + 16;

          this.ctx.strokeStyle = "#E9F6D7";
          this.ctx.lineWidth = 3;
          this.ctx.lineCap = "round";
          this.ctx.lineJoin = "round";

          this.ctx.beginPath();
          this.ctx.moveTo(checkX - 5, checkY);
          this.ctx.lineTo(checkX - 1, checkY + 4);
          this.ctx.lineTo(checkX + 6, checkY - 5);
          this.ctx.stroke();

          this.ctx.restore();
      }

      /*
        * 10. ПЕРЕПОЛНЕНИЕ
        */
      if (isOverfilled) {
          const overAmount = current - target;

          this.ctx.save();

          /*
            * Красное внешнее кольцо.
            */
          this.ctx.strokeStyle = this.skin.overRing;
          this.ctx.lineWidth = 4;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius + 7, 0, Math.PI * 2);
          this.ctx.stroke();

          /*
            * Красный бейдж.
            */
          const badgeX = cx + 20;
          const badgeY = cy - 21;

          this.ctx.fillStyle = this.skin.overBadge;
          this.ctx.beginPath();
          this.ctx.arc(badgeX, badgeY, 12, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = "#FFFDF7";
          this.ctx.lineWidth = 2;
          this.ctx.stroke();

          /*
            * +N
            */
          this.ctx.fillStyle = "#FFFDF7";
          this.ctx.font = '700 11px "Nunito", sans-serif';
          this.ctx.textAlign = "center";
          this.ctx.textBaseline = "middle";

          this.ctx.fillText(`+${overAmount}`, badgeX, badgeY);

          this.ctx.restore();
      }

      /*
        * 11. Цифра острова
        */
      this.ctx.save();

      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.font = '700 21px "Fredoka", sans-serif';

      /*
        * Тень цифры.
        */
      this.ctx.fillStyle = "rgba(35,25,20,0.32)";
      this.ctx.fillText(String(target), cx + 1, cy + 3);

      /*
        * Основная цифра с мягким свечением у выполненного острова.
        */
      if (isComplete) {
          const glow = 0.45 + 0.3 * Math.sin(this.time * 5);
          this.ctx.shadowColor = `rgba(${this.skin.numberGlow}, ${glow})`;
          this.ctx.shadowBlur = 10;
      }

      this.ctx.fillStyle = "#FFFDF7";
      this.ctx.fillText(String(target), cx, cy + 1);

      this.ctx.shadowBlur = 0;
      this.ctx.restore();

      /*
        * 12. Выбранный остров / наведение
        *
        * Подсветка вынесена в отдельный динамический слой:
        * статичный кэш острова не зависит от положения курсора.
        */
      this.drawIslandHighlight(cx, cy, isHovered, isSelected);
  }

  drawMedievalBridge(x1, y1, x2, y2, count) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      /*
      * Для двух мостов рисуем две дорожки симметрично оси:
      * -11/+11. Одиночный мост идёт по центру.
      */
      const safeCount = Math.max(
          1,
          Math.min(
              Number.isInteger(count) ? count : 1,
              2
          )
      );

      const spacing = safeCount <= 1 ? 0 : 22;

      const offsets = Array.from(
          { length: safeCount },
          (_, index) =>
              (index - (safeCount - 1) / 2) * spacing
      );

      this.ctx.save();
      this.ctx.translate(x1, y1);
      this.ctx.rotate(angle);

      /*
      * Рисуем каждый мост отдельно.
      */
      for (let bridgeIndex = 0; bridgeIndex < offsets.length; bridgeIndex++) {
          const offset = offsets[bridgeIndex];

          this.ctx.save();
          this.ctx.translate(0, offset);

          /*
          * 1. Мягкая тень под мостом.
          */
          this.ctx.fillStyle = this.skin.bridgeShadow;
          this.ctx.beginPath();
          this.ctx.roundRect(2, -9, Math.max(0, len - 4), 18, 5);
          this.ctx.fill();

          /*
          * 2. Основная деревянная поверхность.
          */
          const woodGradient = this.ctx.createLinearGradient(0, -8, 0, 8);
          woodGradient.addColorStop(0, this.skin.woodTop);
          woodGradient.addColorStop(0.45, this.skin.woodMid);
          woodGradient.addColorStop(1, this.skin.woodBottom);

          this.ctx.fillStyle = woodGradient;
          this.ctx.beginPath();
          this.ctx.roundRect(0, -8, len, 16, 3);
          this.ctx.fill();

          /*
          * 3. Верхняя светлая часть досок.
          */
          this.ctx.fillStyle = this.skin.woodHighlight;
          this.ctx.beginPath();
          this.ctx.roundRect(0, -7, len, 5, 2);
          this.ctx.fill();

          /*
          * 4. Поперечные доски.
          *
          * Они делают мост визуально деревянным,
          * а не просто цветной полосой.
          */
          const plankStep = 13;

          for (let x = 7; x < len - 3; x += plankStep) {
              /*
              * Основная линия стыка.
              */
              this.ctx.strokeStyle = this.skin.plankLine;
              this.ctx.lineWidth = 1.4;
              this.ctx.beginPath();
              this.ctx.moveTo(x, -7);
              this.ctx.lineTo(x, 7);
              this.ctx.stroke();

              /*
              * Маленький светлый край.
              */
              this.ctx.strokeStyle = this.skin.plankLight;
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.moveTo(x + 1, -6);
              this.ctx.lineTo(x + 1, 6);
              this.ctx.stroke();
          }

          /*
          * 5. Небольшая неоднородность досок.
          *
          * Не все доски должны выглядеть абсолютно одинаково.
          */
          for (let x = 3, plank = 0; x < len - 3; x += plankStep, plank++) {
              const shade = plank % 3;

              if (shade === 1) {
                  this.ctx.fillStyle = this.skin.plankShadeA;
                  this.ctx.fillRect(x + 2, -6, Math.min(7, len - x - 4), 12);
              } else if (shade === 2) {
                  this.ctx.fillStyle = this.skin.plankShadeB;
                  this.ctx.fillRect(x + 2, -6, Math.min(6, len - x - 4), 12);
              }
          }

          /*
          * 6. Боковые продольные балки.
          */
          this.ctx.strokeStyle = this.skin.beam;
          this.ctx.lineWidth = 2.5;
          this.ctx.lineCap = "round";
          this.ctx.beginPath();
          this.ctx.moveTo(1, -8);
          this.ctx.lineTo(len - 1, -8);
          this.ctx.moveTo(1, 8);
          this.ctx.lineTo(len - 1, 8);
          this.ctx.stroke();

          /*
          * 7. Канаты.
          *
          * Очень тонкие, чтобы не превращать мост
          * в пунктирную конструкцию.
          */
          this.ctx.strokeStyle = this.skin.rope;
          this.ctx.lineWidth = 2;
          this.ctx.lineCap = "round";

          const sag = Math.min(7, len * 0.045);

          this.ctx.beginPath();
          this.ctx.moveTo(0, -11);
          this.ctx.quadraticCurveTo(len / 2, -11 + sag, len, -11);
          this.ctx.stroke();

          this.ctx.beginPath();
          this.ctx.moveTo(0, 11);
          this.ctx.quadraticCurveTo(len / 2, 11 - sag, len, 11);
          this.ctx.stroke();

          /*
          * Маленькие подвески канатов к доскам.
          */
          this.ctx.strokeStyle = this.skin.ropeHanger;
          this.ctx.lineWidth = 0.9;

          for (let x = 7; x < len - 3; x += plankStep) {
              this.ctx.beginPath();
              this.ctx.moveTo(x, -11);
              this.ctx.lineTo(x, -6.5);
              this.ctx.stroke();
          }

          /*
          * 8. Маленькие крепления каната.
          */
          this.ctx.fillStyle = this.skin.nail;

          for (let x = 8; x < len - 3; x += 26) {
              this.ctx.beginPath();
              this.ctx.arc(x, -11, 2, 0, Math.PI * 2);
              this.ctx.fill();

              this.ctx.beginPath();
              this.ctx.arc(x, 11, 2, 0, Math.PI * 2);
              this.ctx.fill();
          }

          /*
          * 9. Светлая линия сверху.
          *
          * Даёт ощущение объёма.
          */
          this.ctx.strokeStyle = this.skin.woodTopLight;
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(3, -6);
          this.ctx.lineTo(len - 3, -6);
          this.ctx.stroke();

          /*
          * 10. Затемнение у концов.
          *
          * Благодаря этому мост лучше "садится" под острова.
          */
          const endGradient = this.ctx.createLinearGradient(0, 0, 18, 0);
          endGradient.addColorStop(0, this.skin.woodEnd);
          endGradient.addColorStop(1, "rgba(65, 40, 30, 0)");

          this.ctx.fillStyle = endGradient;
          this.ctx.fillRect(0, -7, Math.min(18, len), 14);

          const rightGradient = this.ctx.createLinearGradient(Math.max(0, len - 18), 0, len, 0);
          rightGradient.addColorStop(0, "rgba(65, 40, 30, 0)");
          rightGradient.addColorStop(1, this.skin.woodEnd);

          this.ctx.fillStyle = rightGradient;
          this.ctx.fillRect(Math.max(0, len - 18), -7, Math.min(18, len), 14);

          this.ctx.restore();
      }

      /*
      * У двойного моста рисуем линию просвета между дорожками.
      */
      if (safeCount > 1) {
          this.ctx.save();
          this.ctx.strokeStyle = this.skin.bridgeGap;
          this.ctx.lineWidth = 2;

          for (let index = 0; index + 1 < offsets.length; index++) {
              const middle =
                  (offsets[index] + offsets[index + 1]) / 2;

              this.ctx.beginPath();
              this.ctx.moveTo(0, middle);
              this.ctx.lineTo(len, middle);
              this.ctx.stroke();
          }

          this.ctx.restore();
      }

      this.ctx.restore();
  }


    drawWoodenButton(coords, text, isHovered) {
        const [x1, y1, x2, y2] = coords;
        const w = x2 - x1;
        const h = y2 - y1;

        /*
         * Основные цвета кнопки.
         *
         * Hover немного светлее,
         * но без яркого свечения.
         */
        const topColor = isHovered ? "#9A6B4F" : "#80543F";
        const bottomColor = isHovered ? "#704936" : "#5C3B2F";

        this.ctx.save();

        /*
         * 1. Мягкая тень
         */
        this.ctx.fillStyle = "rgba(45, 30, 22, 0.32)";
        this.drawRoundRect(x1 + 2, y1 + 4, w, h, 11, "rgba(45, 30, 22, 0.32)");

        /*
         * 2. Основное дерево
         */
        const woodGradient = this.ctx.createLinearGradient(0, y1, 0, y2);
        woodGradient.addColorStop(0, topColor);
        woodGradient.addColorStop(0.5, "#76503D");
        woodGradient.addColorStop(1, bottomColor);

        this.drawRoundRect(x1, y1, w, h, 11, woodGradient);

        /*
         * 3. Тонкая внутренняя рамка
         */
        this.drawRoundRect(x1 + 2, y1 + 2, w - 4, h - 4, 9, null, "rgba(232, 196, 145, 0.45)", 1.5);

        /*
         * 4. Небольшая текстура дерева
         */
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.rect(x1 + 5, y1 + 5, w - 10, h - 10);
        this.ctx.clip();

        this.ctx.strokeStyle = "rgba(255, 224, 190, 0.10)";
        this.ctx.lineWidth = 1;

        /*
         * Несколько спокойных волокон.
         */
        for (let i = -1; i < 4; i++) {
            const y = y1 + 9 + i * 10;

            this.ctx.beginPath();
            this.ctx.moveTo(x1 - 5, y);
            this.ctx.bezierCurveTo(x1 + w * 0.25, y - 2, x1 + w * 0.45, y + 2, x1 + w * 0.7, y);
            this.ctx.bezierCurveTo(x1 + w * 0.82, y - 1, x2 + 5, y + 1, x2 + 8, y);
            this.ctx.stroke();
        }

        this.ctx.restore();

        /*
         * 5.  Верхний мягкий блик
         */
        const highlightGradient = this.ctx.createLinearGradient(0, y1 + 3, 0, y1 + h * 0.45);
        highlightGradient.addColorStop(0, "rgba(255, 235, 210, 0.16)");
        highlightGradient.addColorStop(1, "rgba(255, 235, 210, 0)");

        this.drawRoundRect(x1 + 4, y1 + 4, w - 8, Math.max(4, h * 0.4), 7, highlightGradient);

        /*
         * 6. Маленькие декоративные металлические
         * заклёпки по углам.
         */
        this.ctx.fillStyle = "rgba(218, 181, 126, 0.65)";

        const rivetRadius = 2;
        const rivets = [
            [x1 + 8, y1 + 8],
            [x2 - 8, y1 + 8],
            [x1 + 8, y2 - 8],
            [x2 - 8, y2 - 8]
        ];

        for (const [rx, ry] of rivets) {
            this.ctx.beginPath();
            this.ctx.arc(rx, ry, rivetRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }

        /*
         * 7. Текст
         */
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = '700 14px "Fredoka", sans-serif';

        /*
         * Тень текста.
         */
        this.ctx.fillStyle = "rgba(35, 24, 19, 0.55)";
        this.ctx.fillText(text, x1 + w / 2, y1 + h / 2 + 2);

        /*
         * Сам текст.
         */
        this.ctx.fillStyle = "#FFF3D6";
        this.ctx.fillText(text, x1 + w / 2, y1 + h / 2);

        /*
         * 8. Hover — маленький светлый контур.
         */
        if (isHovered) {
            this.ctx.strokeStyle = "rgba(246, 211, 150, 0.75)";
            this.ctx.lineWidth = 2;
            this.drawRoundRect(x1 - 1, y1 - 1, w + 2, h + 2, 12, null, "rgba(246, 211, 150, 0.75)", 2);
        }

        this.ctx.restore();
    }


  drawRoundRect(x, y, w, h, r, fill, stroke, strokeWidth) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
    this.ctx.closePath();
    if (fill) { this.ctx.fillStyle = fill; this.ctx.fill(); }
    if (stroke) { this.ctx.strokeStyle = stroke; this.ctx.lineWidth = strokeWidth || 1; this.ctx.stroke(); }
  }

    drawVictoryScreen() {
        const w = this.canvasW;
        const h = this.canvasH;

        /*
         * 1. Затемнение игрового поля.
         */
        this.ctx.save();

        this.ctx.fillStyle = `rgba(35, 28, 23, ${0.58 * this.victoryAlpha})`;
        this.ctx.fillRect(0, 0, w, h);

        if (this.victoryAlpha <= 0.2) {
            this.ctx.restore();
            return;
        }

        const panelW = 380;
        const panelH = 250;

        const px = w / 2 - panelW / 2;
        const py = h / 2 - panelH / 2;

        /*
         * 2. Плавное появление панели.
         */
        this.ctx.translate(w / 2, h / 2);
        this.ctx.scale(this.victoryAlpha, this.victoryAlpha);
        this.ctx.translate(-w / 2, -h / 2);

        /*
         * 3. Тень панели.
         */
        this.drawRoundRect(px + 6, py + 9, panelW, panelH, 24, "rgba(35, 25, 20, 0.38)");

        /*
         * 4. Основная панель.
         */
        const panelGradient = this.ctx.createLinearGradient(0, py, 0, py + panelH);
        panelGradient.addColorStop(0, "#FFFDF7");
        panelGradient.addColorStop(0.55, "#FFF8E8");
        panelGradient.addColorStop(1, "#F3E3C4");

        this.drawRoundRect(px, py, panelW, panelH, 24, panelGradient);

        /*
         * 5. Двойная золотистая рамка.
         */
        this.drawRoundRect(px + 3, py + 3, panelW - 6, panelH - 6, 21, null, "#8B6253", 2);
        this.drawRoundRect(px + 8, py + 8, panelW - 16, panelH - 16, 17, null, "rgba(214, 169, 92, 0.75)", 1.5);

        /*
         * 6. Декоративные уголки.
         */
        const cornerColor = "#C7954C";
        this.ctx.strokeStyle = cornerColor;
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = "round";

        const cornerSize = 16;
        const corners = [
            [px + 18, py + 18, 1, 1],
            [px + panelW - 18, py + 18, -1, 1],
            [px + 18, py + panelH - 18, 1, -1],
            [px + panelW - 18, py + panelH - 18, -1, -1]
        ];

        for (const [cx, cy, sx, sy] of corners) {
            this.ctx.beginPath();
            this.ctx.moveTo(cx, cy + sy * cornerSize);
            this.ctx.lineTo(cx, cy);
            this.ctx.lineTo(cx + sx * cornerSize, cy);
            this.ctx.stroke();
        }

        /*
         * 7. Маленький символ победы.
         */
        const emblemX = w / 2;
        const emblemY = py + 48;

        /*
         * Пульсующий знак победы.
         */
        const emblemPulse = 1 + 0.14 * Math.sin(this.time * 6) * this.victoryAlpha;

        this.ctx.save();
        this.ctx.translate(emblemX, emblemY);
        this.ctx.scale(emblemPulse, emblemPulse);
        this.ctx.translate(-emblemX, -emblemY);

        this.ctx.fillStyle = "#6AA65A";
        this.ctx.beginPath();
        this.ctx.arc(emblemX, emblemY, 17, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.strokeStyle = "#3F783D";
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        /*
         * Галочка.
         */
        this.ctx.strokeStyle = "#F4F8E8";
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";

        this.ctx.beginPath();
        this.ctx.moveTo(emblemX - 8, emblemY);
        this.ctx.lineTo(emblemX - 2, emblemY + 6);
        this.ctx.lineTo(emblemX + 9, emblemY - 7);
        this.ctx.stroke();

        this.ctx.restore();

        /*
         * Вращающиеся искорки вокруг эмблемы.
         */
        this.ctx.save();
        this.ctx.translate(emblemX, emblemY);

        for (let i = 0; i < 6; i++) {
            const angle = this.time * 1.2 + (i / 6) * Math.PI * 2;
            const radius = 24 + Math.sin(this.time + i) * 3;

            this.ctx.beginPath();
            this.ctx.arc(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                2,
                0,
                Math.PI * 2
            );
            this.ctx.fillStyle = i % 2 === 0 ? "#FDE047" : "#BBF7D0";
            this.ctx.globalAlpha = 0.8 + 0.2 * Math.sin(this.time * 2 + i);
            this.ctx.fill();
        }

        this.ctx.restore();

        /*
         * 8. Заголовок.
         */
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.font = '700 34px "Fredoka", sans-serif';

        /*
         * Тень.
         */
        this.ctx.fillStyle = "rgba(58, 36, 29, 0.22)";
        this.ctx.fillText("ПОБЕДА!", w / 2 + 1, py + 91);

        /*
         * Заголовок.
         */
        this.ctx.fillStyle = "#4B3027";
        this.ctx.fillText("ПОБЕДА!", w / 2, py + 89);

        /*
         * 9. Информация об уровне.
         */
        this.ctx.font = '700 17px "Nunito", sans-serif';
        this.ctx.fillStyle = "#765E52";
        this.ctx.fillText(
            this.endless
                ? `Уровень ${this.level} пройден!`
                : `Уровень ${this.level} из ${this.levels.length} пройден!`,
            w / 2, py + 120
        );

        /*
         * 10. Сообщение.
         */
        this.ctx.font = '700 15px "Nunito", sans-serif';
        this.ctx.fillStyle = "#765E52";

        if (this.endless) {
            this.ctx.fillText(
                `Следующий уровень: ${this.level + 1} · новых островов: ` +
                `${2 * (this.expansionsDone + 1)}`,
                w / 2, py + 145
            );
        } else if (this.level >= this.levels.length) {
            this.ctx.fillText("Вы прошли всю кампанию!", w / 2, py + 145);
        } else {
            this.ctx.fillText(`Следующий уровень: ${this.level + 1}`, w / 2, py + 145);
        }

        /*
         * 11. Разделительная линия.
         */
        this.ctx.strokeStyle = "rgba(139, 98, 83, 0.28)";
        this.ctx.lineWidth = 1.5;

        this.ctx.beginPath();
        this.ctx.moveTo(px + 55, py + 160);
        this.ctx.lineTo(px + panelW - 55, py + 160);
        this.ctx.stroke();

        /*
         * Декоративные точки.
         */
        this.ctx.fillStyle = "#C7954C";

        this.ctx.beginPath();
        this.ctx.arc(px + 48, py + 160, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(px + panelW - 48, py + 160, 3, 0, Math.PI * 2);
        this.ctx.fill();

        /*
         * 12. Кнопка.
         */
        const button = this.getVictoryButtonRect();

        this.drawWoodenButton(
            [
                button.x,
                button.y,
                button.x + button.width,
                button.y + button.height
            ],
            this.endless
                ? "РАСШИРИТЬ"
                : (this.level >= this.levels.length
                    ? "НАЧАТЬ ЗАНОВО"
                    : "СЛЕДУЮЩИЙ УРОВЕНЬ"),
            true
        );

        this.ctx.restore();
    }


  drawButtonBar() {
      const ctx = this.ctx;
      const y = this.viewportH;
      const height = this.canvasH - y;

      const gradient = ctx.createLinearGradient(0, y, 0, y + height);

      gradient.addColorStop(0, "rgba(6, 44, 70, 0.72)");
      gradient.addColorStop(1, "rgba(2, 24, 40, 0.92)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, this.canvasW, height);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(this.canvasW, y + 0.5);
      ctx.stroke();
  }

  drawZoomControls() {
      const ctx = this.ctx;

      const drawButton = (rect, label, hovered, active) => {
          ctx.save();
          ctx.globalAlpha = active ? 0.45 : 1;

          this.drawRoundRect(
              rect.x,
              rect.y,
              rect.w,
              rect.h,
              9,
              hovered ? "rgba(255, 167, 38, 0.95)" : "rgba(62, 39, 25, 0.82)",
              "rgba(246, 211, 150, 0.8)",
              2
          );

          ctx.fillStyle = "#FFF3E0";
          ctx.font = "700 20px Nunito, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
          ctx.restore();
      };

      drawButton(
          this.zoomInRect,
          "+",
          this.hoverZoomBtn === 'in',
          this.zoom >= this.maxZoom - 0.001
      );

      drawButton(
          this.zoomOutRect,
          "−",
          this.hoverZoomBtn === 'out',
          this.zoom <= this.minZoom + 0.001
      );

      drawButton(
          this.zoomResetRect,
          "⟲",
          this.hoverZoomBtn === 'reset',
          false
      );

      // Текущий масштаб.
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.font = "700 12px Nunito, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
          `${Math.round(this.zoom * 100)}%`,
          this.zoomInRect.x + this.zoomInRect.w / 2,
          this.zoomResetRect.y + this.zoomResetRect.h + 6
      );
      ctx.restore();
  }

  draw() {
    const ctx = this.ctx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    // Фон на всю площадь, включая нижнюю панель.
    ctx.fillStyle = "#0284C7";
    ctx.fillRect(0, 0, this.canvasW, this.canvasH);

    // Мир рисуем с учётом приближения и сдвига.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.viewportW, this.viewportH);
    ctx.clip();
    ctx.translate(this.viewX, this.viewY);
    ctx.scale(this.viewScale, this.viewScale);

    /*
      * 1. Вода — самый нижний слой.
      *
      * Статичная основа воды закэширована, поверх неё рисуется
      * только лёгкая анимация ряби.
      */
    this.drawWater();

    /*
      * Птицы над водой — декоративный динамический слой.
      */
    this.drawBirds();

    /*
      * 2. Мосты и острова — статичные кластеры.
      *
      * Слои перерисовываются только при изменении карты.
      * В обычном кадре это несколько drawImage вместо сотен
      * градиентов, дуг и разбора строковых ключей.
      */
    this.drawWorldChunks();

    /*
      * 3. Динамическая подсветка наведения/выбора.
      */
    this.drawIslandHighlights();

    /*
      * Искорки над выполненными островами.
      */
    this.drawIslandSparkles();

    /*
      * 4. Предпросмотр будущего моста.
      *
      * Рисуем после островов, поэтому он остаётся
      * хорошо видимым при перетягивании.
      */
    if (this.selectedIsland) {
        const [r, c] = this.selectedIsland;

        const x1 = c * this.cellSize + this.offset;
        const y1 = r * this.cellSize + this.offset;
        const x2 = this.lastMousePos.x;
        const y2 = this.lastMousePos.y;

        this.ctx.save();

        /*
          * Тень.
          */
        this.ctx.strokeStyle = "rgba(58, 36, 29, 0.28)";
        this.ctx.lineWidth = 7;
        this.ctx.lineCap = "round";
        this.ctx.setLineDash([10, 7]);
        this.ctx.lineDashOffset = -this.time * 30;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        /*
          * Основная золотистая линия.
          */
        this.ctx.strokeStyle = "rgba(246, 211, 150, 0.9)";
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 7]);
        this.ctx.lineDashOffset = -this.time * 30;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();

        /*
          * Маркер под курсором.
          */
        this.ctx.setLineDash([]);
        this.ctx.fillStyle = "rgba(255, 243, 214, 0.85)";

        this.ctx.beginPath();
        this.ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
    }

    /*
      * 5. Конец мирового слоя; нижняя панель и кнопки.
      */
    ctx.restore();

    this.drawButtonBar();

    this.drawWoodenButton(this.btn1Coords, "НОВАЯ КАРТА", this.btn1Hovered);
    this.drawWoodenButton(this.btn2Coords, "СБРОСИТЬ", this.btn2Hovered);

    this.drawZoomControls();

    /*
      * 6. Экран победы — самый верхний слой.
      */
    if (this.isVictoryShown) {
        if (!this.confettiStarted && this.victoryAlpha >= 1) {
            this.startConfetti();
        }

        this.drawVictoryScreen();
        this.drawConfetti();
    }
  }
}