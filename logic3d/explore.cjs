/*
 * Разведка «рабочего коридора» 3D-спайка: сколько островов реально
 * помещается и как быстро находятся уникальные карты.
 *
 * Запуск: node logic3d/explore.cjs
 */

const { generateBoard3d, mulberry32 } = require("./spike.js");

function run(label, options, runs = 200) {
  const rng = mulberry32(9001 + options.size * 100 + options.minIslands);

  let ok = 0;
  const times = [];
  const counts = [];

  for (let i = 0; i < runs; i++) {
    const board = generateBoard3d({ ...options, rng });

    if (board) {
      ok++;
      times.push(board.time);
      counts.push(board.islands.size);
    }
  }

  const avg = (list) =>
    list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  const max = (list) => (list.length ? Math.max(...list) : 0);

  console.log(
    label.padEnd(34) +
      " успех " + ((ok / runs) * 100).toFixed(0).padStart(3) + "%" +
      "  островов ср " + avg(counts).toFixed(1).padStart(4) +
      " макс " + String(max(counts)).padStart(2) +
      "  время ср " + avg(times).toFixed(1).padStart(6) + " мс" +
      " макс " + max(times).toFixed(1).padStart(7) + " мс"
  );
}

console.log("конфигурация                        успех   острова        время генерации");
console.log("");

run("size 3, острова  4..8", { size: 3, minIslands: 4, maxIslands: 8 });
run("size 3, острова  6..8", { size: 3, minIslands: 6, maxIslands: 8 });
run("size 3, острова  8..10", { size: 3, minIslands: 8, maxIslands: 10 });
run("size 4, острова  6..10", { size: 4, minIslands: 6, maxIslands: 10 });
run("size 4, острова  8..12", { size: 4, minIslands: 8, maxIslands: 12 });
run("size 4, острова 10..14", { size: 4, minIslands: 10, maxIslands: 14 });
run("size 5, острова  8..12", { size: 5, minIslands: 8, maxIslands: 12 });
run("size 5, острова 12..16", { size: 5, minIslands: 12, maxIslands: 16 });
run("size 5, острова 16..20", { size: 5, minIslands: 16, maxIslands: 20 });
run("size 6, острова 16..22", { size: 6, minIslands: 16, maxIslands: 22 });
