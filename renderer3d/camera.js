/*
 * Орбитальная камера для 3D-каркаса.
 *
 * Поворот вокруг вертикальной оси (yaw) и подъём (pitch), облёт цели на
 * фиксированном расстоянии. Публикует OrbitCamera в window.
 */
(function (global) {
  "use strict";

  const RMath = global.RMath;

  class OrbitCamera {
    constructor() {
      this.target = [0, 0, 0];
      this.distance = 9;
      this.yaw = 0.85;
      this.pitch = 0.55;
      this.fov = Math.PI / 3;
      this.near = 0.1;
      this.far = 400;

      this.eyePos = [0, 0, 0];
      this.viewProj = RMath.identity();

      this._view = RMath.identity();
      this._proj = RMath.identity();
    }

    eye() {
      const cosPitch = Math.cos(this.pitch);

      return [
        this.target[0] + this.distance * cosPitch * Math.sin(this.yaw),
        this.target[1] + this.distance * Math.sin(this.pitch),
        this.target[2] + this.distance * cosPitch * Math.cos(this.yaw)
      ];
    }

    update(aspect) {
      this.eyePos = this.eye();

      RMath.lookAt(this._view, this.eyePos, this.target, [0, 1, 0]);
      RMath.perspective(this._proj, this.fov, aspect, this.near, this.far);
      RMath.multiply(this.viewProj, this._proj, this._view);

      return this.viewProj;
    }

    rotate(dx, dy) {
      this.yaw -= dx * 0.008;
      this.pitch = RMath.clamp(this.pitch + dy * 0.008, -1.45, 1.45);
    }

    zoom(factor) {
      this.distance = RMath.clamp(this.distance * factor, 2.5, 80);
    }

    /*
     * Дистанция, при которой куб примерно вписывается в кадр.
     */
    fitToSize(size) {
      this.distance = Math.max(7, size * 2.7);
    }
  }

  global.OrbitCamera = OrbitCamera;
})(typeof window !== "undefined" ? window : globalThis);
