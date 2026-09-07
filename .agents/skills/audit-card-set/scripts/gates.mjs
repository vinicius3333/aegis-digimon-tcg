#!/usr/bin/env node
// Award delivery-gate credit to every reviewed row after the set gates pass.
// usage: node gates.mjs <ledger.md> <gates 0|1|2> "<status suffix>"
import fs from "node:fs";

const [path, gatesArg, suffix] = process.argv.slice(2);
if (!path || gatesArg === undefined || !suffix) {
  console.error('usage: gates.mjs <ledger.md> <0|1|2> "<status suffix>"');
  process.exit(1);
}
const gates = Number(gatesArg);
const lines = fs.readFileSync(path, "utf8").split("\n");
let total = 0;
let tens = 0;
const out = lines.map((line) => {
  if (!/^\| [A-Z0-9]+-\d+ \|/.test(line)) return line;
  const cells = line.split("|").map((cell) => cell.trim());
  const evidence = [3, 4, 5, 6].map((index) => Number(cells[index]));
  const reviewed = evidence.reduce((sum, value) => sum + value, 0) > 0;
  if (reviewed) {
    cells[7] = String(gates);
    cells[9] = cells[9].replace(/;?\s*final gates pending/, `; ${suffix}`);
  }
  const score = evidence.reduce((sum, value) => sum + value, 0) + Number(cells[7]);
  cells[8] = `${score}/10`;
  total += score;
  if (score === 10) tens += 1;
  return `| ${cells.slice(1, 10).join(" | ")} |`;
});
const text = out
  .join("\n")
  .replace(/Current aggregate: \d+\/\d+; \d+\/\d+ cards/, (match) =>
    match.replace(/\d+(?=\/\d+;)/, String(total)).replace(/; \d+(?=\/)/, `; ${tens}`),
  );
fs.writeFileSync(path, text);
console.log(`aggregate ${total}; cards at 10/10: ${tens}`);
