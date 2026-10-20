/*
 * Главный класс рендерера.
 *
 * Код разделён на классические script-модули в папке renderer/.
 * Каждый модуль добавляет свою часть методов к прототипу класса.
 * Это сохраняет прямой запуск index.html без сборщика и ES-модулей.
 */
class BridgesGameRenderer {
  constructor(canvasId, logic) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.logic = logic;
    this.statusElement = document.getElementById('gameStatus');

    this.gridSize = 7;
    this.cellSize = 85;
    this.offset = 60;

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
    this.canvasRect = null;

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
    this.fireflies = [];
    this.pollen = [];

    /*
     * Дельта времени последнего кадра в секундах. Нужна эффектам,
     * чтобы их скорость не зависела от частоты кадров.
     */
    this.deltaTime = 0;

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

    /*
     * Светлячки для ночного скина. Позиции нормированы, поэтому
     * они переживают изменение размеров мира, а рисуются только
     * при ночной палитре.
     */
    for (let i = 0; i < 18; i++) {
        this.fireflies.push({
            nx: Math.random(),
            ny: Math.random(),
            phase: Math.random() * Math.PI * 2,
            size: 1.1 + Math.random() * 1.4,
            alpha: 0.45 + Math.random() * 0.5,
            swing: 10 + Math.random() * 22,
            swingSpeed: 0.25 + Math.random() * 0.4,
            pulseSpeed: 0.8 + Math.random() * 1.2
        });
    }

    /*
     * Пыльца экспериментального скина: нормированные позиции,
     * поэтому она переживает изменение размеров мира.
     */
    const pollenColors = [
        "rgba(253, 230, 138, 0.85)",
        "rgba(253, 186, 116, 0.8)",
        "rgba(255, 255, 255, 0.75)",
        "rgba(244, 114, 182, 0.7)"
    ];

    for (let i = 0; i < 14; i++) {
        this.pollen.push({
            nx: Math.random(),
            ny: Math.random(),
            phase: Math.random() * Math.PI * 2,
            size: 1.2 + Math.random() * 1.8,
            alpha: 0.35 + Math.random() * 0.4,
            swing: 8 + Math.random() * 18,
            speed: 0.2 + Math.random() * 0.35,
            pulse: 0.7 + Math.random() * 1.1,
            color: pollenColors[i % pollenColors.length]
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
    this.setupRestartConfirm();
    this.startAnimationLoop();
  }

  startAnimationLoop() {
    let lastTimestamp = null;
    let lastDrawTimestamp = 0;
    let animationFrameId = null;

    /*
     * Ограничиваем отрисовку ~60 FPS. На 144-Гц мониторах
     * requestAnimationFrame срабатывает чаще, но лишние кадры
     * пропускаются, экономя CPU и батарею.
     */
    const frameInterval = 1000 / 60;

    const animate = (timestamp) => {
      // Следующий кадр планируем сразу, чтобы цикл не останавливался
      // на пропущенном кадре.
      animationFrameId = requestAnimationFrame(animate);

      if (lastTimestamp === null) {
        lastTimestamp = timestamp - frameInterval;
      }

      const elapsed = timestamp - lastDrawTimestamp;

      if (elapsed < frameInterval - 1) {
        return;
      }

      lastDrawTimestamp = timestamp - (elapsed % frameInterval);

      const deltaTime = Math.min(
        (timestamp - lastTimestamp) / 1000,
        0.05
      );

      lastTimestamp = timestamp;
      this.deltaTime = deltaTime;

      this.time += deltaTime * 1.2;

      if (this.isVictoryShown && this.victoryAlpha < 1) {
        this.victoryAlpha = Math.min(
          1,
          this.victoryAlpha + deltaTime * 2.4
        );
      }

      this.draw();
    };

    const startAnimation = () => {
      if (animationFrameId !== null || document.hidden) {
        return;
      }

      lastTimestamp = null;
      lastDrawTimestamp = 0;
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

      /*
       * При изменении размеров окна пересчитываем геометрию холста
       * с небольшой задержкой, чтобы не делать это на каждый пиксель
       * перетаскивания.
       */
      let resizeTimer = null;

      window.addEventListener('resize', () => {
          if (resizeTimer !== null) clearTimeout(resizeTimer);

          resizeTimer = setTimeout(() => {
              resizeTimer = null;

              this.updateCanvasGeometry();
              this.draw();
          }, 120);
      });
  }

  getMousePos(e) {
    const rect = this.getCanvasRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  /**
   * Позиция холста на странице.
   *
   * Чтение layout на каждое событие указателя заметно дороже самой
   * арифметики, а при перетаскивании события идут сотнями в секунду.
   * Поэтому берём позицию один раз за кадр: draw() сбрасывает кэш,
   * и после любого изменения разметки координаты снова верные.
   */
  getCanvasRect() {
      if (!this.canvasRect) {
          this.canvasRect = this.canvas.getBoundingClientRect();
      }

      return this.canvasRect;
  }

  updateCanvasGeometry() {
      const boardPadding = 35;

      // Размер игровой сетки в «мировых» пикселях.
      const boardSize = this.gridSize * this.cellSize;

      // Мир целиком (с отступами по краям).
      this.worldW = boardSize + boardPadding * 2;
      this.worldH = boardSize + boardPadding * 2;

      /*
       * Canvas вписываем в реально доступную ширину страницы.
       * Так мы не рисуем больше пикселей, чем браузер показывает:
       * на узких экранах это заметно экономит отрисовку.
       */
      const container = this.canvas.parentElement;
      const cssWidth =
          (container && container.clientWidth) ||
          (typeof window !== "undefined" && window.innerWidth) ||
          720;

      const horizontalPadding = 22; // .game-container padding: 11px * 2
      const availableWidth = Math.max(
          320,
          cssWidth - horizontalPadding
      );

      const VIEW_LIMIT = Math.min(1100, availableWidth);
      this.fitScale = Math.min(1, VIEW_LIMIT / this.worldW);

      this.viewportW = Math.round(this.worldW * this.fitScale);
      this.viewportH = Math.round(this.worldH * this.fitScale);

      this.buttonBarHeight = 92;

      this.canvasW = this.viewportW;
      this.canvasH = this.viewportH + this.buttonBarHeight;

      this.canvas.width = this.canvasW;
      this.canvas.height = this.canvasH;

      // Размер холста изменился — позицию перечитываем заново.
      this.canvasRect = null;

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

  draw() {
    const ctx = this.ctx;

    /*
     * Разметка могла сместиться (resize, загрузка шрифтов, диалог
     * скинов). Сбрасываем кэш позиции холста раз в кадр: координаты
     * указателя остаются верными, а layout читается не чаще одного
     * раза за кадр вместо каждого события.
     */
    this.canvasRect = null;

    ctx.setTransform(1, 0, 0, 1, 0, 0);

    /*
     * Фон заливает весь холст целиком, поэтому отдельная
     * очистка clearRect не нужна — это лишний проход по пикселям.
     */
    ctx.fillStyle = this.skin.sceneBackground || "#0284C7";
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
      * Светлячки — только для ночного скина. Рисуются до островов,
      * поэтому часть из них прячется за берегами, как в реальности.
      */
    this.drawFireflies();

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
      * Пыльца — самый верхний декоративный слой экспериментального
      * скина. В остальных скинах метод сразу выходит.
      */
    this.drawPollen();

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

Object.assign(
  BridgesGameRenderer.prototype,
  window.BridgesRendererParts.skinUI,
  window.BridgesRendererParts.world,
  window.BridgesRendererParts.view,
  window.BridgesRendererParts.game,
  window.BridgesRendererParts.water,
  window.BridgesRendererParts.effects,
  window.BridgesRendererParts.islands,
  window.BridgesRendererParts.bridges,
  window.BridgesRendererParts.ui
);

window.BridgesGameRenderer = BridgesGameRenderer;
