/*
 * Бенчмарк и кросс-проверка 3D-спайка.
 *
 * Запуск: node logic3d/bench.cjs
 */

const {
  Solver3D,
  bruteForceSolutions3d,
  mulberry32,
  generateBoard3d,
  key3d,
  parseKey3d,
  sharedAxis3d
} = require("./spike.js");

function formatBoard(board) {
  const lines = [];
  lines.push("  размер поля: " + board.size + "^3");
  lines.push("  островов: " + board.islands.size);
  lines.push("  попыток генерации: " + board.attempts);
  lines.push("  время генерации: " + board.time.toFixed(1) + " мс");
  lines.push("  острова (координаты -> число):");

  for (const [key, value] of board.islands) {
    lines.push("    " + key + " -> " + value);
  }

  lines.push("  решение (мосты дерева):");

  for (const entry of board.solution.values()) {
    const p = entry.meta.p1;
    const q = entry.meta.p2;
    lines.push(
      "    " + key3d(p) + " == " + key3d(q) + "  x" + entry.count +
      "  (ось " + "xyz"[entry.meta.axis] + ")"
    );
  }

  return lines.join("\n");
}

// --- 1. Кросс-проверка солвера против перебора «в лоб» ---------------------
function crossCheck(iterations, rng) {
  let mismatches = 0;
  let checked = 0;

  for (let i = 0; i < iterations; i++) {
    const size = 3;
    const count = 2 + Math.floor(rng() * 5); // 2..6 островов
    const islands = new Map();

    while (islands.size < count) {
      const coord = [
        Math.floor(rng() * size),
        Math.floor(rng() * size),
        Math.floor(rng() * size)
      ];
      const key = key3d(coord);

      if (!islands.has(key)) {
        islands.set(key, 1 + Math.floor(rng() * 8));
      }
    }

    const solver = new Solver3D(islands, 2);
    const fast = solver.countSolutions(2, null);
    const slow = bruteForceSolutions3d(islands, 2, 2);

    checked++;

    if (Math.min(fast, 2) !== slow) {
      mismatches++;

      if (mismatches <= 3) {
        console.log("  расхождение на карте:", [...islands.entries()]);
        console.log("    солвер:", fast, " перебор:", slow);
      }
    }
  }

  console.log(
    "Кросс-проверка солвера: " + checked + " карт, расхождений " + mismatches
  );

  return mismatches;
}

// --- 2. Бенчмарк генерации -------------------------------------------------
function benchmark(runs, options) {
  const rng = mulberry32(options.seed);

  let ok = 0;
  let fail = 0;
  const times = [];
  const attempts = [];
  const islandCounts = [];
  let first = null;

  for (let i = 0; i < runs; i++) {
    const board = generateBoard3d({ ...options, rng });

    if (board) {
      ok++;
      times.push(board.time);
      attempts.push(board.attempts);
      islandCounts.push(board.islands.size);
      if (!first) first = board;
    } else {
      fail++;
    }
  }

  const avg = (list) =>
    list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0;
  const pct = (list, p) => {
    if (!list.length) return 0;
    const sorted = [...list].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  };

  console.log("");
  console.log(
    "Генерация size=" + options.size +
    ", острова " + options.minIslands + ".." + options.maxIslands +
    ":"
  );
  console.log("  запусков: " + runs + ", успешно: " + ok + ", не вышло: " + fail);
  console.log(
    "  успешность: " + ((ok / runs) * 100).toFixed(1) + "%"
  );
  console.log("  время успеха: среднее " + avg(times).toFixed(1) +
    " мс, p50 " + pct(times, 0.5).toFixed(1) +
    " мс, p95 " + pct(times, 0.95).toFixed(1) +
    " мс, макс " + (times.length ? Math.max(...times).toFixed(1) : "0") + " мс");
  console.log("  попыток до успеха: среднее " + avg(attempts).toFixed(1) +
    ", макс " + (attempts.length ? Math.max(...attempts) : 0));
  console.log("  среднее число островов: " + avg(islandCounts).toFixed(1));

  if (first) {
    console.log("");
    console.log("Пример карты:");
    console.log(formatBoard(first));
  }

  return { ok, fail };
}

console.log("=== 3D-спайк: проверка и бенчмарк ===");
console.log("");
crossCheck(400, mulberry32(777));
benchmark(300, {
  size: 3,
  minIslands: 4,
  maxIslands: 8,
  seed: 12345
});
