import { readFileSync, writeFileSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const directory = new URL("./", import.meta.url);
const ledger = JSON.parse(readFileSync(new URL("ledger.json", directory), "utf8"));
const catalog = JSON.parse(readFileSync(new URL("catalog.json", directory), "utf8"));
assert.deepEqual(ledger.cards.map((card) => card.cardId).sort(), catalog.map((card) => card.cardId).sort());
assert.equal(new Set(ledger.cards.map((card) => card.cardId)).size, catalog.length);

for (const card of ledger.cards) {
  assert.equal(card.scores.length, 5, card.cardId);
  assert(card.scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 2), card.cardId);
  const score = card.scores.reduce((sum, value) => sum + value, 0);
  if (score > 0) assert(existsSync(new URL(card.evidence, directory)), `${card.cardId}: missing evidence`);
  if (score === 10) {
    assert.equal(card.gaps.length, 0, `${card.cardId}: unresolved gaps`);
    assert.equal(card.status, "verified", `${card.cardId}: not independently verified`);
    assert(card.commands?.length > 0, `${card.cardId}: missing executed commands`);
    assert(card.deliveryCommits?.length > 0, `${card.cardId}: missing delivery commit`);
    assert.equal(ledger.deliveryGates?.status, "passed", "Final collection gates must pass before 10/10");
  }
}

const total = ledger.cards.reduce((sum, card) => sum + card.scores.reduce((a, b) => a + b, 0), 0);
const verified = ledger.cards.filter((card) => card.scores.every((score) => score === 2)).length;
const status = verified === catalog.length ? "complete" : "incomplete";
assert.equal(ledger.status, status, "Collection status must agree with all per-card evidence scores");
const lines = [
  "# BT21 independent revalidation ledger",
  "",
  `Status: **${status}**. ${verified}/${catalog.length} cards at 10/10 (${((verified / catalog.length) * 100).toFixed(2)}%).`,
  `Current independently accepted points: ${total}/${catalog.length * 10}; average ${(total / catalog.length).toFixed(2)}/10.`,
  "",
  `Baseline: \`${ledger.baseline}\`. Historical scores are not current proof. Zero means unverified in this campaign, not necessarily defective.`,
  "",
  "Five categories, each 0–2: Catalog/rules; IR trace; Behavioral proof; Peer and stack proof; Executed delivery gates. Delivery points remain withheld until final synchronized collection gates. Draft worker reports are subject to lead review; this ledger records accepted scores.",
  "",
  "Recalculate with `node docs/audits/BT21-revalidation/recalculate.mjs`. See [checkpoint history](checkpoints.md), [open findings](gaps.md), and [exact KB queries](kb-queries.md).",
  "",
  "| Card | Name | Categories | Score | Status | Outstanding gaps |",
  "| --- | --- | --- | ---: | --- | --- |",
];
for (const card of ledger.cards) {
  const evidence = existsSync(new URL(card.evidence, directory)) ? `[${card.cardId}](${card.evidence})` : card.cardId;
  lines.push(`| ${evidence} | ${card.name} | ${card.scores.join(" / ")} | ${card.scores.reduce((a, b) => a + b, 0)}/10 | ${card.status} | ${card.gaps.join("; ")} |`);
}
writeFileSync(new URL("README.md", directory), `${lines.join("\n")}\n`);
console.log(`${ledger.set}: ${status}; ${verified}/${catalog.length} at 10/10; ${total}/${catalog.length * 10} points`);
