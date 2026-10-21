/*
 * Web Worker генерации 3D-полей.
 *
 * Отдельный поток нужен из-за подбора поля: на 12+ островах одна попытка
 * бывает 30–230 мс, и в основном потоке это заметный рывок. Здесь тот же
 * код (logic3d/spike.js), но интерфейс продолжает рисоваться.
 *
 * Работает только как classic worker — без сборщика и модулей:
 * importScripts подтягивает генератор и протокол.
 */
"use strict";

importScripts("spike.js", "generator.js");

self.onmessage = function (event) {
  self.postMessage(
    BridgesGenerator3D.handleRequest(event.data, BridgesSpike3D)
  );
};
