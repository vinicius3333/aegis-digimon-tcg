import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, "../../../..");
const read = name => JSON.parse(readFileSync(join(directory, name), "utf8"));
const gates = read("round5-gates.json");
const results = read("round5-final-collection-results.json");
if (results.numFailedTests !== 0 || !gates.complete) throw new Error("Final gates are not green");
const catalog = JSON.parse(readFileSync(join(repository, "packages/shared/src/cards/data/cards.json"), "utf8"));
const sensitivity = read("runtime-sensitivity-results.json");
const notes = {
  "BT20-055": "Q4388 uses a legal HoverEspimon → MasterBlimpmon → Invisimon stack. Top-card security placement promotes MasterBlimpmon, whose actual End of Attack plays the selected source; refusal preserves the stack.",
  "BT20-058": "The shared own-stack play action now requests a bounded card choice. Public named DigiXros, opponent Gaia Force, nonfirst source selection, refusal, other-host exclusions and exact final zones reproduce the correction.",
  "BT20-066": "A real Underworld's Call Security effect plays Stingmon during the opponent turn. Its deletion resolves while legal DNA materials and a qualifying hand evolution remain untouched by the own-turn-only DNA clause.",
  "BT20-069": "Printed Trash 1, then keyword grants is sequential processing, not a By trashing activation cost. The empty-hand continuation is intentional and agrees with the official Bandai text.",
  "BT20-077": "The entry trash play is mandatory. Public Blast evolution pays no evolution cost, trims the hand, performs the eligible free play, and reaches Blocker. Granted Rush is proved by an attack in the play turn; the attacker still suspends normally.",
  "BT20-078": "Public Agility Training placements and later Delay activations prove effect-driven evolution, same-turn suppression and later-turn reset. Diatrymon's When Digivolving suspension precedes Reapermon's watcher under Q4401. An ordinary evolution is a negative. Collision rejects refusal when a block is possible.",
  "BT20-083": "Optionality belongs to the triggered play action, before its suspension cost. The corrected IR offers refusal without suspending King Drasil; accepted processing plays one own-stack Omekamon. Suspended-host and battle-area source negatives are covered.",
  "BT20-089": "A public Pulsemon → Bulkmon evolution triggers the actual Mind Link. Alliance's dedicated response suspends the ally, supplies the winning DP and two Piercing checks. Barrier acceptance/refusal uses its dedicated public response.",
  "BT20-095": "The 2025-04-18 KB erratum removes Chronicle from the breeding Digimon being moved. The deleted trigger Digimon still requires Chronicle. The raw catalog text is historical at that phrase; the IR and public negatives follow the erratum.",
  "BT20-096": "Shared registration excludes a Trash/Main clause from the ordinary Option-use body. The self-return explicitly sources trash. Public activation pays six from 10→4 and 5→−1, returns the exact Option to deck bottom and deletes an unsuspended opponent. Five-hand, wrong-zone/turn and ordinary-use isolation checks are retained.",
  "BT20-098": "The 2025-03-07 KB erratum and Q4439 require exactly nine returned levels, overriding the raw catalog's up to nine. Public 3+6 and 3+3+3, valid-payment refusal and impossible-total cases follow Q4440/Q4441.",
  "BT20-101": "Public attacks prove both controllers' suspension events, optional refusal, same-turn use and real next-turn reset. Separate public Blast/Blocker, Piercing and natural End of Turn Vortex cases prove the printed keywords.",
};
for (const card of catalog.filter(c => c.set === "BT20" && Number(c.cardId.slice(-3)) >= 44)) {
  const id = card.cardId;
  const sourcePath = `apps/api/src/cards/BT20/${id}.ts`;
  const testPath = `apps/api/src/cards/BT20/${id}.test.ts`;
  const testResult = results.testResults.find(file => file.name.endsWith(`/${id}.test.ts`));
  if (!testResult?.assertionResults.length || testResult.assertionResults.some(test => test.status !== "passed")) throw new Error(`Missing green focused proof: ${id}`);
  const mutation = sensitivity.find(entry => entry.cardId === id);
  if (!mutation?.assertions?.length || mutation.exitCode === 0) throw new Error(`Missing sensitivity: ${id}`);
  const module = readFileSync(join(repository, sourcePath), "utf8");
  if (!module.includes(`registerIrCard("${id}", compiled);`) || /\bregisterCard\(/.test(module)) throw new Error(`Registration violation: ${id}`);
  const old = read(`${id}.json`);
  const cases = testResult.assertionResults.map(test => test.fullName);
  const commands = [
    { command: gates.collection.command, result: `${cases.length}/${cases.length} colocated cases pass; ${results.numPassedTests}/${results.numPassedTests} full collection/mechanism cases.` },
    { command: gates.mechanisms.command, result: `${gates.mechanisms.passed}/${gates.mechanisms.passed} affected mechanism cases pass.` },
    { command: `node internal-docs/audits/BT20/revalidation/check-runtime-sensitivity.mjs ${id}`, result: `${mutation.assertions.length} meaningful assertion failures with runtime effects disabled; original production module restored. Per-card JSON/log and aggregate retained.` },
    { command: "pnpm typecheck", result: "PASS; round5-final-typecheck.log. Final API test-source check also passes in round5-final-api-typecheck.log." },
    { command: "pnpm effects:check:set -- --set BT20", result: "PASS; all 102 records synchronized, round5-scoped-check.log." },
    { command: "Changed-file oxlint/oxfmt --check and git diff --check", result: "PASS; round5-gates.json, round5-style-paths.json and final style logs." },
  ];
  const evidence = [sourcePath, testPath, `node tools/kb/query.mjs card ${id}`, "round5-final-collection-results.json", "round5-mechanism-results.json", `${id}-runtime-disabled.json`, "round5-gates.json", ...(notes[id] ? [notes[id]] : [])];
  const report = { cardId: id, status: "lead-verified", scores: {catalogRules:2,irTrace:2,behavioralProof:2,peerStackProof:2,deliveryGates:0}, evidence, commands, gaps: [], executedCases: cases, historicalCommands: [...(old.historicalCommands ?? []), ...(old.commands ?? [])], reviewStatus: "Current printed clauses, KB/errata, exclusive IR registration, legal public paths and negative controls independently reviewed. Delivery credit requires the pushed, hash-bound acceptance record." };
  writeFileSync(join(directory, `${id}.json`), JSON.stringify(report, null, 2) + "\n");
  const contract = [card.effectText, card.inheritedEffectText, card.securityEffectText].filter(Boolean).join("\n\n");
  const document = `# ${id} ${card.nameEn} — verified behavioral evidence\n\nLead clause review and current gates pass. Pushed delivery and score are recorded by artifact hash in acceptance.json; collection completion remains separate.\n\n## Contract and implementation\n\nSources: committed catalog, \`node tools/kb/query.mjs card ${id}\`, and \`${sourcePath}\`. Production behavior registers exclusively with \`registerIrCard\`. The catalog/KB conflict reviews in this directory identify authoritative errata.\n\n${contract}\n\n${notes[id] ?? "The public cases below cover the printed clauses and applicable costs, choices, boundaries, zones, duration and legal evolution or inherited stacks. Structural assertions corroborate the executed behavior."}\n\n## Executed cases\n\n${cases.map(name => `- ${name}`).join("\n")}\n\n## Verification\n\n${commands.map(({command,result}) => `- \`${command}\` — ${result}`).join("\n")}\n\nNo unresolved card-specific clause gaps. The five-dimension delivery credit is granted only by the pushed acceptance record.\n`;
  writeFileSync(join(directory, `${id}.md`), document.split("\n").map(line => line.trimEnd()).join("\n"));
}
console.log("Finalized 59 independently reviewed BT20 reports; acceptance remains a separate pushed gate.");
