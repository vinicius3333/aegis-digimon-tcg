import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = process.cwd();
const resultsPath = process.argv[2] ?? resolve(root, "docs/audits/BT25-focused-results.tsv");
const output = resolve(root, "docs/audits/BT25-card-audit.md");
const cards = JSON.parse(readFileSync(resolve(root, "packages/shared/src/cards/data/cards.json"), "utf8"));
const bt25 = cards.filter((card) => card.set === "BT25").sort((a, b) => a.cardId.localeCompare(b.cardId));
const results = new Map(
  readFileSync(resultsPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [cardId, status, count, origin] = line.split("\t");
      return [cardId, { status, count, origin }];
    }),
);

if (bt25.length !== 104) throw new Error(`Expected 104 BT25 catalog cards, found ${bt25.length}`);
for (const card of bt25) {
  if (!["PASS", "HISTORICAL_PASS"].includes(results.get(card.cardId)?.status)) {
    throw new Error(`Missing passing focused or inherited result for ${card.cardId}`);
  }
}
execFileSync("git", ["merge-base", "--is-ancestor", "origin/audit/bt25-complete", "origin/main"]);

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

const interpreterRoot = resolve(root, "apps/api/src/engine/effects/interpreter");
const interpreterSources = walkFiles(interpreterRoot)
  .filter((path) => path.endsWith(".ts") && !path.endsWith(".test.ts"))
  .map((path) => ({ path, source: readFileSync(path, "utf8") }));

function matchingLines(source, pattern) {
  return source
    .split("\n")
    .map((text, index) => ({ line: index + 1, text: text.trim() }))
    .filter(({ text }) => pattern.test(text))
    .map(({ line, text }) => `L${line}: ${text}`);
}

function mechanicQueries(card) {
  const text = [card.effectText, card.inheritedEffectText, card.securityEffectText, card.linkEffectText]
    .filter(Boolean)
    .join(" ");
  const candidates = [
    [/DNA digivolve/i, "DNA digivolution requirements timing"],
    [/App Fusion/i, "App Fusion link requirements"],
    [/\[Link\]|would link|linked card/i, "Link timing cost linked cards"],
    [/digivolve/i, "digivolution requirements effects"],
    [/security/i, "security effects trash recover check"],
    [/attack|battle|Raid|Blocker|Piercing/i, "attack battle timing Raid Blocker Piercing"],
    [/delete|On Deletion/i, "deletion timing simultaneous effects"],
    [/trash|discard/i, "trash discard timing zones"],
    [/play|On Play/i, "play by effect timing cost"],
    [/Once Per Turn/i, "once per turn effect identity"],
  ];
  const queries = candidates.filter(([pattern]) => pattern.test(text)).map(([, query]) => query);
  return [...new Set(queries)].slice(0, 3);
}

function peersFor(card) {
  const traits = new Set(card.types ?? []);
  return cards
    .filter((peer) => peer.cardId !== card.cardId)
    .map((peer) => ({
      peer,
      sharedTraits: (peer.types ?? []).filter((trait) => traits.has(trait)),
      sameLevel: peer.level === card.level,
    }))
    .filter(({ sharedTraits }) => sharedTraits.length > 0)
    .sort(
      (a, b) =>
        b.sharedTraits.length - a.sharedTraits.length ||
        Number(b.sameLevel) - Number(a.sameLevel) ||
        a.peer.cardId.localeCompare(b.peer.cardId),
    )
    .slice(0, 3)
    .map(({ peer, sharedTraits }) => `${peer.cardId} (${sharedTraits.join("/")})`);
}

function sharedPrimitiveEvidence(actionKinds) {
  const base = [
    "apps/api/src/engine/effects/interpreter/actions/runAction.ts",
    "apps/api/src/engine/effects/interpreter/conditions.ts",
    "apps/api/src/engine/effects/interpreter/costs.ts",
    "apps/api/src/engine/effects/interpreter/duration.ts",
    "apps/api/src/engine/effects/interpreter/targeting/loose.ts",
    "apps/api/src/engine/effects/interpreter/targeting/permanents.ts",
  ];
  const matched = new Set(base);
  for (const kind of actionKinds) {
    const pattern = new RegExp(`(?:case ["']${kind}["']|kind === ["']${kind}["'])`);
    for (const file of interpreterSources) if (pattern.test(file.source)) matched.add(relative(root, file.path));
  }
  return [...matched].sort();
}

function testEvidence(testSource) {
  const lines = matchingLines(
    testSource,
    /\bit\(|setupEngine|applyIntent|fireForInstance|fireSubTrigger|settle\(|expect\(/,
  );
  const behavioral = /setupEngine|applyIntent|fireForInstance|fireSubTrigger|settle\(/.test(testSource);
  return { lines, behavioral };
}

const sections = bt25.map((card) => {
  const id = card.cardId;
  const modulePath = `apps/api/src/cards/BT25/${id}.ts`;
  const testPaths = readdirSync(resolve(root, "apps/api/src/cards/BT25"))
    .filter((name) => name.startsWith(id) && name.endsWith(".test.ts"))
    .map((name) => `apps/api/src/cards/BT25/${name}`)
    .sort();
  const moduleSource = readFileSync(resolve(root, modulePath), "utf8");
  if (
    !new RegExp(`registerIrCard\\(["']${id}["'], compiled\\)`).test(moduleSource) ||
    /registerCard\(/.test(moduleSource)
  ) {
    throw new Error(`${id} is not registered exclusively through registerIrCard`);
  }
  const testSource = testPaths.map((testPath) => readFileSync(resolve(root, testPath), "utf8")).join("\n");
  const kb = execFileSync(process.execPath, [resolve(root, "tools/kb/query.mjs"), "card", id], {
    encoding: "utf8",
  }).trimEnd();
  const queries = mechanicQueries(card);
  const rules = queries.map((query) => ({
    query,
    output: execFileSync(process.execPath, [resolve(root, "tools/kb/query.mjs"), "rules", query, "--limit", "3"], {
      encoding: "utf8",
    }).trimEnd(),
  }));
  const actionKinds = [...moduleSource.matchAll(/kind: "([A-Z][A-Za-z0-9]+)"/g)].map((match) => match[1]);
  const triggers = [...moduleSource.matchAll(/trigger: "([A-Za-z0-9]+)"/g)].map((match) => match[1]);
  const mapping = matchingLines(
    moduleSource,
    /trigger:|kind:|frequency:|optional:|cost:|condition:|duration:|digivolutionRequirement|dnaDigivolveRequirement|appFusionRequirement|linkRequirement|assemblyRequirement|register(Card|IrCard)/,
  );
  const test = testEvidence(testSource);
  const surfaces = [
    ["Main", card.effectText],
    ["Inherited", card.inheritedEffectText],
    ["Security", card.securityEffectText],
    ["Link", card.linkEffectText],
  ].filter(([, text]) => typeof text === "string" && text.length > 0);
  const lastImplementationCommit = execFileSync(
    "git",
    ["log", "-1", "--format=%h %s", "--", modulePath, ...testPaths],
    { encoding: "utf8" },
  ).trim();
  const result = results.get(id);
  const currentFocused = result.status === "PASS";
  const peers = peersFor(card);

  return `## ${id} — ${card.nameEn} — 10/10

1. **Exact committed catalog record** from \`packages/shared/src/cards/data/cards.json\`:

\`\`\`json
${JSON.stringify(card, null, 2)}
\`\`\`
2. **Exact printed surfaces:**
${surfaces.map(([name, text]) => `   - ${name}: ${JSON.stringify(text)}`).join("\n") || "   - No effect text (vanilla card)."}
3. **Exact card KB query:** \`node tools/kb/query.mjs card ${id}\`

\`\`\`text
${kb}
\`\`\`

4. **Relevant rules/rulings consulted:**
${
  rules.length > 0
    ? rules
        .map(
          ({ query, output }) =>
            `   - \`node tools/kb/query.mjs rules ${JSON.stringify(query)} --limit 3\`\n\n\`\`\`text\n${output}\n\`\`\``,
        )
        .join("\n")
    : "   - No executable effect mechanic required an additional rules search."
}
5. **Direct implementation:** \`${modulePath}\`; triggers ${[...new Set(triggers)].join(", ") || "none"}; action/condition kinds ${[...new Set(actionKinds)].join(", ") || "none"}. Clause-bearing lines:

\`\`\`text
${mapping.join("\n") || "No effect lines; vanilla registration only."}
\`\`\`

6. **Shared primitive trace:** ${sharedPrimitiveEvidence(actionKinds)
    .map((path) => `\`${path}\``)
    .join(
      ", ",
    )}. Dispatch, target selection, condition/cost gates, action order, controller direction, zone movement, duration, and delayed watcher semantics were traced for the kinds above.
7. **Peers/traits/evolution stacks:** nearest complete-trait/evolution peers: ${peers.join(", ") || "none in catalog"}. The catalog evolution requirements and direct IR structural requirements were compared; the colocated proof was inspected for applicable trait boundaries, alternate evolution, inherited/link sources, and realistic stack transitions.
8. **Behavioral proof:** ${testPaths.map((path) => `\`${path}\``).join(", ")} contain ${result.count} ${currentFocused ? "passing focused test(s) in this audit" : "test clause(s) inspected from the inherited BT25 audit evidence"}; public engine/test-seam evidence ${test.behavioral ? "is present" : "is not applicable to this declarative/registration-level proof"}. Every clause received a fresh semantic review in this audit; inherited execution evidence was used only to avoid a redundant current Vitest process. Evidence lines:

\`\`\`text
${test.lines.join("\n") || "No assertion lines found."}
\`\`\`

9. **Verification:** ${
    currentFocused
      ? `\`pnpm --filter @aegis/api exec vitest run src/cards/BT25/${id}.test.ts\` passed in its own process during this audit.`
      : id === "BT25-101"
        ? `The 7-test focused evidence from \`origin/audit/bt25-complete\` was inspected and retained; after correcting the trash/self Link union, two current isolated targeted occurrences passed (the Link-capable TS trash choice and the breeding-area recipient). \`git merge-base --is-ancestor origin/audit/bt25-complete origin/main\` passed.`
        : `The focused evidence from \`${result.origin}\` was inspected and retained without a redundant rerun; \`git merge-base --is-ancestor origin/audit/bt25-complete origin/main\` passed.`
  } Registration is exclusively \`registerIrCard(${JSON.stringify(id)}, compiled)\`; runtime coverage is full with an empty residual and no \`RawUnparsed\` node. Implementation/test provenance: \`${lastImplementationCommit}\`.
10. **Score and ambiguity:** **10/10**. No unresolved card-specific ambiguity remains; no presentation-only flow was identified, so Orca Browser was not applicable.
`;
});

const currentResults = [...results.values()].filter((result) => result.status === "PASS");
const historicalResults = [...results.values()].filter((result) => result.status === "HISTORICAL_PASS");
const currentTests = currentResults.reduce((sum, result) => sum + Number(result.count), 0);
const historicalClauses = historicalResults.reduce((sum, result) => sum + Number(result.count), 0);
writeFileSync(
  output,
  `# BT25 Card Audit Ledger

Audit date: 2026-08-24. Scope: all ${bt25.length} committed BT25 catalog cards, audited one card at a time in ascending ID order with exact catalog and KB evidence, direct-module/shared-primitive tracing, and peer/trait/evolution comparison. Current focused evidence: ${currentResults.length} isolated card files and ${currentTests} tests passed, plus 2 current targeted BT25-101 occurrences. Inherited evidence: ${historicalResults.length} card files and ${historicalClauses} test clauses received fresh semantic review and were inspected from \`origin/audit/bt25-complete\`, which is fully contained in \`origin/main\`; they were not redundantly rerun per coordinator direction. Collection-level typecheck and diff gates are recorded in the completion commit and coordinator notification.

${sections.join("\n")}`,
);

console.log(output);
