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
      // Фиксированная карта берёт вероятность из своего профиля.
      if (this.playMode === 'fixed') {
          const modes = window.BridgesModes2D;

          return modes
              ? modes.fixedProfile(this.difficulty, this.fixedSize).doubleChance
              : 0.45;
      }

      return 0.15 + 0.6 * this.getDifficulty();
  },

  generateNewLevel(level = this.level) {
    const modes = window.BridgesModes2D;
    const fixed = this.playMode === 'fixed';

    let profile;
    let doubleChance;
    let dense = false;
    let defectChance = 0;

    if (fixed && modes) {
        // Фиксированный режим: размер и сложность выбирает игрок.
        const chosen = modes.fixedProfile(
            this.difficulty,
            this.fixedSize
        );

        profile = {
            minIslands: chosen.minIslands,
            maxIslands: chosen.maxIslands,
            gridSize: chosen.gridSize,
            name: modes.describe(this.modeSettings)
        };
        doubleChance = chosen.doubleChance;
        dense = chosen.dense === true;
        defectChance = chosen.defectChance ?? 0;
    } else {
        // Для бесконечного режима уровни за пределами кампании
        // генерируются на текущем размере поля.
        profile = this.levels[level - 1] ?? {
            minIslands: 8,
            maxIslands: 12,
            gridSize: this.gridSize,
            name: "🧭 Новые земли"
        };
        doubleChance = this.getDoubleChance();
    }

    const success = this.logic.generateValidLevel({
        minIslands: profile.minIslands,
        maxIslands: profile.maxIslands,
        gridSize: profile.gridSize,
        doubleChance,
        dense,
        defectChance
    });

    if (success) {
      this.gridSize = profile.gridSize;

      this.updateCanvasGeometry();

      this.selectedIsland = null;
      this.hoveredIsland = null;
      this.lastMousePos = { x: 0, y: 0 };

      // Плотный генератор знает реальную долю двойных связей:
      // номинальный doubleChance для таких карт слишком грубый.
      const denseStats = this.logic.lastDenseStats;
      const shownDoubleChance =
          denseStats && Number.isFinite(denseStats.doubleShare)
              ? denseStats.doubleShare
              : doubleChance;

      if (this.statusElement) {
          if (fixed) {
              this.statusElement.textContent =
                  `${profile.name} · ` +
                  `островов: ${this.logic.islands.size} · ` +
                  `двойных связей: ${Math.round(shownDoubleChance * 100)}% · ` +
                  `мостов на связь: до ${this.logic.maxBridgeCount}`;
          } else {
              this.statusElement.textContent =
                  `Уровень ${this.level}: ${profile.name} · ` +
                  `двойных связей: ${Math.round(shownDoubleChance * 100)}% · ` +
                  `мостов на связь: до ${this.logic.maxBridgeCount}`;
          }
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
    // Расширение есть только у «расширяющегося мира».
    if (this.playMode !== 'expand') return false;

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

  /**
   * Перезапуск текущего режима.
   *
   * expand — сбрасывает прогресс кампании и начинает с первого уровня;
   * fixed  — создаёт новую карту тех же размера и сложности.
   * Если генерация не удалась, текущая карта остаётся нетронутой.
   */
  restartGame() {
      // Фиксированная карта: те же настройки, новая расстановка.
      if (this.playMode === 'fixed') {
          const success = this.generateNewLevel(this.level);

          if (!success) {
              if (this.statusElement) {
                  this.statusElement.textContent =
                      "Не удалось создать новую карту. Текущая карта сохранена.";
              }

              return false;
          }

          this.resetTransientState();
          this.invalidateWorldCache();
          this.draw();

          return true;
      }

      const previousLevel = this.level;
      const previousExpansions = this.expansionsDone;

      this.level = 1;
      this.expansionsDone = 0;

      const success = this.generateNewLevel(1);

      if (!success) {
          this.level = previousLevel;
          this.expansionsDone = previousExpansions;

          if (this.statusElement) {
              this.statusElement.textContent =
                  "Не удалось начать заново. Текущая карта сохранена.";
          }

          return false;
      }

      this.endless = true;
      this.resetTransientState();

      if (this.statusElement) {
          this.statusElement.textContent =
              `Игра начата заново. Уровень 1: ${this.levels[0].name} · ` +
              `двойных связей: ${Math.round(this.getDoubleChance() * 100)}% · ` +
              `мостов на связь: до ${this.logic.maxBridgeCount}`;
      }

      this.invalidateWorldCache();
      this.draw();

      return true;
  },

  /*
   * Сброс состояния, которое относится к прошлой карте: экран победы,
   * конфетти, искры, выбор острова. Сами мосты и острова не трогаем.
   */
  resetTransientState() {
      this.isVictoryShown = false;
      this.victoryAlpha = 0;
      this.confettiStarted = false;
      this.confetti.length = 0;
      this.sparkles.length = 0;
      this.selectedIsland = null;
      this.hoveredIsland = null;
      this.lastMousePos = { x: 0, y: 0 };
  },

  /*
   * Выбор режима 2D: диалог в шапке.
   *
   * Черновик настроек живёт отдельно от текущей партии: пока игрок
   * переключает карточки, карта не меняется. Изменения применяются
   * только по кнопке «Начать».
   */
  setupModeUI() {
      this.modeModal = document.getElementById("modeModal");
      this.modeButton = document.getElementById("modeButton");
      this.modeClose = document.getElementById("modeClose");
      this.modeApply = document.getElementById("modeApply");
      this.modeCancel = document.getElementById("modeCancel");
      this.modeButtonLabel = document.getElementById("modeButtonLabel");
      this.fixedOptions = document.getElementById("modeFixedOptions");
      this.modeNote = document.getElementById("modeNote");

      if (!this.modeModal || !this.modeButton) return;

      this.modeDraft = {
          mode: this.playMode,
          difficulty: this.difficulty,
          size: this.fixedSize
      };

      const open = () => {
          this.modeDraft = {
              mode: this.playMode,
              difficulty: this.difficulty,
              size: this.fixedSize
          };

          this.renderModeDraft();

          this.modeModal.hidden = false;
          document.body.classList.add("mode-modal-open");
          this.modeButton.setAttribute("aria-expanded", "true");

          this.modeClose?.focus();
      };

      const close = () => {
          if (this.modeModal.hidden) return;

          this.modeModal.hidden = true;
          document.body.classList.remove("mode-modal-open");
          this.modeButton.setAttribute("aria-expanded", "false");

          this.modeButton.focus();
      };

      this.modeButton.addEventListener("click", open);
      this.modeClose?.addEventListener("click", close);
      this.modeCancel?.addEventListener("click", close);

      this.modeModal
          .querySelectorAll("[data-close-mode]")
          .forEach((element) => element.addEventListener("click", close));

      document.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && !this.modeModal.hidden) {
              close();
          }
      });

      this.modeModal.querySelectorAll("[data-mode-id]").forEach((button) => {
          button.addEventListener("click", () => {
              this.modeDraft.mode =
                  window.BridgesModes2D.normalizeMode(button.dataset.modeId);
              this.renderModeDraft();
          });
      });

      this.modeModal.querySelectorAll("[data-difficulty]").forEach((button) => {
          button.addEventListener("click", () => {
              this.modeDraft.difficulty =
                  window.BridgesModes2D.normalizeDifficulty(
                      button.dataset.difficulty
                  );
              this.renderModeDraft();
          });
      });

      this.modeModal.querySelectorAll("[data-size]").forEach((button) => {
          button.addEventListener("click", () => {
              this.modeDraft.size =
                  window.BridgesModes2D.normalizeSize(button.dataset.size);
              this.renderModeDraft();
          });
      });

      this.modeApply?.addEventListener("click", () => {
          const settings = { ...this.modeDraft };

          close();
          this.applyModeSettings(settings);
      });

      this.updateModeUI();
  },

  /*
   * Подсветка выбранных карточек и чипов в открытом диалоге.
   */
  renderModeDraft() {
      const modes = window.BridgesModes2D;

      if (!modes || !this.modeModal) return;

      const draft = modes.normalizeSettings(this.modeDraft);

      this.modeDraft = draft;

      this.modeModal.querySelectorAll("[data-mode-id]").forEach((button) => {
          const active = button.dataset.modeId === draft.mode;

          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
      });

      this.modeModal
          .querySelectorAll("[data-difficulty]")
          .forEach((button) => {
              const active = button.dataset.difficulty === draft.difficulty;

              button.classList.toggle("is-active", active);
              button.setAttribute("aria-pressed", active ? "true" : "false");
          });

      this.modeModal.querySelectorAll("[data-size]").forEach((button) => {
          const active = Number(button.dataset.size) === draft.size;

          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
      });

      if (this.fixedOptions) {
          this.fixedOptions.hidden = draft.mode !== "fixed";
      }

      if (this.modeNote) {
          this.modeNote.textContent =
              draft.mode === "fixed"
                  ? `${modes.describe(draft)}. После победы появится новая ` +
                    `карта с теми же настройками. Текущая карта будет заменена.`
                  : "После победы карта расширится: появятся новые острова, " +
                    "а старые мосты останутся. Текущая карта будет заменена.";
      }
  },

  /*
   * Применение настроек: сохранить выбор и сразу собрать новую карту.
   * При неудаче возвращаем прежний режим и оставляем старую карту.
   */
  applyModeSettings(settings) {
      const modes = window.BridgesModes2D;

      const previous = {
          mode: this.playMode,
          difficulty: this.difficulty,
          size: this.fixedSize,
          level: this.level,
          expansions: this.expansionsDone
      };

      const next = modes
          ? modes.normalizeSettings(settings)
          : { ...previous, ...settings };

      this.playMode = next.mode;
      this.difficulty = next.difficulty;
      this.fixedSize = next.size;
      this.modeSettings = next;
      this.endless = next.mode === "expand";

      this.level = 1;
      this.expansionsDone = 0;

      if (modes) modes.saveSettings(next);

      const success = this.generateNewLevel(1);

      if (!success) {
          this.playMode = previous.mode;
          this.difficulty = previous.difficulty;
          this.fixedSize = previous.size;
          this.level = previous.level;
          this.expansionsDone = previous.expansions;
          this.endless = previous.mode === "expand";
          this.modeSettings = {
              mode: previous.mode,
              difficulty: previous.difficulty,
              size: previous.size
          };

          if (modes) modes.saveSettings(this.modeSettings);

          this.updateModeUI();

          if (this.statusElement) {
              this.statusElement.textContent =
                  "Не удалось создать карту с выбранными настройками. " +
                  "Текущая карта сохранена.";
          }

          return false;
      }

      this.resetTransientState();
      this.updateModeUI();
      this.invalidateWorldCache();
      this.draw();

      return true;
  },

  /*
   * Кнопка в шапке показывает текущий режим, чтобы не открывать диалог
   * ради проверки настроек.
   */
  updateModeUI() {
      const modes = window.BridgesModes2D;

      if (!modes) return;

      this.modeSettings = modes.normalizeSettings({
          mode: this.playMode,
          difficulty: this.difficulty,
          size: this.fixedSize
      });

      if (this.modeButtonLabel) {
          this.modeButtonLabel.textContent = modes.shortLabel(this.modeSettings);
      }

      if (this.modeButton) {
          this.modeButton.title =
              "Режим: " + modes.describe(this.modeSettings);
      }
  },

  getIslandAtPos(x, y) {
      const p = this.toWorld(x, y);
      return this.logic.getIslandAtPos(p.x, p.y, this.cellSize, this.offset);
  },

  /**
   * Дешёвое сравнение координат двух островов: без JSON.stringify,
   * который аллоцирует строки на каждое движение курсора.
   */
  isSameIsland(first, second) {
      return Boolean(
          first &&
          second &&
          first[0] === second[0] &&
          first[1] === second[1]
      );
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
    const islandChanged = !this.isSameIsland(island, this.hoveredIsland);
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
            // Фиксированная карта: после победы — новая карта тех же настроек.
            if (this.playMode === 'fixed') {
                if (this.generateNewLevel(this.level)) {
                    this.resetTransientState();
                    this.invalidateWorldCache();
                    this.draw();
                }

                return;
            }

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
                this.resetTransientState();
            }
        }

        return;
    }


    const btn = this.getBtnClicked(pos.x, pos.y);
    if (btn === 1) {
        // Полный перезапуск кампании — только после подтверждения.
        this.openRestartConfirm();
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
      if (targetIsland && !this.isSameIsland(targetIsland, this.selectedIsland)) {
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
