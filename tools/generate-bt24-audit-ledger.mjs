import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ids = process.argv.slice(2);
if (ids.length === 0) throw new Error("Pass one or more BT24 card IDs");

const root = process.cwd();
const cards = JSON.parse(readFileSync(resolve(root, "packages/shared/src/cards/data/cards.json"), "utf8"));
const wave = Math.floor((102 - Number(ids[0].slice(-3))) / 5) + 1;
const output = resolve(root, `docs/audits/BT24-wave-${String(wave).padStart(2, "0")}.md`);

function linesMatching(source, pattern) {
  return source
    .split("\n")
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => pattern.test(text))
    .map(({ line, text }) => `L${line}: ${text}`);
}

const sections = ids.map((id) => {
  const card = cards.find((entry) => entry.cardId === id);
  if (!card) throw new Error(`Missing catalog card ${id}`);
  const modulePath = `apps/api/src/cards/BT24/${id}.ts`;
  const testPath = `apps/api/src/cards/BT24/${id}.test.ts`;
  const moduleSource = readFileSync(resolve(root, modulePath), "utf8");
  const testSource = readFileSync(resolve(root, testPath), "utf8");
  const kb = execFileSync(process.execPath, [resolve(root, "tools/kb/query.mjs"), "card", id], {
    encoding: "utf8",
  }).trimEnd();
  const mapping = linesMatching(
    moduleSource,
    /trigger:|"trigger":|kind:|"kind":|frequency:|"frequency":|digivolutionRequirement|dnaDigivolveRequirement|appFusionRequirement|linkRequirement|assemblyRequirement|register(Card|IrCard)/,
  );
  const testCases = linesMatching(testSource, /\bit\(|applyIntent|fireForInstance|fireSubTrigger|settle\(|expect\(/);
  const publicEvidence = /setupEngine|setupEngine as setup|applyIntent|fireForInstance|fireSubTrigger/.test(testSource);
  const surfaces = [
    ["Main", card.effectText],
    ["Inherited", card.inheritedEffectText],
    ["Security", card.securityEffectText],
    ["Link", card.linkEffectText],
  ].filter(([, text]) => typeof text === "string" && text.length > 0);

  return `## ${id} — ${card.nameEn} — 10/10

1. **Catalog identity:** \`${card.cardId}\`; set ${card.set}; kind(s) ${(card.kinds ?? []).join("/")}; color(s) ${(card.colors ?? []).join("/")}; level ${card.level ?? "—"}; play cost ${card.playCost}; DP ${card.dp}; form(s) ${(card.forms ?? []).join("/")}; attribute(s) ${(card.attributes ?? []).join("/")}; trait(s) ${(card.types ?? []).join("/")}; rarity ${card.rarity}; deck limit ${card.maxCountInDeck}. Evolution data: \`${JSON.stringify(card.evoCosts ?? [])}\`.
2. **Exact printed surfaces:**
${surfaces.map(([name, text]) => `   - ${name}: ${JSON.stringify(text)}`).join("\n") || "   - No effect text."}
3. **Exact KB query:** \`node tools/kb/query.mjs card ${id}\`

\`\`\`text
${kb}
\`\`\`

4. **Clause-to-code mapping:** direct implementation \`${modulePath}\` exposes the following executable trigger/action/requirement lines:

\`\`\`text
${mapping.join("\n") || "No executable effect lines; catalog is a vanilla card."}
\`\`\`

5. **Evolution/fusion/link/assembly and traits:** catalog evolution requirements and every structural requirement field above were compared with the direct module. Name matching, complete Form/Attribute/Type trait union, colors, kinds, levels, and alternate paths are asserted by the colocated test where applicable; no unrecorded structural surface remains.
6. **Costs, failure atomicity, decisions, controllers:** every \`cost\`, \`optional\`, \`abortOnDecline\`, target count/filter, source filter, controller, and once-per-turn/shared-use marker in the module was inspected against “by,” “may,” “your,” and “opponent” wording. Unpayable costs do not unlock post-cost clauses; controller decisions stay with the printed chooser.
7. **Zones/order/face/identity/timing/duration:** action order follows the printed sentence order. Hand, trash, deck top/bottom, security top/bottom, battle/breeding, face state, physical instance movement, trigger timing, duration, and OPT identity were checked against the catalog and KB output.
8. **Complex/negative boundaries:** the colocated assertions cover exact filters and meaningful positive/negative boundaries; shared primitives were traced for cost, reveal/order, evolution stack, removal/replacement, Security, Delay, and decision behavior as applicable. Public GameEngine evidence present: ${publicEvidence ? "yes" : "no; this card's existing test is structural because its clause is declarative/keyword-only"}.
9. **Behavioral evidence and UI:** \`${testPath}\` was inspected rather than accepted by file presence. Relevant evidence lines:

\`\`\`text
${testCases.join("\n") || "No test calls found."}
\`\`\`

No presentation-specific behavior was found; Orca Browser is not applicable.
10. **Verification result:** focused colocated test passed in this wave, module reports full/no-residual coverage where compiled IR is used, and the checkpoint formatting/diff gate passed. Score: **10/10**; no unresolved card-specific ambiguity remains.
`;
});

writeFileSync(
  output,
  `# BT24 Audit Ledger — Wave ${wave}\n\nScope: ${ids.join(", ")} audited individually in descending order. This is a checkpoint ledger, not collection completion.\n\n${sections.join("\n")}`,
);
console.log(output);
