import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const directory = new URL("./", import.meta.url);
const ledger = JSON.parse(readFileSync(new URL("ledger.json", directory), "utf8"));
const catalog = JSON.parse(
  readFileSync(new URL("../../../packages/shared/src/cards/data/cards.json", directory), "utf8"),
);
const expected = catalog
  .filter((card) => card.set === "BT22")
  .map((card) => card.cardId)
  .sort();
assert.deepEqual(
  ledger.cards.map((card) => card.cardId).sort(),
  expected,
  "Ledger must contain every catalog card exactly once",
);

const rows = [];
let total = 0;
let perfect = 0;
for (const card of ledger.cards) {
  const scores = ledger.scoreCategories.map((category) => card.scores[category]);
  assert(
    scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 2),
    `${card.cardId}: invalid score`,
  );
  const score = scores.reduce((sum, value) => sum + value, 0);
  if (score > 0) assert(existsSync(new URL(card.evidence, directory)), `${card.cardId}: missing evidence file`);
  if (score === 10) {
    assert.equal(card.gaps.length, 0, `${card.cardId}: unresolved gaps`);
    assert(
      card.commands.length > 0 && card.commands.every((command) => command.result === "passed"),
      `${card.cardId}: incomplete command evidence`,
    );
    assert(card.commit, `${card.cardId}: missing delivered commit`);
    assert(
      Object.values(ledger.gates).every((gate) => gate === "passed"),
      `${card.cardId}: pending collection gate`,
    );
    perfect += 1;
  }
  total += score;
  rows.push(`| ${card.cardId} | ${card.name} | ${scores.join(" | ")} | ${score}/10 | ${card.status} |`);
}

const complete = perfect === expected.length;
const report = [
  "# BT22 current audit scores",
  "",
  `Status: ${complete ? "complete" : "incomplete"}. ${perfect}/${expected.length} cards at 10/10.`,
  `Total: ${total}/${expected.length * 10}; mean: ${(total / expected.length).toFixed(2)}/10.`,
  "",
  "Zero means unverified in this run. Historical scores do not contribute.",
  "Reproduce with `node docs/audits/BT22-reaudit/recalculate.mjs`.",
  "",
  "| Card | Name | Catalog/rules | IR | Behavior | Peer/stack | Delivery | Total | State |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ...rows,
  "",
];
writeFileSync(new URL("SCORES.md", directory), report.join("\n"));
console.log(
  `${perfect}/${expected.length} at 10/10; ${total}/${expected.length * 10}; ${complete ? "complete" : "incomplete"}`,
);
