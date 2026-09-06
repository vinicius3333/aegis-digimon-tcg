import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const inventoryPath = new URL("docs/audits/BT25/inventory.json", root);
const ledgerPath = new URL("docs/audits/BT25/REAUDIT-LEDGER.md", root);
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
const catalog = JSON.parse(readFileSync(new URL("packages/shared/src/cards/data/cards.json", root), "utf8"))
  .filter((card) => card.set === "BT25")
  .sort((left, right) => left.cardId.localeCompare(right.cardId));
const dimensions = ["catalogKb", "irTrace", "behavior", "peersStacks", "validation"];
if (JSON.stringify(inventory.cards.map((card) => card.cardId)) !== JSON.stringify(catalog.map((card) => card.cardId))) {
  throw new Error("BT25 inventory must match every catalog ID exactly once and in order");
}

let verified = 0;
let scored = 0;
let points = 0;
const rows = inventory.cards.map((card, index) => {
  if (card.name !== catalog[index].nameEn) throw new Error(`${card.cardId}: catalog name mismatch`);
  let score = "pending";
  let parts = dimensions.map(() => "pending");
  if (card.scores !== null) {
    const values = dimensions.map((dimension) => card.scores[dimension]);
    if (values.some((value) => !Number.isInteger(value) || value < 0 || value > 2)) {
      throw new Error(`${card.cardId}: each of five dimensions must be an integer from 0 to 2`);
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    if (total === 10) {
      if (card.status !== "verified" || card.gaps.length !== 0 || !card.reviewedBy || !card.evidence) {
        throw new Error(`${card.cardId}: 10/10 requires an explicit review, evidence, and no gaps`);
      }
      readFileSync(new URL(card.evidence, root), "utf8");
      if (!card.commands.length || card.commands.some((command) => command.result !== "PASS")) {
        throw new Error(`${card.cardId}: 10/10 requires recorded passing commands`);
      }
      verified += 1;
    }
    points += total;
    scored += 1;
    score = `${total}/10`;
    parts = values.map((value) => `${value}/2`);
  }
  const evidence = card.evidence ? `[evidence](../../../${card.evidence}), ` : "";
  return `| ${card.cardId} | ${card.name} | ${parts.join(" | ")} | ${score} | ${card.status} | ${evidence}[module](../../../${card.module}), [test](../../../${card.test}) |`;
});

const markdown = [
  "# BT25 independent revalidation ledger",
  "",
  `Status: ${verified === catalog.length ? "CARD EVIDENCE VERIFIED; final delivery gates remain separately required" : "INCOMPLETE"}. Historical reports are not current proof.`,
  "The committed inventory records complete catalog fields, local KB responses, explicit review status, commands, and outstanding gaps.",
  "Scores use the existing five 0–2 dimensions. Pending scores are unassigned, not zero-quality judgments or implicit perfect scores.",
  "This command validates accounting only; clause fidelity remains an independent reviewer judgment.",
  "",
  "| Card | Name | Catalog/KB | IR trace | Behavior | Peers/stacks | Validation | Total | Status | Proof |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ...rows,
  "",
  `Independently approved 10/10: ${verified}/${catalog.length}. Scored cards: ${scored}/${catalog.length}. Assigned points: ${points}/${scored * 10}; ${catalog.length - scored} cards remain unscored. Collection maximum: ${catalog.length * 10}.`,
  "",
  "Recalculate with `node tools/recalculate-bt25-audit.mjs`; validate the stored ledger with `node tools/recalculate-bt25-audit.mjs --check`.",
  "",
].join("\n");

const formatted = spawnSync("pnpm", ["exec", "oxfmt", "--stdin-filepath=ledger.md", "--threads=1"], {
  cwd: fileURLToPath(root),
  input: markdown,
  encoding: "utf8",
  timeout: 30_000,
});
if (formatted.status !== 0) throw new Error(`Could not format BT25 ledger: ${formatted.error ?? formatted.stderr}`);
const output = formatted.stdout;

if (process.argv.includes("--check")) {
  if (readFileSync(ledgerPath, "utf8") !== output) throw new Error("BT25 ledger is stale; recalculate it");
} else {
  writeFileSync(ledgerPath, output);
}
console.log(
  `${verified}/${catalog.length} verified; ${scored} scored; ${points} assigned points. ${fileURLToPath(ledgerPath)}`,
);
