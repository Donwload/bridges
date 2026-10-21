/*
 * Эффекты 3D-режима: искры над собранными островами, конфетти победы
 * и фоновый слой скина (светлячки или пыльца).
 *
 * Логика частиц отделена от рисования: симуляция живёт в обычных
 * массивах и проверяется в Node, а WebGL трогается только в draw().
 * Так же устроен 2D-модуль renderer/effects.js, только там всё
 * рисуется на canvas.
 *
 * Классический script-модуль: публикует BridgesEffects3D в window и
 * module.exports для Node.
 */
(function (global) {
  "use strict";

  // Жёсткие пределы: эффекты не должны съедать кадр даже на большом поле.
  const MAX_SPARKLES = 60;
  const MAX_CONFETTI = 90;
  const MAX_AMBIENT = 44;

  // Сколько частиц создаёт фоновый слой каждого скина (как в 2D).
  const AMBIENT_COUNT = {
    none: 0,
    fireflies: 18,
    pollen: 14
  };

  /*
   * Ограничение шага: после паузы во вкладке deltaTime бывает огромным,
   * и без предела конфетти за один кадр улетело бы за пределы куба.
   */
  const MAX_STEP = 3;

  const TWO_PI = Math.PI * 2;

  const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);

  const normalize3 = (v) => {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;

    return [v[0] / len, v[1] / len, v[2] / len];
  };

  const cross3 = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];

  /*
   * Щепка конфетти вращается вокруг случайной оси: для этого нужен
   * любой ортонормированный базис в плоскости, перпендикулярной оси.
   */
  const flakeBasis = (axis) => {
    const helper = Math.abs(axis[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = normalize3(cross3(helper, axis));
    const e2 = cross3(axis, e1);

    return { e1, e2 };
  };

  class BridgesEffects3D {
    constructor(options) {
      const opts = options || {};

      // Свой источник случайности — чтобы тесты были детерминированными.
      this.rng = typeof opts.rng === "function" ? opts.rng : Math.random;

      this.time = 0;
      this.step = 1;

      this.sparkles = [];
      this.confetti = [];
      this.ambient = [];

      this.ambientKind = "none";
      this.ambientCenter = [0, 0, 0];
      this.ambientExtent = 1;

      this.confettiStarted = false;

      // Цвета приходят из скина: см. setLook().
      this.look = {
        sparkle: new Float32Array([0.99, 0.88, 0.3]),
        firefly: new Float32Array([1.0, 0.88, 0.5]),
        pollen: new Float32Array([0.95, 0.92, 0.78]),
        confetti: [
          [0.99, 0.88, 0.28],
          [0.94, 0.27, 0.27],
          [0.23, 0.51, 0.96]
        ]
      };
    }

    /*
     * palette — уже приведённая к Float32Array палитра скина,
     * confetti — список цветов-троек из скина.
     */
    setLook(palette, confetti) {
      if (palette) {
        if (palette.sparkle) this.look.sparkle = palette.sparkle;
        if (palette.firefly) this.look.firefly = palette.firefly;
        if (palette.pollen) this.look.pollen = palette.pollen;
      }

      if (Array.isArray(confetti) && confetti.length > 0) {
        this.look.confetti = confetti;
      }
    }

    // ---------- состояние ----------

    reset() {
      this.sparkles.length = 0;
      this.confetti.length = 0;
      this.ambient.length = 0;

      this.ambientKind = "none";
      this.confettiStarted = false;
      this.time = 0;
    }

    counts() {
      return {
        sparkles: this.sparkles.length,
        confetti: this.confetti.length,
        ambient: this.ambient.length
      };
    }

    /*
     * Возвращает число «шагов 60 Гц», прошедших за кадр: скорости частиц
     * заданы в единицах на шаг, поэтому частота кадров на них не влияет.
     */
    update(deltaTime) {
      const dt =
        typeof deltaTime === "number" && deltaTime > 0 ? deltaTime : 1 / 60;
      const step = Math.min(MAX_STEP, dt * 60);

      this.step = step;
      this.time += step / 60;

      this._updateSparkles(step);
      this._updateConfetti(step);

      return step;
    }

    _updateSparkles(step) {
      for (let i = this.sparkles.length - 1; i >= 0; i--) {
        const sparkle = this.sparkles[i];

        sparkle.x += sparkle.vx * step;
        sparkle.y += sparkle.vy * step;
        sparkle.z += sparkle.vz * step;
        sparkle.life += step;

        if (sparkle.life >= sparkle.maxLife) this.sparkles.splice(i, 1);
      }
    }

    _updateConfetti(step) {
      for (let i = this.confetti.length - 1; i >= 0; i--) {
        const flake = this.confetti[i];

        flake.x += flake.vx * step;
        flake.y += flake.vy * step;
        flake.z += flake.vz * step;

        // Гравитация тянет вниз по Z (вертикаль), вращение — вокруг своей оси.
        flake.vz -= flake.gravity * step;
        flake.angle += flake.spin * step;
        flake.life += step;

        if (flake.life >= flake.maxLife || flake.z <= flake.floor) {
          this.confetti.splice(i, 1);
        }
      }
    }

    // ---------- спавн ----------

    /*
     * Искра над собранным островом. Как и в 2D, появление случайное:
     * с вероятностью chance за кадр появляется одна частица.
     */
    maybeSpawnSparkle(world, satisfied, chance) {
      if (!satisfied || !world) return false;
      if (this.sparkles.length >= MAX_SPARKLES) return false;

      const rate = chance === undefined ? 0.1 : chance;
      const rng = this.rng;

      if (rng() >= rate) return false;

      this.sparkles.push({
        x: world[0] + (rng() - 0.5) * 0.46,
        y: world[1] + (rng() - 0.5) * 0.46,
        z: world[2] + (rng() - 0.5) * 0.12 + 0.2,
        vx: (rng() - 0.5) * 0.014,
        vy: (rng() - 0.5) * 0.014,
        vz: 0.006 + rng() * 0.012,
        size: 0.04 + rng() * 0.045,
        life: 0,
        maxLife: 22 + rng() * 24
      });

      return true;
    }

    /*
     * Залп конфетти. Запускается один раз на победу: повторные вызовы
     * до reset() ничего не добавляют.
     */
    startConfetti(center, extent) {
      if (this.confettiStarted) return 0;

      this.confettiStarted = true;

      const origin = center || [0, 0, 0];
      const spread = Math.max(0.6, extent || 1);
      const colors = this.look.confetti;
      const rng = this.rng;
      const total = MAX_CONFETTI;

      for (let i = 0; i < total; i++) {
        const axis = normalize3([rng() * 2 - 1, rng() * 2 - 1, rng() * 2 - 1]);
        const basis = flakeBasis(axis);
        const x = origin[0] + (rng() - 0.5) * spread;
        const y = origin[1] + (rng() - 0.5) * spread;
        const z = origin[2] + (rng() - 0.5) * spread * 0.7;

        this.confetti.push({
          x,
          y,
          z,
          vx: (x - origin[0]) * 0.02 + (rng() - 0.5) * 0.03,
          vy: (y - origin[1]) * 0.02 + (rng() - 0.5) * 0.03,
          vz: 0.03 + rng() * 0.05,
          gravity: 0.0018 + rng() * 0.0016,
          angle: rng() * TWO_PI,
          spin: (rng() - 0.5) * 0.5,
          e1: basis.e1,
          e2: basis.e2,
          size: 0.09 + rng() * 0.11,
          life: 0,
          maxLife: 70 + rng() * 110,
          floor: origin[2] - spread * 2.2,
          color: colors[Math.floor(rng() * colors.length)] || colors[0]
        });
      }

      return total;
    }

    /*
     * Фоновый слой скина. Позиции нормированы (−1..1), поэтому частицы
     * переживают расширение карты: при смене extent их не нужно
     * пересоздавать, достаточно обновить центр и размер.
     */
    syncAmbient(kind, center, extent) {
      const next = typeof kind === "string" ? kind : "none";
      const point = center || [0, 0, 0];
      const radius = Math.max(0.5, extent || 1);

      this.ambientCenter = point;
      this.ambientExtent = radius;

      if (next === this.ambientKind) return this.ambient.length;

      this.ambientKind = next;
      this.ambient.length = 0;

      const count = Math.min(AMBIENT_COUNT[next] || 0, MAX_AMBIENT);
      const firefly = next === "fireflies";
      const rng = this.rng;

      for (let i = 0; i < count; i++) {
        this.ambient.push({
          nx: rng() * 2 - 1,
          ny: rng() * 2 - 1,
          nz: rng() * 2 - 1,
          phase: rng() * TWO_PI,
          size: firefly ? 0.026 + rng() * 0.024 : 0.018 + rng() * 0.022,
          alpha: firefly ? 0.45 + rng() * 0.5 : 0.3 + rng() * 0.4,
          swing: firefly ? 0.04 + rng() * 0.08 : 0.03 + rng() * 0.07,
          speed: firefly ? 0.5 + rng() * 0.9 : 0.2 + rng() * 0.35,
          pulse: firefly ? 0.8 + rng() * 1.0 : 1.2 + rng() * 1.1
        });
      }

      return this.ambient.length;
    }

    // ---------- рисование ----------

    /*
     * ctx: {
     *   meshProgram, sphereMesh, tubeMesh, tmpModel, tmpNormal,
     *   particleMesh (низкополигональная сфера)
     * }
     *
     * Частицы рисуются с прозрачностью и без записи в depth buffer:
     * так они не перекрывают друг друга чёрными квадратами.
     */
    draw(gl, ctx) {
      if (!ctx || !ctx.meshProgram) return 0;

      const RMath = ctx.math || global.RMath;
      const GL3D = ctx.gl3d || global.GL3D;

      if (!RMath || !GL3D) return 0;

      const ambientCount = this.ambient.length;
      const sparkleCount = this.sparkles.length;
      const confettiCount = this.confetti.length;

      if (ambientCount + sparkleCount + confettiCount === 0) return 0;

      const mp = ctx.meshProgram;
      const model = ctx.tmpModel || new Float32Array(16);
      const normal = ctx.tmpNormal || new Float32Array(9);
      const particleMesh = ctx.particleMesh || ctx.sphereMesh;
      const tubeMesh = ctx.tubeMesh;

      gl.useProgram(mp.program);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);

      let drawn = 0;

      drawn += this._drawAmbient(gl, mp, particleMesh, model, normal, RMath, GL3D);
      drawn += this._drawSparkles(gl, mp, particleMesh, model, normal, RMath, GL3D);

      if (tubeMesh) {
        drawn += this._drawConfetti(gl, mp, tubeMesh, model, normal, RMath, GL3D);
      }

      gl.depthMask(true);
      gl.disable(gl.BLEND);

      return drawn;
    }

    _drawAmbient(gl, mp, mesh, model, normal, RMath, GL3D) {
      if (this.ambient.length === 0 || this.ambientKind === "none") return 0;

      const color =
        this.ambientKind === "fireflies" ? this.look.firefly : this.look.pollen;
      const center = this.ambientCenter;
      const extent = this.ambientExtent;
      const time = this.time;

      for (const particle of this.ambient) {
        const swing = extent * particle.swing;
        const x =
          center[0] +
          particle.nx * extent * 0.95 +
          Math.sin(time * particle.speed + particle.phase) * swing;
        const y =
          center[1] +
          particle.ny * extent * 0.95 +
          Math.cos(time * particle.speed * 0.7 + particle.phase * 1.3) * swing;
        // Вертикаль — Z: вверх-вниз частицы ходят слабее, чем вбок.
        const z =
          center[2] +
          particle.nz * extent * 0.95 +
          Math.cos(time * particle.speed * 0.9 + particle.phase) * swing * 0.6;

        const pulse = 0.5 + 0.5 * Math.sin(time * particle.pulse + particle.phase);
        const alpha = clamp01(particle.alpha * (0.35 + 0.65 * pulse));

        RMath.modelSphere(model, [x, y, z], particle.size * (0.75 + 0.35 * pulse));
        RMath.normalFromModel(normal, model);
        GL3D.drawMesh(gl, mp, mesh, model, normal, color, 0.35, alpha);
      }

      return this.ambient.length;
    }

    _drawSparkles(gl, mp, mesh, model, normal, RMath, GL3D) {
      const color = this.look.sparkle;

      for (const sparkle of this.sparkles) {
        const t = sparkle.life / sparkle.maxLife;
        const radius = sparkle.size * (1 - 0.75 * t);

        RMath.modelSphere(model, [sparkle.x, sparkle.y, sparkle.z], radius);
        RMath.normalFromModel(normal, model);
        GL3D.drawMesh(gl, mp, mesh, model, normal, color, 0.35, clamp01(1 - t));
      }

      return this.sparkles.length;
    }

    _drawConfetti(gl, mp, mesh, model, normal, RMath, GL3D) {
      for (const flake of this.confetti) {
        const t = flake.life / flake.maxLife;
        const cos = Math.cos(flake.angle);
        const sin = Math.sin(flake.angle);
        const half = flake.size * 0.5 * (1 - 0.3 * t);

        // Направление щепки в текущей фазе вращения.
        const ux = flake.e1[0] * cos + flake.e2[0] * sin;
        const uy = flake.e1[1] * cos + flake.e2[1] * sin;
        const uz = flake.e1[2] * cos + flake.e2[2] * sin;

        const a = [
          flake.x - ux * half,
          flake.y - uy * half,
          flake.z - uz * half
        ];
        const b = [
          flake.x + ux * half,
          flake.y + uy * half,
          flake.z + uz * half
        ];

        RMath.modelTube(model, a, b, flake.size * 0.3);
        RMath.normalFromModel(normal, model);
        GL3D.drawMesh(gl, mp, mesh, model, normal, flake.color, 0, clamp01(1 - t));
      }

      return this.confetti.length;
    }
  }

  BridgesEffects3D.LIMITS = {
    MAX_SPARKLES,
    MAX_CONFETTI,
    MAX_AMBIENT
  };

  BridgesEffects3D.AMBIENT_COUNT = AMBIENT_COUNT;

  global.BridgesEffects3D = BridgesEffects3D;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = BridgesEffects3D;
  }
})(typeof window !== "undefined" ? window : globalThis);
