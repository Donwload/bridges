/*
 * Интерфейс: кнопки, зум-контролы и экран победы.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.ui = {
  isOverVictoryButton(pos) {
      if (!this.isVictoryShown) return false;

      const button = this.getVictoryButtonRect();

      return (
          pos.x >= button.x &&
          pos.x <= button.x + button.width &&
          pos.y >= button.y &&
          pos.y <= button.y + button.height
      );
  },

  getVictoryButtonRect() {
    const width = 200;
    const height = 45;

    return {
      x: this.canvasW / 2 - width / 2,
      y: this.canvasH / 2 + 50,
      width,
      height
    };
  },

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
    },

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
  },

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
    },

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
  },

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
  };
})();
