// Audits every registered DnaDigivolve action whose `into` filter omits
// `hasDnaDigivolutionRequirement`. Without that flag the destination pool falls back to
// `dnaDigivolveCostFor`'s legacy single-base digivolve cost, so a card that prints no DNA
// recipe becomes a legal DNA-digivolve result. Reports each filter with the number of
// matching Digimon that carry no structured DNA requirement.
//
// Reads the compiled card modules (authoritative), so run `pnpm --filter @aegis/api build`
// first. Usage: node tools/audit-dna-into-filters.mjs

import cardsJson from "../packages/shared/src/cards/data/cards.json" with { type: "json" };
await import("../apps/api/dist/cards/index.js");
const { registeredCompiledCards } = await import("../apps/api/dist/engine/effects/interpreter/compiledCards.js");
const { dnaDigivolutionRequirementsFor } = await import("../packages/shared/dist/effects/data.js");

const cards = Array.isArray(cardsJson) ? cardsJson : cardsJson.cards;

function nameOf(c) { return (c.nameEn ?? c.cardId).toLowerCase(); }
function matches(f, c) {
  if (f.or) return f.or.some((sub) => matches(sub, c));
  if (f.kind && !f.kind.some((k) => (c.kinds ?? []).includes(k))) return false;
  if (f.levels && !f.levels.includes(c.level)) return false;
  if (f.colors && !f.colors.some((col) => (c.colors ?? []).includes(col))) return false;
  if (f.namesExact && !f.namesExact.some((n) => nameOf(c) === n.toLowerCase())) return false;
  if (f.nameOrTrait) {
    const ok = f.nameOrTrait.some((clause) => {
      if (clause.match === "trait") return clause.tokens.some((t) => (c.types ?? []).includes(t));
      if (clause.match === "nameExact") return clause.tokens.some((t) => nameOf(c) === t.toLowerCase());
      return clause.tokens.some((t) => nameOf(c).includes(t.toLowerCase()));
    });
    if (!ok) return false;
  }
  return true;
}

function* dnaActions(node) {
  if (Array.isArray(node)) { for (const n of node) yield* dnaActions(n); return; }
  if (node && typeof node === "object") {
    if (node.kind === "DnaDigivolve") yield node;
    for (const v of Object.values(node)) yield* dnaActions(v);
  }
}

const leaks = [];
let flagged = 0;
for (const [cardId, compiled] of registeredCompiledCards) {
  for (const action of dnaActions(compiled.effects ?? [])) {
    const into = action.into;
    if (!into) continue;
    const f = into.filter ?? into;
    if (f.hasDnaDigivolutionRequirement) { flagged += 1; continue; }
    const pool = cards.filter((c) => (c.kinds ?? []).includes("Digimon") && matches(f, c));
    const noReq = pool.filter((c) => dnaDigivolutionRequirementsFor(c.cardId).length === 0);
    leaks.push({ cardId, filter: JSON.stringify(f), pool: pool.length, noReq: noReq.length, sample: noReq.slice(0, 4).map((c) => `${c.cardId} ${c.nameEn}`) });
  }
}
leaks.sort((a, b) => b.noReq - a.noReq);
console.log("DnaDigivolve into-filters carrying the flag:", flagged);
console.log("DnaDigivolve into-filters missing hasDnaDigivolutionRequirement:", leaks.length);
for (const l of leaks) console.log(`${l.noReq === 0 ? "OK  " : "LEAK"} ${l.cardId}  pool=${l.pool} noReq=${l.noReq}  ${l.filter}\n       e.g. ${l.sample.join(", ")}`);
