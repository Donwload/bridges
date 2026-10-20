/*
 * Скины: палитры, сохранение выбора и превью.
 *
 * Классический script-модуль: он добавляет методы к прототипу
 * BridgesGameRenderer. Такой формат сохраняет загрузку без сборщика
 * и не меняет поведение игры.
 */
(function () {
  "use strict";

const BRIDGE_SKINS = {
  default: {
    name: "Лазурные острова",
    description: "Классическая светлая лагуна",
    preview: "day",
    colors: {
      waterTop: "#7DD3FC",
      waterMid: "#22D3EE",
      waterDeep: "#0891B2",
      waterBottom: "#0369A1",
      waterSunStrong: "rgba(253, 224, 71, 0.16)",
      waterSunSoft: "rgba(253, 224, 71, 0.02)",
      waterDeepSoft: "rgba(7, 72, 103, 0.22)",
      waterDeepEdge: "rgba(7, 72, 103, 0.5)",
      waterVignette: "rgba(0, 40, 80, 0.18)",
      wave1: "rgba(255, 255, 255, 0.12)",
      wave2: "rgba(255, 255, 255, 0.08)",
      birdStroke: "rgba(35, 28, 23, 0.62)",
      birdFill: "rgba(35, 28, 23, 0.7)",

      dirtTop: "#8B6253",
      dirtBottom: "#4D342C",
      grassA: "#B7E08A",
      grassB: "#8BCB68",
      grassC: "#62AA56",
      grassD: "#438542",
      /*
       * Заполненный остров — прохладная мята, а не кислотная зелень:
       * так он читается как «решён», но не выбивается из лагуны.
       */
      doneA: "#DFF7EC",
      doneB: "#A9E8CA",
      doneC: "#6FC9A3",
      doneD: "#3E8F72",
      overA: "#F18A80",
      overB: "#D85B53",
      overC: "#A83E38",
      outline: "#356B35",
      outlineDone: "#2F7D63",
      outlineOver: "#963832",

      sceneBackground: "#0284C7",

      treeTrunk: "#68473A",
      treeDark: "#438447",
      treeLight: "#57964D",
      treeDoneDark: "#3F8F6B",
      treeDoneLight: "#5FB08A",
      treeOutline: "#326B39",

      progressTrack: "rgba(48, 69, 46, 0.48)",
      progressFill: "#F4D27A",
      progressDot: "#FFF4C7",
      overRing: "rgba(194, 58, 51, 0.88)",
      overBadge: "#B83B35",
      numberGlow: "253, 224, 71",
      flower: "#FCD34D",
      flowerDone: "#FDE047",

      bridgeShadow: "rgba(45, 30, 22, 0.24)",
      woodTop: "#B88969",
      woodMid: "#A87558",
      woodBottom: "#80533F",
      woodHighlight: "rgba(225, 190, 155, 0.30)",
      plankLine: "rgba(91, 57, 42, 0.65)",
      plankLight: "rgba(235, 205, 170, 0.22)",
      plankShadeA: "rgba(70, 43, 32, 0.08)",
      plankShadeB: "rgba(255, 225, 190, 0.07)",
      beam: "#704836",
      rope: "rgba(91, 61, 45, 0.85)",
      ropeHanger: "rgba(70, 43, 32, 0.55)",
      nail: "#6E4736",
      woodTopLight: "rgba(255, 235, 205, 0.32)",
      woodEnd: "rgba(65, 40, 30, 0.22)",
      bridgeGap: "rgba(55, 39, 31, 0.30)"
    }
  },

  night: {
    name: "Лунная ночь",
    description: "Тёмная вода и серебряные мосты",
    preview: "night",
    colors: {
      waterTop: "#312E81",
      waterMid: "#1E3A8A",
      waterDeep: "#0F172A",
      waterBottom: "#020617",
      waterSunStrong: "rgba(226, 232, 240, 0.22)",
      waterSunSoft: "rgba(226, 232, 240, 0.04)",
      waterDeepSoft: "rgba(2, 6, 23, 0.35)",
      waterDeepEdge: "rgba(2, 6, 23, 0.7)",
      waterVignette: "rgba(0, 0, 0, 0.45)",
      wave1: "rgba(191, 219, 254, 0.18)",
      wave2: "rgba(191, 219, 254, 0.10)",
      birdStroke: "rgba(226, 232, 240, 0.7)",
      birdFill: "rgba(226, 232, 240, 0.78)",

      dirtTop: "#6B7280",
      dirtBottom: "#1F2937",
      grassA: "#A7F3D0",
      grassB: "#6EE7B7",
      grassC: "#10B981",
      grassD: "#047857",
      /*
       * Заполненный остров — лунная бирюза: перекликается с серебряной
       * водой и мостами вместо прежнего кислотно-лаймового пятна.
       */
      doneA: "#CCFBF1",
      doneB: "#99F6E4",
      doneC: "#2DD4BF",
      doneD: "#0F766E",
      overA: "#FDA4AF",
      overB: "#F43F5E",
      overC: "#9F1239",
      outline: "#065F46",
      outlineDone: "#14B8A6",
      outlineOver: "#9F1239",

      sceneBackground: "#020617",

      treeTrunk: "#4B5563",
      treeDark: "#047857",
      treeLight: "#10B981",
      treeDoneDark: "#0F766E",
      treeDoneLight: "#2DD4BF",
      treeOutline: "#064E3B",

      progressTrack: "rgba(15, 23, 42, 0.6)",
      progressFill: "#99F6E4",
      progressDot: "#F0FDFA",
      overRing: "rgba(244, 63, 94, 0.9)",
      overBadge: "#9F1239",
      numberGlow: "226, 232, 240",
      flower: "#FDE68A",
      flowerDone: "#FEF3C7",

      /*
       * Ночная атмосфера: луна, звёздные блики, светлячки и фонарики.
       * Эти ключи используются только ночными эффектами.
       */
      moon: "#E2E8F0",
      moonGlow: "rgba(226, 232, 240, 0.85)",
      starRGB: "226, 232, 240",
      fireflyRGB: "253, 224, 71",
      fireflyCore: "#FEF9C3",
      lantern: "#FCD34D",
      lanternDark: "#B45309",
      lanternGlow: "rgba(253, 224, 71, 0.34)",

      bridgeShadow: "rgba(2, 6, 23, 0.5)",
      woodTop: "#9CA3AF",
      woodMid: "#6B7280",
      woodBottom: "#374151",
      woodHighlight: "rgba(226, 232, 240, 0.18)",
      plankLine: "rgba(15, 23, 42, 0.7)",
      plankLight: "rgba(226, 232, 240, 0.14)",
      plankShadeA: "rgba(15, 23, 42, 0.18)",
      plankShadeB: "rgba(226, 232, 240, 0.06)",
      beam: "#1F2937",
      rope: "rgba(203, 213, 225, 0.85)",
      ropeHanger: "rgba(15, 23, 42, 0.6)",
      nail: "#111827",
      woodTopLight: "rgba(241, 245, 249, 0.24)",
      woodEnd: "rgba(2, 6, 23, 0.3)",
      bridgeGap: "rgba(15, 23, 42, 0.45)"
    }
  }
};

const SKIN_STORAGE_KEY = "bridges-skin";

  const parts = (window.BridgesRendererParts =
    window.BridgesRendererParts || {});

  parts.skinUI = {
  /**
   * Загружает сохранённый скин. Скин влияет только на палитру отрисовки.
   */
  initSkin() {
    let saved = null;

    try {
      saved = localStorage.getItem(SKIN_STORAGE_KEY);
    } catch (error) {
      saved = null;
    }

    const skinId = saved && BRIDGE_SKINS[saved] ? saved : "default";

    this.skinId = skinId;
    this.skin = BRIDGE_SKINS[skinId].colors;
    this.skinPreview = BRIDGE_SKINS[skinId].preview;

    document.body.dataset.skin = skinId;
  },

  /**
   * Переключает скин и сбрасывает кэш мира, чтобы все чанки и вода
   * перерисовались с новой палитрой.
   */
  setSkin(skinId) {
    if (!BRIDGE_SKINS[skinId] || skinId === this.skinId) return false;

    this.skinId = skinId;
    this.skin = BRIDGE_SKINS[skinId].colors;
    this.skinPreview = BRIDGE_SKINS[skinId].preview;

    document.body.dataset.skin = skinId;

    try {
      localStorage.setItem(SKIN_STORAGE_KEY, skinId);
    } catch (error) {
      // Сохранение необязательно: игра работает и без localStorage.
    }

    this.invalidateWorldCache();
    this.updateSkinUI();

    return true;
  },

  setupSkinUI() {
    this.skinModal = document.getElementById("skinModal");
    this.skinButton = document.getElementById("skinButton");
    this.skinClose = document.getElementById("skinClose");

    if (!this.skinModal || !this.skinButton) return;

    const open = () => {
      this.skinModal.hidden = false;
      document.body.classList.add("skin-modal-open");

      this.updateSkinUI();
      this.drawSkinPreviews();

      this.skinClose?.focus();
    };

    const close = () => {
      this.skinModal.hidden = true;
      document.body.classList.remove("skin-modal-open");

      this.skinButton.focus();
    };

    this.skinButton.addEventListener("click", open);

    this.skinClose?.addEventListener("click", close);

    this.skinModal
      .querySelectorAll("[data-close-skins]")
      .forEach((element) => element.addEventListener("click", close));

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !this.skinModal.hidden) {
        close();
      }
    });

    this.skinModal.querySelectorAll("[data-skin-id]").forEach((button) => {
      button.addEventListener("click", () => {
        this.setSkin(button.dataset.skinId);
        close();
      });
    });

    this.updateSkinUI();
    this.drawSkinPreviews();
  },

  updateSkinUI() {
    if (!this.skinModal) return;

    this.skinModal
      .querySelectorAll("[data-skin-id]")
      .forEach((button) => {
        const active = button.dataset.skinId === this.skinId;

        button.classList.toggle("is-active", active);
        button.setAttribute(
          "aria-pressed",
          active ? "true" : "false"
        );
      });
  },

  drawSkinPreviews() {
    if (!this.skinModal) return;

    this.skinModal
      .querySelectorAll("canvas[data-preview-skin]")
      .forEach((canvas) => {
        const skin = BRIDGE_SKINS[canvas.dataset.previewSkin];

        if (skin) this.drawSkinPreview(canvas, skin);
      });
  },

  /**
   * Миниатюра-«скриншот» скина для карточки выбора.
   */
  drawSkinPreview(canvas, skin) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const c = skin.colors;

    ctx.clearRect(0, 0, w, h);

    const water = ctx.createLinearGradient(0, 0, w, h);
    water.addColorStop(0, c.waterTop);
    water.addColorStop(0.4, c.waterMid);
    water.addColorStop(1, c.waterDeep);

    ctx.fillStyle = water;
    ctx.fillRect(0, 0, w, h);

    const isNight = skin.preview === "night";

    /*
     * Солнце или луна.
     */
    ctx.save();
    ctx.fillStyle = isNight
      ? "rgba(226, 232, 240, 0.88)"
      : "rgba(253, 224, 71, 0.9)";
    ctx.shadowColor = isNight
      ? "rgba(226, 232, 240, 0.5)"
      : "rgba(253, 224, 71, 0.6)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(w * 0.78, h * 0.24, isNight ? 10 : 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (isNight) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
      ctx.beginPath();
      ctx.arc(w * 0.78 + 5, h * 0.24 - 3, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    /*
     * Волны.
     */
    ctx.strokeStyle = c.wave1;
    ctx.lineWidth = 1.2;

    for (let y = h * 0.4; y < h; y += 16) {
      ctx.beginPath();

      for (let x = -10; x <= w + 10; x += 16) {
        const yy = y + Math.sin(x * 0.08 + y) * 2;

        if (x === -10) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }

      ctx.stroke();
    }

    /*
     * Мост между островами.
     */
    const by = h * 0.58;

    const wood = ctx.createLinearGradient(0, by - 6, 0, by + 6);
    wood.addColorStop(0, c.woodTop);
    wood.addColorStop(0.5, c.woodMid);
    wood.addColorStop(1, c.woodBottom);

    ctx.fillStyle = wood;
    ctx.fillRect(w * 0.28, by - 5, w * 0.44, 10);

    ctx.strokeStyle = c.beam;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, by - 5);
    ctx.lineTo(w * 0.72, by - 5);
    ctx.moveTo(w * 0.28, by + 5);
    ctx.lineTo(w * 0.72, by + 5);
    ctx.stroke();

    /*
     * Два острова с числами.
     */
    const drawIsland = (x, y, radius) => {
      ctx.fillStyle = c.dirtBottom;
      ctx.beginPath();
      ctx.arc(x, y + 3, radius, 0, Math.PI * 2);
      ctx.fill();

      const grass = ctx.createRadialGradient(
        x - radius * 0.35,
        y - radius * 0.45,
        1,
        x,
        y,
        radius
      );

      grass.addColorStop(0, c.grassA);
      grass.addColorStop(0.6, c.grassB);
      grass.addColorStop(1, c.grassD);

      ctx.fillStyle = grass;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = c.outline;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#FFFDF7";
      ctx.font = `700 ${Math.round(radius * 0.9)}px "Fredoka", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("3", x, y + 1);
    };

    drawIsland(w * 0.30, h * 0.58, 16);
    drawIsland(w * 0.70, h * 0.58, 16);
  }
  };
})();
