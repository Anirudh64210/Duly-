// Prints the last launches measured on this Mac and the median of each milestone
// (SPEC-W1 point 24). Called by make desktop-launch-time. Reads only the local file.
//
//   node desktop/scripts/launch-time.mjs [path to launch-times.jsonl]
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import process from "node:process";

const file =
  process.argv[2] ??
  join(homedir(), "Library", "Application Support", "Duly", "launch-times.jsonl");

let text = "";
try {
  text = readFileSync(file, "utf8");
} catch {
  process.stderr.write(`launch-time: no launches yet in ${file}\n`);
  process.exit(1);
}

const launches = text
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line));
const names = [...new Set(launches.flatMap((l) => Object.keys(l)))].filter((n) => n !== "version");

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

process.stdout.write(`${file}: ${launches.length} launches, milliseconds since process start\n`);
for (const [index, launch] of launches.entries()) {
  const marks = names.map((n) => `${n}=${launch[n] ?? "-"}`).join(" ");
  process.stdout.write(`${index + 1}. ${launch.version} ${marks}\n`);
}
process.stdout.write("median:\n");
for (const name of names) {
  const values = launches.map((l) => l[name]).filter((v) => typeof v === "number");
  if (values.length > 0) process.stdout.write(`  ${name}: ${median(values)} (${values.length})\n`);
}
