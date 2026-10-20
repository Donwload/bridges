/*
 * Вода: статичная основа и анимированная рябь.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.water = {
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

      /*
       * Ночное небо на воде: звёздные блики и луна с сиянием.
       * Рисуется только для лунного скина, поэтому светлая лагуна
       * остаётся без изменений.
       */
      if (this.skinPreview === "night") {
          const starRGB = this.skin.starRGB || "226, 232, 240";

          for (let i = 0; i < 90; i++) {
              const sx = (i * 197.3) % width;
              const sy = ((i * 113.7) % (height * 0.72));
              const alpha = 0.05 + ((i * 53) % 9) / 55;

              ctx.fillStyle = `rgba(${starRGB}, ${alpha})`;
              ctx.beginPath();
              ctx.arc(sx, sy, 0.7 + (i % 3) * 0.45, 0, Math.PI * 2);
              ctx.fill();
          }

          const moonX = width * 0.5;
          const moonY = height * 0.13;
          const moonR = Math.max(11, width * 0.02);

          const moonGlow = ctx.createRadialGradient(
              moonX,
              moonY,
              0,
              moonX,
              moonY,
              moonR * 5.5
          );

          moonGlow.addColorStop(0, this.skin.moonGlow || "rgba(226, 232, 240, 0.85)");
          moonGlow.addColorStop(0.28, "rgba(226, 232, 240, 0.16)");
          moonGlow.addColorStop(1, "rgba(226, 232, 240, 0)");

          ctx.fillStyle = moonGlow;
          ctx.fillRect(
              moonX - moonR * 5.5,
              moonY - moonR * 5.5,
              moonR * 11,
              moonR * 11
          );

          ctx.fillStyle = this.skin.moon || "#E2E8F0";
          ctx.beginPath();
          ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
          ctx.fill();

          /*
           * Тёмный «укус» превращает круг в месяц.
           */
          ctx.fillStyle = "rgba(2, 6, 23, 0.55)";
          ctx.beginPath();
          ctx.arc(
              moonX + moonR * 0.42,
              moonY - moonR * 0.18,
              moonR * 0.95,
              0,
              Math.PI * 2
          );
          ctx.fill();
      }

      this.waterCache = { canvas, width, height };
  },

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
  },

  /**
   * Белый спрайт-каустика. Создаётся один раз: вместо шести
   * новых radial-gradient на каждый кадр мы просто копируем картинку.
   */
  getCausticSprite() {
      if (this._causticSprite) return this._causticSprite;

      const size = 128;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;

      const ctx = canvas.getContext('2d');
      const gradient = ctx.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2
      );

      gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
      gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      this._causticSprite = canvas;

      return canvas;
  },

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

      const caustic = this.getCausticSprite();

      for (let i = 0; i < 6; i++) {
          const cx2 = ((i * 137 + this.time * 22) % (w + 80)) - 40;
          const cy2 = ((i * 91 + this.time * 15) % (h + 80)) - 40;
          const size = 30 + Math.sin(this.time + i) * 10;
          const alpha = 0.06 + Math.sin(this.time * 1.3 + i) * 0.03;

          this.ctx.globalAlpha = Math.max(0, alpha);
          this.ctx.drawImage(
              caustic,
              cx2 - size,
              cy2 - size,
              size * 2,
              size * 2
          );
      }

      this.ctx.globalAlpha = 1;
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

      /*
       * Лунная дорожка: медленно пульсирующие блики под луной.
       * Дорожка живёт только в ночном скине и не влияет на светлую воду.
       */
      if (this.skinPreview === "night") {
          const moonX = w * 0.5;
          const startY = h * 0.16;
          const starRGB = this.skin.starRGB || "226, 232, 240";

          this.ctx.save();
          this.ctx.globalCompositeOperation = "screen";

          for (let i = 0; i < 8; i++) {
              const y =
                  startY +
                  i * (h * 0.045) +
                  Math.sin(this.time * 0.6 + i * 1.1) * 5;

              const rx =
                  18 +
                  i * 7 +
                  Math.sin(this.time * 1.1 + i * 0.7) * 5;

              const ry = 2.2 + (i % 2) * 1.1;

              const alpha =
                  0.16 *
                  (1 - i / 9) *
                  (0.65 + 0.35 * Math.sin(this.time * 1.4 + i * 1.2));

              this.ctx.fillStyle = `rgba(${starRGB}, ${Math.max(0, alpha)})`;

              this.ctx.beginPath();
              this.ctx.ellipse(
                  moonX + Math.sin(this.time * 0.5 + i * 1.3) * 10,
                  y,
                  rx,
                  ry,
                  0,
                  0,
                  Math.PI * 2
              );
              this.ctx.fill();
          }

          this.ctx.restore();
      }
  }
  };
})();
