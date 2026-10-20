/*
 * Уровни и игровое взаимодействие: генерация, клики, победа.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.game = {
  /**
   * Сложность уровня: 0 — легко, 1 — максимум.
   */
  getDifficulty() {
      return Math.min(1, (Math.max(1, this.level) - 1) / 14);
  },

  /**
   * Вероятность двойного моста. Именно она делает карты сложнее:
   * числа на островах растут, а вариантов распределения становится меньше.
   * Между одной парой островов допустимо не более двух мостов.
   */
  getDoubleChance() {
      return 0.15 + 0.6 * this.getDifficulty();
  },

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
},

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
  },

  getIslandAtPos(x, y) {
      const p = this.toWorld(x, y);
      return this.logic.getIslandAtPos(p.x, p.y, this.cellSize, this.offset);
  },

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
  },

  
  getBtnClicked(x, y) {
    const [x1, y1, x2, y2] = this.btn1Coords;
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return 1;
    const [x3, y3, x4, y4] = this.btn2Coords;
    if (x >= x3 && x <= x4 && y >= y3 && y <= y4) return 2;
    return 0;
  },

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
  },

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
  },

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
  },

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
  },

  flashWarning() {
    this.canvas.style.transform = "translateX(-5px)";
    setTimeout(() => this.canvas.style.transform = "translateX(5px)", 50);
    setTimeout(() => this.canvas.style.transform = "translateX(-5px)", 100);
    setTimeout(() => this.canvas.style.transform = "translateX(0)", 150);
  }
  };
})();
