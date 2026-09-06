import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const repository = resolve(directory, "../../../..");
const cards = process.argv.slice(2);
if (!cards.length || cards.some((card) => !/^BT20-\d{3}$/.test(card))) {
  throw new Error("Pass explicit BT20 card IDs. Run only while the lead owns these production files.");
}
const summaryPath = resolve(directory, "runtime-sensitivity-results.json");
const outcomes = existsSync(summaryPath) ? JSON.parse(readFileSync(summaryPath, "utf8")) : [];
for (const card of cards) {
  const modulePath = resolve(repository, `apps/api/src/cards/BT20/${card}.ts`);
  const original = readFileSync(modulePath, "utf8");
  const registration = `registerIrCard("${card}", compiled);`;
  if (!original.includes(registration)) throw new Error(`Unexpected registration: ${card}`);
  const reportPath = resolve(directory, `${card}-runtime-disabled.json`);
  const args = [
    "--filter",
    "@aegis/api",
    "exec",
    "vitest",
    "run",
    `src/cards/BT20/${card}.test.ts`,
    "--maxWorkers=1",
    "--no-file-parallelism",
    "--testTimeout=15000",
    "--reporter=json",
    `--outputFile=${reportPath}`,
  ];
  let run;
  try {
    // Keep the exported IR unchanged: structural assertions can still pass, while the
    // real registered behavior is absent. Only public behavioral failures count below.
    writeFileSync(
      modulePath,
      original.replace(registration, `registerIrCard("${card}", { ...compiled, effects: [] });`),
    );
    run = spawnSync("pnpm", args, { cwd: repository, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  } finally {
    writeFileSync(modulePath, original);
  }
  writeFileSync(
    resolve(directory, `${card}-runtime-disabled.log`),
    `${run.stdout ?? ""}${run.stderr ?? ""}`.trimEnd() + "\n",
  );
  if (run.error) throw run.error;
  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  const failures = report.testResults
    .flatMap((file) => file.assertionResults)
    .filter((test) => test.status === "failed")
    .map((test) => ({ name: test.fullName, failures: test.failureMessages }));
  const assertions = failures.filter((test) => test.failures.some((message) => /AssertionError/.test(message)));
  const priorIndex = outcomes.findIndex((outcome) => outcome.cardId === card);
  if (priorIndex !== -1) outcomes.splice(priorIndex, 1);
  outcomes.push({
    cardId: card,
    command: ["pnpm", ...args].join(" "),
    exitCode: run.status,
    passed: report.numPassedTests,
    failed: report.numFailedTests,
    assertions,
  });
  writeFileSync(summaryPath, JSON.stringify(outcomes, null, 2) + "\n");
  console.log(
    `${card}: ${assertions.length} state/assertion failures; ${report.numFailedTests} failures total; restored`,
  );
  if (run.status === 0 || assertions.length === 0)
    throw new Error(`${card}: no meaningful sensitivity evidence; inspect failures.`);
}
