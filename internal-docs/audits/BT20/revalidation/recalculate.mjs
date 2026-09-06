import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, "../../../..");
const read = (name) => JSON.parse(readFileSync(join(directory, name), "utf8"));
const inventory = read("catalog.json");
const dimensions = ["catalogRules", "irTrace", "behavioralProof", "peerStackProof", "deliveryGates"];
const acceptance = existsSync(join(directory, "acceptance.json")) ? read("acceptance.json") : { cards: {} };
const cards = inventory.cards.map(({ cardId, nameEn }) => {
  const evidencePath = join(directory, `${cardId}.json`);
  const draft = existsSync(evidencePath) ? read(`${cardId}.json`) : undefined;
  const accepted = acceptance.cards[cardId];
  const artifacts = Object.entries(accepted?.artifacts ?? {});
  const unchanged = artifacts.length === 4 && artifacts.every(([path, hash]) => {
    const absolute = join(repository, path);
    return existsSync(absolute) && createHash("sha256").update(readFileSync(absolute)).digest("hex") === hash;
  });
  const report = accepted?.reviewed && unchanged ? draft : undefined;
  if (report && report.cardId !== cardId) throw new Error(`Mismatched evidence ID: ${cardId}`);
  const scores = Object.fromEntries(dimensions.map((dimension) => {
    const score = report?.scores?.[dimension] ?? 0;
    if (![0, 1, 2].includes(score)) throw new Error(`Invalid ${dimension} score for ${cardId}`);
    return [dimension, dimension === "deliveryGates" ? 0 : score];
  }));
  if (report && accepted?.gatesPassed && accepted?.commit && accepted?.commands?.length) {
    scores.deliveryGates = 2;
  }
  const gaps = report?.gaps ?? [accepted?.reviewed && !unchanged
    ? "Accepted report, module, or test changed; lead review and rerun are pending."
    : "Independent revalidation pending; historical 10/10 is not current evidence.", ...(draft?.gaps ?? [])];
  const total = Object.values(scores).reduce((sum, score) => sum + score, 0);
  if (total === 10 && (gaps.length || !report?.evidence?.length || !report?.commands?.length)) {
    throw new Error(`${cardId}: 10/10 without complete evidence or with unresolved gaps`);
  }
  return { cardId, name: nameEn, status: total === 10 ? "verified" : report ? "in-progress" : draft ? "awaiting-review" : "pending", scores, total,
    evidence: report?.evidence ?? [], commands: report?.commands ?? [], gaps,
    ...(draft && !report ? { draftEvidence: draft.evidence ?? [], draftCommands: draft.commands ?? [] } : {}),
    ...(accepted ? { acceptance: accepted } : {}) };
});
const verified = cards.filter((card) => card.total === 10).length;
const totalPoints = cards.reduce((sum, card) => sum + card.total, 0);
const delivered = verified === cards.length && acceptance.delivery?.pushed === true
  && Boolean(acceptance.delivery?.commit && acceptance.delivery?.branch && acceptance.delivery?.reviewPr);
const ledger = { set: "BT20", baseline: inventory.baseline, status: delivered ? "complete" : "in-progress", dimensions,
  ...(delivered ? { delivery: acceptance.delivery } : {}),
  summary: { cards: cards.length, verified, totalPoints, maximumPoints: cards.length * 10,
    meanScore: Number((totalPoints / cards.length).toFixed(3)), percentVerified: Number((100 * verified / cards.length).toFixed(2)) },
  cards };
writeFileSync(join(directory, "ledger.json"), `${JSON.stringify(ledger, null, 2)}\n`);
const header = "# BT20 current evidence ledger\n\nReproduce: `node internal-docs/audits/BT20/revalidation/recalculate.mjs`. Scores use the established five dimensions (0–2 each). Pending scores reflect missing accepted evidence. Historical reports do not contribute. Final delivery points require explicit lead review and recorded gates.\n\n";
const deliverySummary = delivered
  ? `Collection complete: all card evidence and validation gates are accepted at pushed commit ${acceptance.delivery.commit}; [review PR](${acceptance.delivery.reviewPr}).`
  : "Collection remains in progress until all delivery gates, push, and PR are recorded.";
const summary = `Verified: ${verified}/${cards.length}; total ${totalPoints}/${cards.length * 10}; mean ${ledger.summary.meanScore}/10. ${deliverySummary}\n\n`;
const table = "| Card | Name | Catalog/rules | IR | Behavior | Peer/stack | Gates | Total | Evidence |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n";
const rows = cards.map((card) => `| ${card.cardId} | ${card.name} | ${dimensions.map((dimension) => `${card.scores[dimension]}/2`).join(" | ")} | ${card.total}/10 | ${card.evidence.length ? `[report](${card.cardId}.md)` : card.draftEvidence ? `[unaccepted draft](${card.cardId}.md)` : "pending"} |`).join("\n");
writeFileSync(join(directory, "LEDGER.md"), `${header}${summary}${table}${rows}\n`);
console.log(JSON.stringify(ledger.summary));
