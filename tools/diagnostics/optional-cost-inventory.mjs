import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const { getCardDefinition } = createRequire(new URL("../../apps/api/package.json", import.meta.url))("@aegis/shared");
import "../../apps/api/src/cards/index.ts";
import { registeredCompiledCards } from "../../apps/api/src/engine/effects/interpreter/compiledCards.ts";
import { allowsOptionalProcessingCostWithoutTarget } from "../../apps/api/src/engine/effects/interpreter/processingCondition.ts";

const rows = [];
function walk(value, cardId, path) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, cardId, `${path}[${i}]`));
    return;
  }
  const a = value;
  const costs = [a.cost, a.additionalCost, ...(a.additionalCosts ?? []), ...(a.costOptions ?? [])].filter(
    (c) => c && typeof c === "object",
  );
  if (costs.length && a.kind) {
    const card = getCardDefinition(cardId);
    const effect = registeredCompiledCards.get(cardId)?.effects[Number(path.match(/\[(\d+)\]/)?.[1])];
    rows.push({
      cardId,
      name: card?.nameEn,
      path,
      trigger: effect?.trigger,
      frequency: effect?.frequency,
      sharedUseKey: effect?.sharedUseKey,
      effectOptional: effect?.optional === true,
      kind: a.kind,
      optional: a.optional === true,
      protected: allowsOptionalProcessingCostWithoutTarget(a),
      block: a.kind === "CostGatedBlock",
      printedBy: /\bby\b/i.test([card?.effectText, card?.inheritedEffectText, card?.securityEffectText].join(" ")),
      action: a,
    });
  }
  for (const [k, v] of Object.entries(a)) walk(v, cardId, `${path}.${k}`);
}
for (const [id, card] of registeredCompiledCards) walk(card.effects, id, "effects");
// Broad triage, not a claim that every selected card is broken. See the engine ledger.
const targetFamilies = new Set([
  "Delete",
  "Return",
  "Unsuspend",
  "PlayWithoutCost",
  "DeDigivolve",
  "TrashDigivolution",
  "SelectBind",
  "ModifyDP",
  "Suspend",
  "RedirectAttack",
  "Digivolve",
  "DnaDigivolve",
  "PlaceUnder",
  "MovePermanent",
  "UseOptionWithoutCost",
]);
const triageCardIds = [
  ...new Set(
    rows
      .filter((row) => row.printedBy && !row.protected && !row.block && targetFamilies.has(row.kind))
      .map((row) => row.cardId),
  ),
];
const result = { registeredCards: registeredCompiledCards.size, triageCardIds, rows };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(result, null, 2));
else console.log(JSON.stringify(result, null, 2));
