#!/usr/bin/env node
// Update one ledger row and recalculate the aggregate.
// usage: node ledger.mjs <ledger.md> <CARD-ID> <catalog> <ir> <behavior> <peer> <gates> "<status>"
import fs from "node:fs";

const [path, id, ...rest] = process.argv.slice(2);
if (!path || !id || rest.length < 6) {
  console.error('usage: ledger.mjs <ledger.md> <CARD-ID> c ir b p g "<status>"');
  process.exit(1);
}
const columns = rest.slice(0, 5).map(Number);
const status = rest[5];
const lines = fs.readFileSync(path, "utf8").split("\n");
let total = 0;
let tens = 0;
const rowPrefix = `| ${id.split("-")[0]}-`;
const out = lines.map((line) => {
  if (!line.startsWith(rowPrefix)) return line;
  const cells = line.split("|").map((cell) => cell.trim());
  if (cells[1] === id) {
    columns.forEach((value, index) => {
      cells[3 + index] = String(value);
    });
    cells[8] = `${columns.reduce((sum, value) => sum + value, 0)}/10`;
    cells[9] = status;
  }
  const score = Number(cells[8].split("/")[0]);
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
