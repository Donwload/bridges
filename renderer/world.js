/*
 * Кэш статичного мира: чанки мостов и островов.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.world = {
  /**
   * Полный сброс кэша мира. Вызывается при смене размера поля/карты.
   */
  invalidateWorldCache() {
      this.bridgeChunks.clear();
      this.islandChunks.clear();
      this.worldElements = null;
      this.waterCache = null;
  },

  /**
   * Индекс элементов мира: заранее посчитанные габариты мостов и островов.
   * Нужен, чтобы при сборке кластера рисовать только то, что попадает
   * в его границы, и не разбирать ключи повторно.
   */
  ensureWorldElements() {
      if (this.worldElements) return this.worldElements;

      const islandMargin = 42;
      // У двойного моста крайняя дорожка смещена на 11 px,
      // а канаты добавляют ещё 11 px. Запас нужен, чтобы кластер
      // не обрезал внешние дорожки.
      const bridgeMargin = 26;

      const islands = [];
      const bridges = [];

      for (const [key, target] of this.logic.islands.entries()) {
          const [r, c] = key.split(',').map(Number);

          if (!Number.isInteger(r) || !Number.isInteger(c)) continue;

          const cx = c * this.cellSize + this.offset;
          const cy = r * this.cellSize + this.offset;

          islands.push({
              key,
              r,
              c,
              target,
              cx,
              cy,
              minX: cx - islandMargin,
              maxX: cx + islandMargin,
              minY: cy - islandMargin,
              maxY: cy + islandMargin
          });
      }

      for (const meta of this.logic.getBridgeMetas()) {
          if (meta.invalid) continue;

          const count = this.logic.bridges.get(meta.edgeKey) || 0;

          const x1 = meta.c1 * this.cellSize + this.offset;
          const y1 = meta.r1 * this.cellSize + this.offset;
          const x2 = meta.c2 * this.cellSize + this.offset;
          const y2 = meta.r2 * this.cellSize + this.offset;

          bridges.push({
              meta,
              count,
              x1,
              y1,
              x2,
              y2,
              minX: Math.min(x1, x2) - bridgeMargin,
              maxX: Math.max(x1, x2) + bridgeMargin,
              minY: Math.min(y1, y2) - bridgeMargin,
              maxY: Math.max(y1, y2) + bridgeMargin
          });
      }

      this.worldElements = { islands, bridges };

      return this.worldElements;
  },

  /**
   * Сбрасывает только те кластеры, которые пересекает прямоугольник.
   */
  invalidateWorldArea(minX, minY, maxX, maxY) {
      const size = this.chunkSize;

      const firstCol = Math.max(0, Math.floor(minX / size));
      const lastCol = Math.floor(maxX / size);
      const firstRow = Math.max(0, Math.floor(minY / size));
      const lastRow = Math.floor(maxY / size);

      for (let row = firstRow; row <= lastRow; row++) {
          for (let col = firstCol; col <= lastCol; col++) {
              const key = `${col},${row}`;

              this.bridgeChunks.delete(key);
              this.islandChunks.delete(key);
          }
      }
  },

  /**
   * После добавления/удаления моста пересобираем индекс и сбрасываем
   * кластеры вокруг обоих островов: меняется и мост, и внешний вид
   * островов на его концах.
   */
  invalidateBridgeArea(i1, i2) {
      this.worldElements = null;
      this.ensureWorldElements();

      if (
          !Array.isArray(i1) ||
          !Array.isArray(i2) ||
          i1.length < 2 ||
          i2.length < 2
      ) {
          this.invalidateWorldCache();
          return;
      }

      const x1 = i1[1] * this.cellSize + this.offset;
      const y1 = i1[0] * this.cellSize + this.offset;
      const x2 = i2[1] * this.cellSize + this.offset;
      const y2 = i2[0] * this.cellSize + this.offset;

      const margin = 60;

      this.invalidateWorldArea(
          Math.min(x1, x2) - margin,
          Math.min(y1, y2) - margin,
          Math.max(x1, x2) + margin,
          Math.max(y1, y2) + margin
      );
  },

  getChunkKey(col, row) {
      return `${col},${row}`;
  },

  getBridgeChunk(col, row, width, height) {
      const key = this.getChunkKey(col, row);

      let canvas = this.bridgeChunks.get(key);

      if (canvas) return canvas;

      canvas = document.createElement('canvas');
      canvas.width = width * this.chunkScale;
      canvas.height = height * this.chunkScale;

      const chunkCtx = canvas.getContext('2d');
      const originX = col * this.chunkSize;
      const originY = row * this.chunkSize;

      chunkCtx.scale(this.chunkScale, this.chunkScale);
      chunkCtx.translate(-originX, -originY);

      const previousCtx = this.ctx;
      this.ctx = chunkCtx;

      try {
          for (const bridge of this.ensureWorldElements().bridges) {
              if (
                  bridge.maxX < originX ||
                  bridge.minX > originX + width ||
                  bridge.maxY < originY ||
                  bridge.minY > originY + height
              ) {
                  continue;
              }

              this.drawMedievalBridge(
                  bridge.x1,
                  bridge.y1,
                  bridge.x2,
                  bridge.y2,
                  bridge.count
              );
          }
      } finally {
          this.ctx = previousCtx;
      }

      this.bridgeChunks.set(key, canvas);

      return canvas;
  },

  getIslandChunk(col, row, width, height) {
      const key = this.getChunkKey(col, row);

      let canvas = this.islandChunks.get(key);

      if (canvas) return canvas;

      canvas = document.createElement('canvas');
      canvas.width = width * this.chunkScale;
      canvas.height = height * this.chunkScale;

      const chunkCtx = canvas.getContext('2d');
      const originX = col * this.chunkSize;
      const originY = row * this.chunkSize;

      chunkCtx.scale(this.chunkScale, this.chunkScale);
      chunkCtx.translate(-originX, -originY);

      const previousCtx = this.ctx;
      this.ctx = chunkCtx;

      try {
          for (const island of this.ensureWorldElements().islands) {
              if (
                  island.maxX < originX ||
                  island.minX > originX + width ||
                  island.maxY < originY ||
                  island.minY > originY + height
              ) {
                  continue;
              }

              const current = this.logic.getIslandBridgesCount([
                  island.r,
                  island.c
              ]);

              const isComplete = current === island.target;

              this.drawCartoonIsland(
                  island.cx,
                  island.cy,
                  island.target,
                  current,
                  false,
                  false
              );

              this.drawIslandDecorations(
                  island.cx,
                  island.cy,
                  island.target,
                  isComplete
              );
          }
      } finally {
          this.ctx = previousCtx;
      }

      this.islandChunks.set(key, canvas);

      return canvas;
  },

  /**
   * Рисует статичные кластеры мостов и островов.
   * Мосты всегда ниже островов, поэтому слои копируются по очереди.
   */
  drawWorldChunks() {
      const ctx = this.ctx;
      const size = this.chunkSize;

      const left = Math.max(0, -this.viewX / this.viewScale);
      const top = Math.max(0, -this.viewY / this.viewScale);
      const right = Math.min(
          this.worldW,
          (this.viewportW - this.viewX) / this.viewScale
      );
      const bottom = Math.min(
          this.worldH,
          (this.viewportH - this.viewY) / this.viewScale
      );

      if (right <= left || bottom <= top) return;

      const firstCol = Math.max(0, Math.floor(left / size));
      const firstRow = Math.max(0, Math.floor(top / size));

      const lastCol = Math.min(
          Math.ceil(this.worldW / size) - 1,
          Math.floor(right / size)
      );

      const lastRow = Math.min(
          Math.ceil(this.worldH / size) - 1,
          Math.floor(bottom / size)
      );

      // Слой мостов.
      for (let row = firstRow; row <= lastRow; row++) {
          for (let col = firstCol; col <= lastCol; col++) {
              const originX = col * size;
              const originY = row * size;

              const width = Math.min(size, this.worldW - originX);
              const height = Math.min(size, this.worldH - originY);

              if (width <= 0 || height <= 0) continue;

              const chunk = this.getBridgeChunk(
                  col,
                  row,
                  width,
                  height
              );

              ctx.drawImage(
                  chunk,
                  0,
                  0,
                  chunk.width,
                  chunk.height,
                  originX,
                  originY,
                  width,
                  height
              );
          }
      }

      // Слой островов.
      for (let row = firstRow; row <= lastRow; row++) {
          for (let col = firstCol; col <= lastCol; col++) {
              const originX = col * size;
              const originY = row * size;

              const width = Math.min(size, this.worldW - originX);
              const height = Math.min(size, this.worldH - originY);

              if (width <= 0 || height <= 0) continue;

              const chunk = this.getIslandChunk(
                  col,
                  row,
                  width,
                  height
              );

              ctx.drawImage(
                  chunk,
                  0,
                  0,
                  chunk.width,
                  chunk.height,
                  originX,
                  originY,
                  width,
                  height
              );
          }
      }
  }
  };
})();
