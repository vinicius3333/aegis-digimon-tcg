#!/usr/bin/env node
// Report or update card scores in a section-based set ledger (docs/audits/<SET>.md).
//
// usage:
//   node ledger.mjs docs/audits/<SET>.md                       report aggregate and cards below 10
//   node ledger.mjs docs/audits/<SET>.md --gates <0|1|2>       award gates credit to every card whose
//                                                              score line has the "(c + ir + b + p + g)" form
//   node ledger.mjs docs/audits/<SET>.md --set <ID> c ir b p g  rewrite one card's score line
//
// The score line format is `**N/10** (c + ir + b + p + g)`; other historical
// forms are reported but never rewritten.
import fs from "node:fs";
import path from "node:path";

const [ledgerPath, mode, ...rest] = process.argv.slice(2);
if (!ledgerPath) {
  console.error("usage: ledger.mjs <docs/audits/SET.md> [--gates n | --set ID c ir b p g]");
  process.exit(1);
}

const HEADING = /^### ([A-Z0-9]+-\d+) — /;
const SCORE = /\*\*(\d+)\/10\*\*(?: \((\d) \+ (\d) \+ (\d) \+ (\d) \+ (\d)\))?/;

const lines = fs.readFileSync(ledgerPath, "utf8").split("\n");
const sections = [];
let current;
lines.forEach((line, index) => {
  const heading = line.match(HEADING);
  if (heading) {
    current = { id: heading[1], scoreLine: undefined };
    sections.push(current);
    return;
  }
  if (current && current.scoreLine === undefined && SCORE.test(line)) current.scoreLine = index;
});

function rewrite(section, columns) {
  const total = columns.reduce((sum, value) => sum + value, 0);
  lines[section.scoreLine] = lines[section.scoreLine].replace(SCORE, `**${total}/10** (${columns.join(" + ")})`);
}

if (mode === "--gates") {
  const gates = Number(rest[0]);
  for (const section of sections) {
    const match = lines[section.scoreLine ?? -1]?.match(SCORE);
    if (!match || match[2] === undefined) continue;
    rewrite(section, [match[2], match[3], match[4], match[5]].map(Number).concat(gates));
  }
} else if (mode === "--set") {
  const [id, ...columns] = rest;
  const section = sections.find((candidate) => candidate.id === id);
  if (!section || section.scoreLine === undefined || columns.length !== 5) {
    console.error(`no score line for ${id} or wrong column count`);
    process.exit(1);
  }
  rewrite(section, columns.map(Number));
}

if (mode) fs.writeFileSync(ledgerPath, lines.join("\n"));

let total = 0;
let tens = 0;
const below = [];
const unscored = [];
for (const section of sections) {
  const match = lines[section.scoreLine ?? -1]?.match(SCORE);
  if (!match) {
    unscored.push(section.id);
    continue;
  }
  const score = Number(match[1]);
  total += score;
  if (score === 10) tens += 1;
  else below.push(`${section.id} ${score}/10`);
}
const setName = path.basename(ledgerPath, ".md");
console.log(`${setName}: ${sections.length} cards; aggregate ${total}/${sections.length * 10}; ${tens} at 10/10`);
if (below.length) console.log(`below 10: ${below.join(", ")}`);
if (unscored.length) console.log(`no **N/10** score line (legacy format): ${unscored.length} cards`);
