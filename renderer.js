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

    this.updateCanvasGeometry();

    this.setupEvents();
    this.startAnimationLoop();
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
      this.canvas.addEventListener('pointermove', (e) => {
          const pos = this.getMousePos(e);

          this.lastMousePos = pos;
          this.onMouseMove(pos);

          if (this.selectedIsland && e.pointerType !== 'mouse') {
              this.canvas.setPointerCapture?.(e.pointerId);
          }
      });

      this.canvas.addEventListener('pointerdown', (e) => {
          const pos = this.getMousePos(e);

          // ПКМ: сразу удаляем мост под курсором.
          if (e.button === 2) {
              e.preventDefault();
              this.onContextMenu(pos);
              return;
          }

          // Только основная кнопка мыши / touch.
          if (e.button !== 0) return;

          // На телефоне касание существующего моста удаляет его.
          if (e.pointerType === 'touch') {
              const bridge = this.findBridgeAtPos(pos.x, pos.y);

              if (bridge) {
                  const removed = this.logic.removeBridge(
                      bridge[0],
                      bridge[1]
                  );

                  this.selectedIsland = null;
                  this.lastMousePos = pos;

                  if (removed && this.logic.checkVictory()) {
                      this.isVictoryShown = true;
                  }

                  return;
              }
          }

          this.onMouseDown(pos);

          if (this.selectedIsland) {
              this.canvas.setPointerCapture?.(e.pointerId);
          }
      });

      this.canvas.addEventListener('pointerup', (e) => {
          const pos = this.getMousePos(e);

          if (e.button !== 0) return;

          this.onMouseUp(pos);

          if (this.canvas.hasPointerCapture?.(e.pointerId)) {
              this.canvas.releasePointerCapture(e.pointerId);
          }
      });

      this.canvas.addEventListener('pointercancel', (e) => {
          this.selectedIsland = null;

          if (this.canvas.hasPointerCapture?.(e.pointerId)) {
              this.canvas.releasePointerCapture(e.pointerId);
          }
      });

      this.canvas.addEventListener('contextmenu', (e) => {
          e.preventDefault();
      });
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  updateCanvasGeometry() {
      const boardPadding = 35;

      // Размер игровой сетки.
      const boardSize = this.gridSize * this.cellSize;

      // Canvas оставляет свободное место вокруг всей сетки.
      this.canvasW = boardSize + boardPadding * 2;
      this.canvasH = boardSize + 110;

      this.canvas.width = this.canvasW;
      this.canvas.height = this.canvasH;

      /*
        * offset — это координата ЦЕНТРА первой клетки.
        *
        * Поэтому к внешнему отступу добавляем половину клетки.
        */
      this.offset = boardPadding + this.cellSize / 2;

      // Кнопки располагаем по центру canvas.
      const buttonWidth = 230;
      const buttonGap = 20;
      const buttonHeight = 45;

      const totalButtonsWidth = buttonWidth * 2 + buttonGap;
      const buttonsStartX = (this.canvasW - totalButtonsWidth) / 2;
      const buttonsY = boardSize + 40;

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
  }

  generateNewLevel(level = this.level) {
    const profile = this.levels[level - 1];

    if (!profile) {
        return false;
    }

    const success = this.logic.generateValidLevel({
        minIslands: profile.minIslands,
        maxIslands: profile.maxIslands,
        gridSize: profile.gridSize
    });

    if (success) {
      this.gridSize = profile.gridSize;

      this.updateCanvasGeometry();

      this.selectedIsland = null;
      this.hoveredIsland = null;
      this.lastMousePos = { x: 0, y: 0 };


      this.selectedIsland = null;
      this.hoveredIsland = null;
      this.lastMousePos = { x: 0, y: 0 };

      if (this.statusElement) {
          this.statusElement.textContent = `Уровень ${this.level}: ${profile.name}`;
      }
    } else if (this.statusElement) {
        this.statusElement.textContent =
            this.logic.islands.size > 0
                ? "Не удалось создать новую карту. Предыдущая карта сохранена."
                : "Не удалось создать уровень. Попробуйте обновить страницу.";
    }

    return success;
}


  getIslandAtPos(x, y) { return this.logic.getIslandAtPos(x, y, this.cellSize, this.offset); }

  findBridgeAtPos(x, y) {
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
    if (this.isVictoryShown) return;
    const island = this.getIslandAtPos(pos.x, pos.y);
    const islandChanged = JSON.stringify(island) !== JSON.stringify(this.hoveredIsland);
    if (islandChanged) this.hoveredIsland = island;

    const btn = this.getBtnClicked(pos.x, pos.y);
    const btnChanged = (btn === 1) !== this.btn1Hovered || (btn === 2) !== this.btn2Hovered;
    if (btnChanged) { this.btn1Hovered = (btn === 1); this.btn2Hovered = (btn === 2); }

    this.canvas.style.cursor = (btn || island) ? 'pointer' : 'crosshair';
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
            // Кампания завершена.
            // Начинаем её заново с первого уровня.
            if (this.level >= this.levels.length) {
                this.level = 1;
            } else {
                nextLevel = this.level + 1;
            }

            if (this.generateNewLevel(nextLevel)) { 
              this.level = nextLevel; 
              
              this.isVictoryShown = false; 
              this.victoryAlpha = 0; 
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
        if (!this.logic.addBridge(this.selectedIsland, targetIsland)) this.flashWarning();
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

  drawTopDownWater() {
      const w = this.canvasW;
      const h = this.canvasH;

      /*
      * Базовый цвет воды.
      * Используем несколько мягких градиентов вместо
      * старых резких диагональных полос.
      */
      const gradient = this.ctx.createLinearGradient(0, 0, w, h);

      gradient.addColorStop(0, "#7DD3FC");
      gradient.addColorStop(0.45, "#38BDF8");
      gradient.addColorStop(1, "#0284C7");

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, w, h);


      /*
      * Мягкое свечение сверху.
      */
      const glow = this.ctx.createRadialGradient(
          w * 0.25,
          h * 0.12,
          0,
          w * 0.25,
          h * 0.12,
          w * 0.8
      );

      glow.addColorStop(0, "rgba(255,255,255,0.20)");
      glow.addColorStop(0.45, "rgba(255,255,255,0.06)");
      glow.addColorStop(1, "rgba(255,255,255,0)");

      this.ctx.fillStyle = glow;
      this.ctx.fillRect(0, 0, w, h);


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

          this.ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";

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


      /*
      * Лёгкое затемнение по краям.
      *
      * Оно визуально отделяет игровое поле от деревянной
      * рамки и делает центр более читаемым.
      */
      const vignette = this.ctx.createRadialGradient(
          w / 2,
          h / 2,
          Math.min(w, h) * 0.28,
          w / 2,
          h / 2,
          Math.max(w, h) * 0.72
      );

      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(0.72, "rgba(0,40,80,0.04)");
      vignette.addColorStop(1, "rgba(0,40,80,0.18)");

      this.ctx.fillStyle = vignette;
      this.ctx.fillRect(0, 0, w, h);
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
      dirtGradient.addColorStop(0, "#8B6253");
      dirtGradient.addColorStop(1, "#4D342C");

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
          grassGradient.addColorStop(0, "#F18A80");
          grassGradient.addColorStop(0.55, "#D85B53");
          grassGradient.addColorStop(1, "#A83E38");
      } else if (isComplete) {
          /*
            * Заполненный остров —
            * более светлый и сочный.
            */
          grassGradient.addColorStop(0, "#C4E89A");
          grassGradient.addColorStop(0.42, "#91CE70");
          grassGradient.addColorStop(0.78, "#62AA56");
          grassGradient.addColorStop(1, "#438542");
      } else {
          /*
            * Обычный остров.
            */
          grassGradient.addColorStop(0, "#B7E08A");
          grassGradient.addColorStop(0.45, "#8BCB68");
          grassGradient.addColorStop(0.78, "#62AA56");
          grassGradient.addColorStop(1, "#438542");
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
          this.ctx.fillStyle = "#68473A";
          this.ctx.fillRect(treeX - 2, treeY + 5, 4, 10);

          /*
            * Нижняя часть кроны.
            */
          this.ctx.fillStyle = isComplete ? "#4E944B" : "#438447";
          this.ctx.beginPath();
          this.ctx.arc(treeX, treeY + 3, 7, 0, Math.PI * 2);
          this.ctx.fill();

          /*
            * Верхняя часть кроны.
            */
          this.ctx.fillStyle = isComplete ? "#65A956" : "#57964D";
          this.ctx.beginPath();
          this.ctx.arc(treeX + 3, treeY - 2, 6, 0, Math.PI * 2);
          this.ctx.fill();

          /*
            * Контур дерева.
            */
          this.ctx.strokeStyle = "#326B39";
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
          outlineColor = "#963832";
          outlineWidth = 3;
      } else if (isComplete) {
          outlineColor = "#326F39";
          outlineWidth = 3;
      } else {
          outlineColor = "#356B35";
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
          this.ctx.strokeStyle = "rgba(48, 69, 46, 0.48)";
          this.ctx.lineWidth = 5;
          this.ctx.lineCap = "round";

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, progressRadius, -Math.PI / 2, Math.PI * 1.5);
          this.ctx.stroke();

          /*
            * Заполненная часть.
            */
          if (fillRatio > 0) {
              this.ctx.strokeStyle = "#F4D27A";
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

              this.ctx.fillStyle = "#FFF4C7";
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
          this.ctx.strokeStyle = "rgba(194, 58, 51, 0.88)";
          this.ctx.lineWidth = 4;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius + 7, 0, Math.PI * 2);
          this.ctx.stroke();

          /*
            * Красный бейдж.
            */
          const badgeX = cx + 20;
          const badgeY = cy - 21;

          this.ctx.fillStyle = "#B83B35";
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
        * Основная цифра.
        */
      this.ctx.fillStyle = "#FFFDF7";
      this.ctx.fillText(String(target), cx, cy + 1);

      this.ctx.restore();

      /*
        * 12. Выбранный остров
        *
        * Двойной тёплый золотой контур.
        */
      if (isSelected) {
          this.ctx.save();

          /*
            * Основной золотой контур.
            */
          this.ctx.strokeStyle = "#F6D396";
          this.ctx.lineWidth = 4;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius + 5, 0, Math.PI * 2);
          this.ctx.stroke();

          /*
            * Очень мягкий внешний ореол.
            */
          this.ctx.strokeStyle = "rgba(255,244,214,0.45)";
          this.ctx.lineWidth = 2;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius + 8, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.restore();
      } else if (isHovered) {
          /*
            * Наведение — мягкий светлый контур.
            */
          this.ctx.save();

          this.ctx.strokeStyle = "rgba(255,255,255,0.78)";
          this.ctx.lineWidth = 3;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius + 3, 0, Math.PI * 2);
          this.ctx.stroke();

          this.ctx.restore();
      }
  }

  drawMedievalBridge(x1, y1, x2, y2, count) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      /*
      * Отступ от центра для двойного моста.
      */
      const offsets = count === 1 ? [0] : [-11, 11];

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
          this.ctx.fillStyle = "rgba(45, 30, 22, 0.24)";
          this.ctx.beginPath();
          this.ctx.roundRect(2, -9, Math.max(0, len - 4), 18, 5);
          this.ctx.fill();

          /*
          * 2. Основная деревянная поверхность.
          */
          const woodGradient = this.ctx.createLinearGradient(0, -8, 0, 8);
          woodGradient.addColorStop(0, "#B88969");
          woodGradient.addColorStop(0.45, "#A87558");
          woodGradient.addColorStop(1, "#80533F");

          this.ctx.fillStyle = woodGradient;
          this.ctx.beginPath();
          this.ctx.roundRect(0, -8, len, 16, 3);
          this.ctx.fill();

          /*
          * 3. Верхняя светлая часть досок.
          */
          this.ctx.fillStyle = "rgba(225, 190, 155, 0.30)";
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
              this.ctx.strokeStyle = "rgba(91, 57, 42, 0.65)";
              this.ctx.lineWidth = 1.4;
              this.ctx.beginPath();
              this.ctx.moveTo(x, -7);
              this.ctx.lineTo(x, 7);
              this.ctx.stroke();

              /*
              * Маленький светлый край.
              */
              this.ctx.strokeStyle = "rgba(235, 205, 170, 0.22)";
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
                  this.ctx.fillStyle = "rgba(70, 43, 32, 0.08)";
                  this.ctx.fillRect(x + 2, -6, Math.min(7, len - x - 4), 12);
              } else if (shade === 2) {
                  this.ctx.fillStyle = "rgba(255, 225, 190, 0.07)";
                  this.ctx.fillRect(x + 2, -6, Math.min(6, len - x - 4), 12);
              }
          }

          /*
          * 6. Боковые продольные балки.
          */
          this.ctx.strokeStyle = "#704836";
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
          this.ctx.strokeStyle = "rgba(91, 61, 45, 0.85)";
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(0, -11);
          this.ctx.lineTo(len, -11);
          this.ctx.moveTo(0, 11);
          this.ctx.lineTo(len, 11);
          this.ctx.stroke();

          /*
          * 8. Маленькие крепления каната.
          */
          this.ctx.fillStyle = "#6E4736";

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
          this.ctx.strokeStyle = "rgba(255, 235, 205, 0.32)";
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
          endGradient.addColorStop(0, "rgba(65, 40, 30, 0.22)");
          endGradient.addColorStop(1, "rgba(65, 40, 30, 0)");

          this.ctx.fillStyle = endGradient;
          this.ctx.fillRect(0, -7, Math.min(18, len), 14);

          const rightGradient = this.ctx.createLinearGradient(Math.max(0, len - 18), 0, len, 0);
          rightGradient.addColorStop(0, "rgba(65, 40, 30, 0)");
          rightGradient.addColorStop(1, "rgba(65, 40, 30, 0.22)");

          this.ctx.fillStyle = rightGradient;
          this.ctx.fillRect(Math.max(0, len - 18), -7, Math.min(18, len), 14);

          this.ctx.restore();
      }

      /*
      * Для двойного моста добавляем небольшой
      * визуальный просвет между двумя дорожками.
      */
      if (count === 2) {
          this.ctx.save();
          this.ctx.strokeStyle = "rgba(55, 39, 31, 0.30)";
          this.ctx.lineWidth = 2;
          this.ctx.beginPath();
          this.ctx.moveTo(0, 0);
          this.ctx.lineTo(len, 0);
          this.ctx.stroke();
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
        const panelH = 230;

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
        this.ctx.fillText(`Уровень ${this.level} из ${this.levels.length} пройден!`, w / 2, py + 120);

        /*
         * 10. Сообщение.
         */
        this.ctx.font = '700 15px "Nunito", sans-serif';
        this.ctx.fillStyle = "#765E52";

        if (this.level >= this.levels.length) {
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
        this.ctx.moveTo(px + 55, py + 165);
        this.ctx.lineTo(px + panelW - 55, py + 165);
        this.ctx.stroke();

        /*
         * Декоративные точки.
         */
        this.ctx.fillStyle = "#C7954C";

        this.ctx.beginPath();
        this.ctx.arc(px + 48, py + 165, 3, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(px + panelW - 48, py + 165, 3, 0, Math.PI * 2);
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
            this.level >= this.levels.length ? "НАЧАТЬ ЗАНОВО" : "СЛЕДУЮЩИЙ УРОВЕНЬ",
            true
        );


        this.ctx.restore();
    }


  draw() {
    this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    /*
      * 1. Вода — самый нижний слой.
      */
    this.drawTopDownWater();

    /*
      * 2. Существующие мосты.
      *
      * Они должны находиться под островами,
      * чтобы входящие в острова края мостов
      * визуально уходили под землю.
      */
    for (const [edgeKey, count] of this.logic.bridges.entries()) {
        const [k1, k2] = edgeKey.split('-');
        const [r1, c1] = k1.split(',').map(Number);
        const [r2, c2] = k2.split(',').map(Number);

        const x1 = c1 * this.cellSize + this.offset;
        const y1 = r1 * this.cellSize + this.offset;
        const x2 = c2 * this.cellSize + this.offset;
        const y2 = r2 * this.cellSize + this.offset;

        this.drawMedievalBridge(x1, y1, x2, y2, count);
    }

    /*
      * 3. Острова.
      *
      * Острова находятся поверх мостов.
      */
    for (const [key, target] of this.logic.islands.entries()) {
        const [r, c] = key.split(',').map(Number);

        const cx = c * this.cellSize + this.offset;
        const cy = r * this.cellSize + this.offset;

        const current = this.logic.getIslandBridgesCount([r, c]);
        const isHovered = this.hoveredIsland && this.hoveredIsland[0] === r && this.hoveredIsland[1] === c;
        const isSelected = this.selectedIsland && this.selectedIsland[0] === r && this.selectedIsland[1] === c;

        this.drawCartoonIsland(cx, cy, target, current, isHovered, isSelected);
    }

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
      * 5. Кнопки.
      */
    this.drawWoodenButton(this.btn1Coords, "НОВАЯ КАРТА", this.btn1Hovered);
    this.drawWoodenButton(this.btn2Coords, "СБРОСИТЬ", this.btn2Hovered);

    /*
      * 6. Экран победы — самый верхний слой.
      */
    if (this.isVictoryShown) {
        this.drawVictoryScreen();
    }
  }
}