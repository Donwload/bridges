/*
 * Мосты: отрисовка одиночных и двойных мостов.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.bridges = {
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
  };
})();
