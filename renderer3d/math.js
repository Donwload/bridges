/*
 * Минимальная математика для 3D-каркаса: mat4, vec3 и лучи.
 *
 * Классический script-модуль: публикует объект RMath в window.
 * Матрицы — в column-major, как того требует WebGL.
 */
(function (global) {
  "use strict";

  const M = {};

  // ---------- vec3 ----------
  const v3 = {};

  v3.sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  v3.add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  v3.scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  v3.dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  v3.length = (a) => Math.hypot(a[0], a[1], a[2]);

  v3.normalize = (a) => {
    const len = Math.hypot(a[0], a[1], a[2]) || 1;
    return [a[0] / len, a[1] / len, a[2] / len];
  };

  v3.cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];

  M.v3 = v3;

  // ---------- mat4 ----------
  M.identity = () =>
    new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  M.perspective = (out, fovy, aspect, near, far) => {
    const f = 1 / Math.tan(fovy / 2);
    out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[12] = 0; out[13] = 0;
    out[14] = (2 * far * near) / (near - far);
    out[15] = 0;
    return out;
  };

  M.lookAt = (out, eye, center, up) => {
    let z0 = eye[0] - center[0];
    let z1 = eye[1] - center[1];
    let z2 = eye[2] - center[2];
    let len = Math.hypot(z0, z1, z2);

    if (len < 1e-6) {
      z0 = 0; z1 = 0; z2 = 1; len = 1;
    }

    z0 /= len; z1 /= len; z2 /= len;

    let x0 = up[1] * z2 - up[2] * z1;
    let x1 = up[2] * z0 - up[0] * z2;
    let x2 = up[0] * z1 - up[1] * z0;
    len = Math.hypot(x0, x1, x2);

    if (len < 1e-6) {
      x0 = 1; x1 = 0; x2 = 0; len = 1;
    }

    x0 /= len; x1 /= len; x2 /= len;

    const y0 = z1 * x2 - z2 * x1;
    const y1 = z2 * x0 - z0 * x2;
    const y2 = z0 * x1 - z1 * x0;

    out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
    out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
    out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
    out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
    out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
    out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
    out[15] = 1;
    return out;
  };

  // out = a * b (обе column-major)
  M.multiply = (out, a, b) => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

    b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  };

  M.invert = (out, a) => {
    const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

    const b00 = a00 * a11 - a01 * a10;
    const b01 = a00 * a12 - a02 * a10;
    const b02 = a00 * a13 - a03 * a10;
    const b03 = a01 * a12 - a02 * a11;
    const b04 = a01 * a13 - a03 * a11;
    const b05 = a02 * a13 - a03 * a12;
    const b06 = a20 * a31 - a21 * a30;
    const b07 = a20 * a32 - a22 * a30;
    const b08 = a20 * a33 - a23 * a30;
    const b09 = a21 * a32 - a22 * a31;
    const b10 = a21 * a33 - a23 * a31;
    const b11 = a22 * a33 - a23 * a32;

    let det =
      b00 * b11 - b01 * b10 + b02 * b09 +
      b03 * b08 - b04 * b07 + b05 * b06;

    if (!det) return null;

    det = 1 / det;

    out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
    out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
    out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
    out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
    out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
    out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
    out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
    out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
    out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
    out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
    out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
    out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
    out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
    out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
    out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
    out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
    return out;
  };

  /*
   * Модельная матрица сферы: перенос в центр и равномерный масштаб.
   */
  M.modelSphere = (out, center, radius) => {
    out[0] = radius; out[1] = 0; out[2] = 0; out[3] = 0;
    out[4] = 0; out[5] = radius; out[6] = 0; out[7] = 0;
    out[8] = 0; out[9] = 0; out[10] = radius; out[11] = 0;
    out[12] = center[0];
    out[13] = center[1];
    out[14] = center[2];
    out[15] = 1;
    return out;
  };

  /*
   * Модельная матрица «трубки» между p1 и p2.
   *
   * Базовый меш цилиндра вытянут вдоль +Y от -0.5 до 0.5 с радиусом 1.
   * Здесь строится ортонормированный базис, где ось Y смотрит из p1 в p2,
   * а X и Z масштабируются радиусом.
   */
  M.modelTube = (out, p1, p2, radius) => {
    const dir = v3.normalize(v3.sub(p2, p1));
    const length = v3.length(v3.sub(p2, p1)) || 1e-6;

    const helper = Math.abs(dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const xAxis = v3.normalize(v3.cross(helper, dir));
    const zAxis = v3.cross(dir, xAxis);

    const mid = [
      (p1[0] + p2[0]) / 2,
      (p1[1] + p2[1]) / 2,
      (p1[2] + p2[2]) / 2
    ];

    out[0] = xAxis[0] * radius; out[1] = xAxis[1] * radius;
    out[2] = xAxis[2] * radius; out[3] = 0;

    out[4] = dir[0] * length; out[5] = dir[1] * length;
    out[6] = dir[2] * length; out[7] = 0;

    out[8] = zAxis[0] * radius; out[9] = zAxis[1] * radius;
    out[10] = zAxis[2] * radius; out[11] = 0;

    out[12] = mid[0]; out[13] = mid[1]; out[14] = mid[2]; out[15] = 1;
    return out;
  };

  /*
   * Нормальная матрица (mat3) = базис без масштаба.
   *
   * Для сферы и трубки этого достаточно: нормали трубок лежат в плоскости XZ
   * и масштабируются по X и Z одинаково.
   */
  M.normalFromModel = (out, model) => {
    out[0] = model[0]; out[1] = model[1]; out[2] = model[2];
    out[3] = model[4]; out[4] = model[5]; out[5] = model[6];
    out[6] = model[8]; out[7] = model[9]; out[8] = model[10];

    const nx = Math.hypot(out[0], out[1], out[2]) || 1;
    const ny = Math.hypot(out[3], out[4], out[5]) || 1;
    const nz = Math.hypot(out[6], out[7], out[8]) || 1;

    out[0] /= nx; out[1] /= nx; out[2] /= nx;
    out[3] /= ny; out[4] /= ny; out[5] /= ny;
    out[6] /= nz; out[7] /= nz; out[8] /= nz;
    return out;
  };

  // ---------- лучи ----------
  /*
   * Луч из экранной точки. ndcX/ndcY в [-1, 1].
   * invViewProj — обратная матрица view*proj.
   */
  M.rayFromNdc = (invViewProj, ndcX, ndcY, near, far) => {
    const unproject = (z) => {
      const x = invViewProj[0] * ndcX + invViewProj[4] * ndcY +
        invViewProj[8] * z + invViewProj[12];
      const y = invViewProj[1] * ndcX + invViewProj[5] * ndcY +
        invViewProj[9] * z + invViewProj[13];
      const zw = invViewProj[2] * ndcX + invViewProj[6] * ndcY +
        invViewProj[10] * z + invViewProj[14];
      const w = invViewProj[3] * ndcX + invViewProj[7] * ndcY +
        invViewProj[11] * z + invViewProj[15];
      return [x / w, y / w, zw / w];
    };

    const pNear = unproject(-1);
    const pFar = unproject(1);

    return {
      origin: pNear,
      dir: v3.normalize(v3.sub(pFar, pNear))
    };
  };

  /*
   * Пересечение луча со сферой. Возвращает t или null.
   */
  M.raySphere = (origin, dir, center, radius) => {
    const oc = v3.sub(origin, center);
    const b = v3.dot(oc, dir);
    const c = v3.dot(oc, oc) - radius * radius;
    const h = b * b - c;

    if (h < 0) return null;

    const t = -b - Math.sqrt(h);
    if (t < 0) return null;

    return t;
  };

  M.clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  global.RMath = M;
})(window);
