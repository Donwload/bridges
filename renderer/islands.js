/*
 * Острова: подсветка, декор и отрисовка.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.islands = {
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
  },

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
  },

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

      /*
       * Ночной фонарик на берегу острова. Он статичен и живёт
       * внутри кэшированного чанка, поэтому не стоит кадров каждый кадр.
       * В светлой лагуне фонариков нет.
       */
      if (this.skinPreview === "night") {
          const angle = rand(41) * Math.PI * 2;
          const dist = r - 4 + rand(42) * 3;
          const lx = cx + Math.cos(angle) * dist;
          const ly = cy - 2 + Math.sin(angle) * dist;

          const glow = this.ctx.createRadialGradient(lx, ly, 0, lx, ly, 15);

          glow.addColorStop(
              0,
              this.skin.lanternGlow || "rgba(253, 224, 71, 0.34)"
          );
          glow.addColorStop(1, "rgba(253, 224, 71, 0)");

          this.ctx.fillStyle = glow;
          this.ctx.beginPath();
          this.ctx.arc(lx, ly, 15, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.strokeStyle = "rgba(15, 23, 42, 0.85)";
          this.ctx.lineWidth = 1;
          this.ctx.beginPath();
          this.ctx.moveTo(lx, ly + 2);
          this.ctx.lineTo(lx, ly + 5);
          this.ctx.stroke();

          this.ctx.fillStyle = this.skin.lantern || "#FCD34D";
          this.ctx.beginPath();
          this.ctx.arc(lx, ly, 2.2, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.fillStyle = this.skin.lanternDark || "#B45309";
          this.ctx.fillRect(lx - 2.4, ly - 3.4, 4.8, 1.3);
      }

      this.ctx.restore();
  },

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
          this.ctx.strokeStyle = "rgba(255,255,255,0.55)";
          this.ctx.lineWidth = 2;

          this.ctx.beginPath();
          this.ctx.arc(cx, cy - 2, radius - 4, 0, Math.PI * 2);
          this.ctx.stroke();

          /*
            * Маленькая галочка.
            */
          const checkX = cx + 16;
          const checkY = cy + 16;

          this.ctx.strokeStyle = "#FFFFFF";
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
  };
})();
