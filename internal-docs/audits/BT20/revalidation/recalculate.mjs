import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const read = (name) => JSON.parse(readFileSync(join(directory, name), "utf8"));
const inventory = read("catalog.json");
const dimensions = ["catalogRules", "irTrace", "behavioralProof", "peerStackProof", "deliveryGates"];
const acceptance = existsSync(join(directory, "acceptance.json")) ? read("acceptance.json") : { cards: {} };
const cards = inventory.cards.map(({ cardId, nameEn }) => {
  const evidencePath = join(directory, `${cardId}.json`);
  const accepted = acceptance.cards[cardId];
  const report = accepted?.reviewed && existsSync(evidencePath) ? read(`${cardId}.json`) : undefined;
  if (report && report.cardId !== cardId) throw new Error(`Mismatched evidence ID: ${cardId}`);
  const scores = Object.fromEntries(dimensions.map((dimension) => {
    const score = report?.scores?.[dimension] ?? 0;
    if (![0, 1, 2].includes(score)) throw new Error(`Invalid ${dimension} score for ${cardId}`);
    return [dimension, dimension === "deliveryGates" ? 0 : score];
  }));
  if (accepted?.reviewed && accepted?.gatesPassed && accepted?.commit && accepted?.commands?.length) {
    scores.deliveryGates = 2;
  }
  const gaps = report?.gaps ?? ["Independent revalidation pending; historical 10/10 is not current evidence."];
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  if (total === 10 && (gaps.length || !report?.evidence?.length || !report?.commands?.length)) {
    throw new Error(`${cardId}: 10/10 without complete evidence or with unresolved gaps`);
  }
  return { cardId, name: nameEn, status: total === 10 ? "verified" : report ? "in-progress" : "pending", scores, total,
    evidence: report?.evidence ?? [], commands: report?.commands ?? [], gaps,
    ...(accepted ? { acceptance: accepted } : {}) };
});
const verified = cards.filter((card) => card.total === 10).length;
const totalPoints = cards.reduce((sum, card) => sum + card.total, 0);
const ledger = { set: "BT20", baseline: inventory.baseline, status: "in-progress", dimensions,
  summary: { cards: cards.length, verified, totalPoints, maximumPoints: cards.length * 10,
    meanScore: Number((totalPoints / cards.length).toFixed(3)), percentVerified: Number((100 * verified / cards.length).toFixed(2)) },
  cards };
writeFileSync(join(directory, "ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
const header = "# BT20 current evidence ledger\n\nReproduce: `node internal-docs/audits/BT20/revalidation/recalculate.mjs`. Scores use the established five dimensions (0–2 each). Pending scores reflect missing accepted evidence. Historical reports do not contribute. Final delivery points require explicit lead review and recorded gates.\n\n";
const summary = `Verified: ${verified}/${cards.length}; total ${totalPoints}/${cards.length * 10}; mean ${ledger.summary.meanScore}/10. Collection remains in progress until all delivery gates, push, and PR are recorded.\n\n`;
const table = "| Card | Name | Catalog/rules | IR | Behavior | Peer/stack | Gates | Total | Evidence |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n";
const rows = cards.map((card) => `| ${card.cardId} | ${card.name} | ${dimensions.map((dimension) => `${card.scores[dimension]}/2`).join(" | ")} | ${card.total}/10 | ${card.evidence.length ? `[report](${card.cardId}.md)` : "pending"} |`).join("\n");
writeFileSync(join(directory, "LEDGER.md"), `${header}${summary}${table}${rows}\n`);
console.log(JSON.stringify(ledger.summary));
