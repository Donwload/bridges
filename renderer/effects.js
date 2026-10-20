/*
 * Динамические эффекты: птицы, искры и конфетти.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.effects = {
  /**
   * Птицы над водой — чисто декоративный динамический слой.
   * Летят медленно, обтекают мир по горизонтали.
   */
  drawBirds() {
      if (!this.worldW || !this.worldH) return;

      /*
       * Скорость не должна зависеть от частоты кадров:
       * при 144 Гц птицы не летят в 2.4 раза быстрее, чем при 60 Гц.
       */
      const step = (this.deltaTime || 1 / 60) * 60;

      this.ctx.save();

      this.ctx.fillStyle = this.skin.birdFill;
      this.ctx.strokeStyle = this.skin.birdStroke;
      this.ctx.lineCap = "round";
      this.ctx.lineJoin = "round";

      for (const b of this.birds) {
          b.x += b.vx * step;
          b.y += b.vy * step;
          b.flap += 0.3 * step;

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
  },

  /**
   * Светлячки над ночной водой — тёплые пульсирующие точки.
   * Видны только в лунном скине; светлая лагуна их не рисует.
   */
  drawFireflies() {
      if (this.skinPreview !== "night") return;
      if (!this.worldW || !this.worldH) return;
      if (!this.fireflies || this.fireflies.length === 0) return;

      const baseRGB = this.skin.fireflyRGB || "253, 224, 71";
      const core = this.skin.fireflyCore || "#FEF9C3";

      // Цвет гало один на всех — меняется только прозрачность.
      const glowFill = `rgba(${baseRGB}, 1)`;

      this.ctx.save();
      this.ctx.globalCompositeOperation = "lighter";

      for (const f of this.fireflies) {
          const x =
              f.nx * this.worldW +
              Math.sin(this.time * f.swingSpeed + f.phase) * f.swing;

          const y =
              f.ny * this.worldH +
              Math.cos(this.time * f.swingSpeed * 0.8 + f.phase * 1.7) *
                  f.swing *
                  0.6;

          const pulse =
              0.35 +
              0.65 *
                  (0.5 + 0.5 * Math.sin(this.time * f.pulseSpeed + f.phase));

          const alpha = Math.max(0, Math.min(1, f.alpha * pulse));

          /*
           * Мягкое гало, затем тёплое ядро и белая точка внутри.
           */
          this.ctx.fillStyle = glowFill;
          this.ctx.globalAlpha = alpha * 0.18;
          this.ctx.beginPath();
          this.ctx.arc(x, y, f.size * 3.6, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.globalAlpha = alpha * 0.5;
          this.ctx.beginPath();
          this.ctx.arc(x, y, f.size * 1.8, 0, Math.PI * 2);
          this.ctx.fill();

          this.ctx.fillStyle = core;
          this.ctx.globalAlpha = alpha;
          this.ctx.beginPath();
          this.ctx.arc(x, y, f.size * 0.75, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.globalAlpha = 1;
      }

      this.ctx.restore();
  },

  /**
   * Пыльца и мелкие листья экспериментального скина.
   * Очень лёгкий декоративный слой, живёт только в этом скине.
   */
  drawPollen() {
      if (this.skinId !== "experimental") return;
      if (!this.worldW || !this.worldH) return;
      if (!this.pollen || this.pollen.length === 0) return;

      this.ctx.save();

      for (const p of this.pollen) {
          const x =
              p.nx * this.worldW +
              Math.sin(this.time * p.speed + p.phase) * p.swing;

          const y =
              p.ny * this.worldH +
              Math.cos(this.time * p.speed * 0.7 + p.phase * 1.3) *
                  p.swing *
                  0.6;

          const pulse = 0.5 + 0.5 * Math.sin(this.time * p.pulse + p.phase);

          this.ctx.globalAlpha = Math.max(
              0,
              p.alpha * (0.35 + 0.65 * pulse)
          );
          this.ctx.fillStyle = p.color;
          this.ctx.beginPath();
          this.ctx.ellipse(
              x,
              y,
              p.size,
              p.size * 0.55,
              this.time * 0.4 + p.phase,
              0,
              Math.PI * 2
          );
          this.ctx.fill();
      }

      this.ctx.globalAlpha = 1;
      this.ctx.restore();
  },

  /**
   * Мелкие искорки над выполненными островами.
   */
  drawIslandSparkles() {
      if (this.logic.islands.size === 0) return;

      /*
       * Резервуарная выборка прямо по Map: не создаём массив ключей
       * каждый кадр, но по-прежнему выбираем случайный остров.
       */
      if (Math.random() < 0.1) {
          let key = null;
          let seen = 0;

          for (const islandKey of this.logic.islands.keys()) {
              seen++;

              if (Math.random() < 1 / seen) key = islandKey;
          }

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

      const step = (this.deltaTime || 1 / 60) * 60;

      for (let i = this.sparkles.length - 1; i >= 0; i--) {
          const s = this.sparkles[i];

          s.x += s.vx * step;
          s.y += s.vy * step;
          s.life += step;

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
  },

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
  },

  drawConfetti() {
      this.ctx.save();

      const step = (this.deltaTime || 1 / 60) * 60;

      for (let i = this.confetti.length - 1; i >= 0; i--) {
          const p = this.confetti[i];

          p.x += p.vx * step;
          p.y += p.vy * step;
          p.vy += p.gravity * step;
          p.rot += p.vr * step;
          p.life += step;

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
  };
})();
