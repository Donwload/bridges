class BridgesGameRenderer {
  constructor(canvasId, logic) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.logic = logic;

    this.gridSize = 7;
    this.cellSize = 85;
    this.offset = 60;

    this.colors = {
      water_base: "#4FC3F7",
      water_dark: "#0288D1",
      water_light: "#81D4FA",
      island_dirt: "#5D4037",
      island_grass: "#66BB6A",
      island_grass_light: "#81C784",
      island_shadow: "rgba(0,0,0,0.3)",
      bridge_wood: "#795548",
      bridge_plank: "#A1887F",
      bridge_rope: "#D7CCC8",
      btn_bg: "#FFB74D",
      btn_bg_hover: "#FFA726",
      btn_border: "#E65100",
      text_dark: "#3E2723",
      text_white: "#FFFFFF",
      progress_empty: "rgba(255,255,255,0.3)",
      progress_fill: "#4CAF50",
      progress_over: "#FF5252"
    };

    this.canvasW = this.gridSize * this.cellSize + 35;
    this.canvasH = this.gridSize * this.cellSize + 110;
    this.canvas.width = this.canvasW;
    this.canvas.height = this.canvasH;

    this.selectedIsland = null;
    this.hoveredIsland = null;
    this.btn1Hovered = false;
    this.btn2Hovered = false;
    this.isVictoryShown = false;

    this.time = 0;
    this.victoryAlpha = 0;
    this.lastMousePos = { x: 0, y: 0 };

    this.btn1Coords = [60, this.gridSize * this.cellSize + 40, 290, this.gridSize * this.cellSize + 85];
    this.btn2Coords = [330, this.gridSize * this.cellSize + 40, 560, this.gridSize * this.cellSize + 85];

    this.setupEvents();
    this.startAnimationLoop();
  }

  startAnimationLoop() {
    const animate = () => {
      this.time += 0.02;
      if (this.isVictoryShown && this.victoryAlpha < 1) {
        this.victoryAlpha = Math.min(1, this.victoryAlpha + 0.04);
      }
      this.draw();
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  setupEvents() {
    this.canvas.addEventListener('mousemove', (e) => {
      this.lastMousePos = this.getMousePos(e);
      this.onMouseMove(this.lastMousePos);
    });
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(this.getMousePos(e)));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(this.getMousePos(e)));
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.onContextMenu(this.getMousePos(e));
    });
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  getIslandAtPos(x, y) { return this.logic.getIslandAtPos(x, y, this.cellSize, this.offset); }

  getBtnClicked(x, y) {
    const [x1, y1, x2, y2] = this.btn1Coords;
    if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return 1;
    const [x3, y3, x4, y4] = this.btn2Coords;
    if (x >= x3 && x <= x4 && y >= y3 && y <= y4) return 2;
    return 0;
  }

  onMouseMove(pos) {
    if (this.isVictoryShown) return;
    const island = this.getIslandAtPos(pos.x, pos.y);
    const islandChanged = JSON.stringify(island) !== JSON.stringify(this.hoveredIsland);
    if (islandChanged) this.hoveredIsland = island;

    const btn = this.getBtnClicked(pos.x, pos.y);
    const btnChanged = (btn === 1) !== this.btn1Hovered || (btn === 2) !== this.btn2Hovered;
    if (btnChanged) { this.btn1Hovered = (btn === 1); this.btn2Hovered = (btn === 2); }

    this.canvas.style.cursor = (btn || island) ? 'pointer' : 'crosshair';
  }

  onMouseDown(pos) {
    if (this.isVictoryShown) {
      const btnW = 180, btnH = 45;
      const btnX1 = this.canvasW / 2 - btnW / 2, btnY1 = this.canvasH / 2 + 50;
      if (pos.x >= btnX1 && pos.x <= btnX1 + btnW && pos.y >= btnY1 && pos.y <= btnY1 + btnH) {
        this.logic.generateValidLevel();
        this.isVictoryShown = false;
        this.victoryAlpha = 0;
      }
      return;
    }
    const btn = this.getBtnClicked(pos.x, pos.y);
    if (btn === 1) { this.logic.generateValidLevel(); return; }
    if (btn === 2) { this.logic.reset(); return; }

    const island = this.getIslandAtPos(pos.x, pos.y);
    if (island) this.selectedIsland = island;
  }

  onMouseUp(pos) {
    if (this.selectedIsland && !this.isVictoryShown) {
      const targetIsland = this.getIslandAtPos(pos.x, pos.y);
      if (targetIsland && JSON.stringify(targetIsland) !== JSON.stringify(this.selectedIsland)) {
        if (!this.logic.addBridge(this.selectedIsland, targetIsland)) this.flashWarning();
      }
      this.selectedIsland = null;
      if (this.logic.checkVictory()) this.isVictoryShown = true;
    }
  }

  onContextMenu(pos) {
    if (this.isVictoryShown) return;
    const island = this.getIslandAtPos(pos.x, pos.y);
    if (island) this.logic.removeBridge(island);
  }

  flashWarning() {
    this.canvas.style.transform = "translateX(-5px)";
    setTimeout(() => this.canvas.style.transform = "translateX(5px)", 50);
    setTimeout(() => this.canvas.style.transform = "translateX(-5px)", 100);
    setTimeout(() => this.canvas.style.transform = "translateX(0)", 150);
  }

  drawTopDownWater() {
    const w = this.canvasW, h = this.canvasH;

    const gradient = this.ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, this.colors.water_base);
    gradient.addColorStop(1, this.colors.water_dark);
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.globalAlpha = 0.15;
    const stripeWidth = 30;
    const offset = (this.time * 15) % (stripeWidth * 2);

    for (let i = -h; i < w + h; i += stripeWidth * 2) {
      this.ctx.fillStyle = this.colors.water_light;
      this.ctx.beginPath();
      this.ctx.moveTo(i + offset, 0);
      this.ctx.lineTo(i + offset + stripeWidth, 0);
      this.ctx.lineTo(i + offset + stripeWidth - h, h);
      this.ctx.lineTo(i + offset - h, h);
      this.ctx.closePath();
      this.ctx.fill();
    }
    this.ctx.restore();

    this.ctx.save();
    for (let i = 0; i < 6; i++) {
      const cx = (w * 0.15) + (i * w * 0.14);
      const cy = (h * 0.2) + (i * h * 0.12);
      const baseRadius = 25 + (i % 3) * 15;
      const radius = baseRadius + Math.sin(this.time * 1.5 + i) * 8;

      this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.2 + (i % 2) * 0.1})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    this.ctx.restore();

    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    for (let i = 0; i < 10; i++) {
      const x = ((i * 97) + this.time * 8) % w;
      const y = ((i * 53) + Math.sin(this.time * 0.8 + i) * 15) % h;
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
      this.ctx.beginPath();
      this.ctx.ellipse(x, y, 6, 2, this.time + i, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawCartoonIsland(cx, cy, target, current, isHovered, isSelected) {
    const radius = 28;
    const isOverfilled = current > target;
    const isComplete = current === target;
    const fillRatio = Math.min(current / target, 1);

    // Тень
    this.ctx.fillStyle = this.colors.island_shadow;
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy + radius - 5, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Земля
    this.ctx.fillStyle = this.colors.island_dirt;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy + 5, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Трава с градиентом
    const grad = this.ctx.createRadialGradient(cx - 8, cy - 12, 5, cx, cy, radius);
    grad.addColorStop(0, this.colors.island_grass_light);
    grad.addColorStop(1, this.colors.island_grass);

    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy - 2, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Обводка
    this.ctx.strokeStyle = "#2E7D32";
    this.ctx.lineWidth = 2.5;
    this.ctx.stroke();

    // Кольцо прогресса (заполненность)
    if (!isOverfilled) {
      const progressRadius = radius + 8;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * fillRatio);

      // Фоновое кольцо
      this.ctx.strokeStyle = this.colors.progress_empty;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, progressRadius, 0, Math.PI * 2);
      this.ctx.stroke();

      // Заполненное кольцо
      if (fillRatio > 0) {
        this.ctx.strokeStyle = isComplete ? this.colors.progress_fill : "#FFC107";
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, progressRadius, startAngle, endAngle);
        this.ctx.stroke();
        this.ctx.lineCap = 'butt';
      }
    }

    // Анимация переполнения
    if (isOverfilled) {
      const pulseScale = 1 + Math.sin(this.time * 8) * 0.1;
      const glowIntensity = 0.5 + Math.sin(this.time * 8) * 0.3;

      // Красное свечение
      this.ctx.save();
      this.ctx.shadowColor = this.colors.progress_over;
      this.ctx.shadowBlur = 20 * glowIntensity;
      this.ctx.strokeStyle = this.colors.progress_over;
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius * pulseScale + 5, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();

      // Пульсирующее кольцо
      this.ctx.strokeStyle = `rgba(255, 82, 82, ${glowIntensity})`;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([8, 4]);
      this.ctx.lineDashOffset = -this.time * 30;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Свечение при наведении/выборе
    if (isHovered || isSelected) {
      this.ctx.strokeStyle = "#FFEB3B";
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([5, 5]);
      this.ctx.lineDashOffset = -this.time * 20;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, radius + 6, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    // Дерево
    if (!isSelected) {
      this.ctx.fillStyle = "#5D4037";
      this.ctx.fillRect(cx - 3, cy - 8, 6, 10);
      this.ctx.fillStyle = "#388E3C";
      this.ctx.beginPath();
      this.ctx.arc(cx, cy - 12, 9, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = "#1B5E20";
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    }

    // Цифра
    this.ctx.fillStyle = this.colors.text_white;
    this.ctx.font = "bold 18px Arial, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.strokeStyle = "rgba(0,0,0,0.5)";
    this.ctx.lineWidth = 3;
    this.ctx.strokeText(target.toString(), cx, cy + 2);
    this.ctx.fillText(target.toString(), cx, cy + 2);

    // Индикатор переполнения (улучшенный)
    if (isOverfilled) {
      const overAmount = current - target;
      const bounceY = Math.abs(Math.sin(this.time * 6)) * 5;

      // Красный круг с "!"
      this.ctx.fillStyle = this.colors.progress_over;
      this.ctx.beginPath();
      this.ctx.arc(cx + 20, cy - 20 - bounceY, 12, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = "#FFFFFF";
      this.ctx.font = "bold 16px Arial, sans-serif";
      this.ctx.fillText("!", cx + 20, cy - 18 - bounceY);

      // Текст с количеством лишних мостов
      this.ctx.fillStyle = this.colors.progress_over;
      this.ctx.font = "bold 12px Arial, sans-serif";
      this.ctx.strokeStyle = "#FFFFFF";
      this.ctx.lineWidth = 2;
      this.ctx.strokeText(`+${overAmount}`, cx + 20, cy - 35 - bounceY);
      this.ctx.fillText(`+${overAmount}`, cx + 20, cy - 35 - bounceY);
    }
  }

  drawMedievalBridge(x1, y1, x2, y2, count) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    this.ctx.save();
    this.ctx.translate(x1, y1);
    this.ctx.rotate(angle);

    const offsets = count === 1 ? [0] : [-12, 12];

    for (const offset of offsets) {
      this.ctx.save();
      this.ctx.translate(0, offset);

      this.ctx.strokeStyle = this.colors.bridge_rope;
      this.ctx.lineWidth = 3;
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, -10);
      this.ctx.lineTo(len, -10);
      this.ctx.moveTo(0, 10);
      this.ctx.lineTo(len, 10);
      this.ctx.stroke();
      this.ctx.setLineDash([]);

      this.ctx.fillStyle = this.colors.bridge_wood;
      for (let i = 10; i < len; i += 20) {
        this.ctx.fillRect(i - 2, -11, 4, 22);
      }

      this.ctx.fillStyle = this.colors.bridge_plank;
      this.ctx.fillRect(0, -8, len, 16);

      this.ctx.strokeStyle = this.colors.bridge_wood;
      this.ctx.lineWidth = 1.5;
      for (let i = 5; i < len; i += 15) {
        this.ctx.beginPath();
        this.ctx.moveTo(i, -8);
        this.ctx.lineTo(i, 8);
        this.ctx.stroke();
      }

      this.ctx.restore();
    }
    this.ctx.restore();
  }

  drawWoodenButton(coords, text, isHovered) {
    const [x1, y1, x2, y2] = coords;
    const w = x2 - x1, h = y2 - y1;
    const bg = isHovered ? this.colors.btn_bg_hover : this.colors.btn_bg;

    this.ctx.fillStyle = "rgba(0,0,0,0.3)";
    this.drawRoundRect(x1 + 3, y1 + 5, w, h, 12, "rgba(0,0,0,0.3)");

    this.ctx.fillStyle = bg;
    this.drawRoundRect(x1, y1, w, h, 12, bg);

    this.ctx.strokeStyle = this.colors.btn_border;
    this.ctx.lineWidth = 3;
    this.drawRoundRect(x1, y1, w, h, 12, null, this.colors.btn_border, 3);

    this.ctx.fillStyle = "rgba(255,255,255,0.3)";
    this.drawRoundRect(x1 + 3, y1 + 3, w - 6, h / 2 - 3, 8, "rgba(255,255,255,0.3)");

    this.ctx.fillStyle = this.colors.text_dark;
    this.ctx.font = "bold 14px Arial, sans-serif";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, x1 + w / 2, y1 + h / 2 + 2);
  }

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
  }

  drawVictoryScreen() {
    const w = this.canvasW, h = this.canvasH;

    this.ctx.fillStyle = `rgba(62, 39, 35, ${0.6 * this.victoryAlpha})`;
    this.ctx.fillRect(0, 0, w, h);

    if (this.victoryAlpha > 0.2) {
      const panelW = 360, panelH = 220;
      const px1 = w / 2 - panelW / 2, py1 = h / 2 - panelH / 2;

      this.ctx.save();
      this.ctx.translate(w/2, h/2);
      this.ctx.scale(this.victoryAlpha, this.victoryAlpha);
      this.ctx.translate(-w/2, -h/2);

      this.ctx.fillStyle = "#FFF8E1";
      this.drawRoundRect(px1, py1, panelW, panelH, 20, "#FFF8E1");
      this.ctx.strokeStyle = this.colors.btn_border;
      this.ctx.lineWidth = 4;
      this.drawRoundRect(px1, py1, panelW, panelH, 20, null, this.colors.btn_border, 4);

      this.ctx.fillStyle = this.colors.btn_border;
      this.ctx.beginPath(); this.ctx.arc(px1 + 20, py1 + 20, 6, 0, Math.PI*2); this.ctx.fill();
      this.ctx.beginPath(); this.ctx.arc(px1 + panelW - 20, py1 + 20, 6, 0, Math.PI*2); this.ctx.fill();
      this.ctx.beginPath(); this.ctx.arc(px1 + 20, py1 + panelH - 20, 6, 0, Math.PI*2); this.ctx.fill();
      this.ctx.beginPath(); this.ctx.arc(px1 + panelW - 20, py1 + panelH - 20, 6, 0, Math.PI*2); this.ctx.fill();

      this.ctx.fillStyle = "#E65100";
      this.ctx.font = "bold 36px Arial, sans-serif";
      this.ctx.textAlign = "center";
      this.ctx.fillText("ПОБЕДА!", w / 2, h / 2 - 30);

      this.ctx.fillStyle = this.colors.text_dark;
      this.ctx.font = "16px Arial, sans-serif";
      this.ctx.fillText("Королевство снова связано!", w / 2, h / 2 + 10);

      const btnW = 200, btnH = 45, bx1 = w / 2 - btnW / 2, by1 = h / 2 + 50;
      this.drawWoodenButton([bx1, by1, bx1 + btnW, by1 + btnH], "НОВОЕ ПРИКЛЮЧЕНИЕ", true);

      this.ctx.restore();
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvasW, this.canvasH);

    this.drawTopDownWater();

    for (const [edgeKey, count] of this.logic.bridges.entries()) {
      const [k1, k2] = edgeKey.split('-');
      const [r1, c1] = k1.split(',').map(Number);
      const [r2, c2] = k2.split(',').map(Number);
      const x1 = c1 * this.cellSize + this.offset, y1 = r1 * this.cellSize + this.offset;
      const x2 = c2 * this.cellSize + this.offset, y2 = r2 * this.cellSize + this.offset;
      this.drawMedievalBridge(x1, y1, x2, y2, count);
    }

    if (this.selectedIsland) {
      const [r, c] = this.selectedIsland;
      const x1 = c * this.cellSize + this.offset, y1 = r * this.cellSize + this.offset;
      const x2 = this.lastMousePos.x, y2 = this.lastMousePos.y;

      this.ctx.strokeStyle = "rgba(255, 235, 59, 0.6)";
      this.ctx.lineWidth = 4;
      this.ctx.setLineDash([8, 6]);
      this.ctx.lineDashOffset = -this.time * 30;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    for (const [key, target] of this.logic.islands.entries()) {
      const [r, c] = key.split(',').map(Number);
      const cx = c * this.cellSize + this.offset, cy = r * this.cellSize + this.offset;
      const current = this.logic.getIslandBridgesCount([r, c]);

      const isHovered = this.hoveredIsland && this.hoveredIsland[0] === r && this.hoveredIsland[1] === c;
      const isSelected = this.selectedIsland && this.selectedIsland[0] === r && this.selectedIsland[1] === c;

      this.drawCartoonIsland(cx, cy, target, current, isHovered, isSelected);
    }

    this.drawWoodenButton(this.btn1Coords, "НОВАЯ КАРТА", this.btn1Hovered);
    this.drawWoodenButton(this.btn2Coords, "СБРОСИТЬ", this.btn2Hovered);

    if (this.isVictoryShown) {
      this.drawVictoryScreen();
    }
  }
}