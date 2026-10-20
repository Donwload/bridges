/*
 * Камера: вписывание карты, зум, панорамирование и pinch.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.view = {
  /**
   * Показывает всю карту целиком.
   */
  resetView() {
      this.zoom = this.minZoom;
      this.viewScale = this.fitScale;
      this.viewX = (this.viewportW - this.worldW * this.viewScale) / 2;
      this.viewY = (this.viewportH - this.worldH * this.viewScale) / 2;
  },

  /**
   * Не даёт утащить карту за пределы экрана и центрирует её,
   * если она меньше окна.
   */
  clampView() {
      this.viewScale = this.fitScale * this.zoom;

      const contentW = this.worldW * this.viewScale;
      const contentH = this.worldH * this.viewScale;

      if (contentW <= this.viewportW) {
          this.viewX = (this.viewportW - contentW) / 2;
      } else {
          this.viewX = Math.min(
              0,
              Math.max(this.viewportW - contentW, this.viewX)
          );
      }

      if (contentH <= this.viewportH) {
          this.viewY = (this.viewportH - contentH) / 2;
      } else {
          this.viewY = Math.min(
              0,
              Math.max(this.viewportH - contentH, this.viewY)
          );
      }
  },

  /**
   * Приближение вокруг точки экрана.
   */
  zoomAt(screenX, screenY, factor) {
      const newZoom = Math.max(
          this.minZoom,
          Math.min(this.maxZoom, this.zoom * factor)
      );

      if (Math.abs(newZoom - this.zoom) < 1e-4) {
          return;
      }

      const oldScale = this.viewScale;

      // Мировая точка под курсором.
      const wx = (screenX - this.viewX) / oldScale;
      const wy = (screenY - this.viewY) / oldScale;

      this.zoom = newZoom;
      this.viewScale = this.fitScale * this.zoom;

      this.viewX = screenX - wx * this.viewScale;
      this.viewY = screenY - wy * this.viewScale;

      this.clampView();
  },

  toWorld(x, y) {
      return {
          x: (x - this.viewX) / this.viewScale,
          y: (y - this.viewY) / this.viewScale
      };
  },

  getZoomButtonClicked(x, y) {
      const hit = (rect) =>
          rect &&
          x >= rect.x &&
          x <= rect.x + rect.w &&
          y >= rect.y &&
          y <= rect.y + rect.h;

      if (hit(this.zoomInRect)) return 'in';
      if (hit(this.zoomOutRect)) return 'out';
      if (hit(this.zoomResetRect)) return 'reset';

      return null;
  },

  startPan(pos, pointerId) {
      this.panning = {
          pointerId,
          startX: pos.x,
          startY: pos.y,
          originX: this.viewX,
          originY: this.viewY
      };

      this.selectedIsland = null;
      this.canvas.style.cursor = 'grabbing';
      this.canvas.setPointerCapture?.(pointerId);
  },

  startPinch() {
      const points = [...this.pointers.values()];

      if (points.length < 2) return;

      const [a, b] = points;

      this.pinch = {
          distance: Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)),
          zoom: this.zoom,
          centerX: (a.x + b.x) / 2,
          centerY: (a.y + b.y) / 2
      };

      this.panning = null;
      this.selectedIsland = null;
  },

  updatePinch() {
      const points = [...this.pointers.values()];

      if (points.length < 2 || !this.pinch) return;

      const [a, b] = points;
      const distance = Math.max(1, Math.hypot(b.x - a.x, b.y - a.y));
      const centerX = (a.x + b.x) / 2;
      const centerY = (a.y + b.y) / 2;

      this.zoomAt(
          this.pinch.centerX,
          this.pinch.centerY,
          distance / this.pinch.distance
      );

      // Двигаем карту вслед за пальцами.
      this.viewX += centerX - this.pinch.centerX;
      this.viewY += centerY - this.pinch.centerY;

      this.pinch.distance = distance;
      this.pinch.centerX = centerX;
      this.pinch.centerY = centerY;
      this.pinch.zoom = this.zoom;

      this.clampView();
  }
  };
})();
