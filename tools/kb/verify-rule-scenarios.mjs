#!/usr/bin/env node
/** Execute the reviewed scenarios in one bounded scope; never promote inventory automatically. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { INDEX_PATH, INVENTORY_PATH, sha256, validateInventory } from "./rule-obligations.mjs";
import { ROUTE_SCOPE } from "./effect-play-route-matrix.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function selectScopeObligations(inventory, scope) {
  const scopes = inventory.scenarioScopes ?? {};
  const members = inventory.scenarioGroups?.[scope] ?? (Object.hasOwn(scopes, scope) ? [scope] : []);
  if (!members.length) throw new Error(`Unknown or empty scope: ${scope}`);
  const byId = new Map(inventory.obligations.map((record) => [record.id, record]));
  return members.flatMap((member) => {
    if (!Array.isArray(scopes[member]) || !scopes[member].length)
      throw new Error(`Scope group ${scope}: missing scope ${member}`);
    return scopes[member].map((id) => {
      const record = byId.get(id);
      if (!record || record.scope !== member) throw new Error(`Scope ${member}: missing obligation ${id}`);
      return record;
    });
  });
}

export function assessResults(scenarios, report, root, runtimeOptions) {
  const errors = [];
  if (report.success !== true) errors.push("Vitest run was unsuccessful");
  for (const scenario of scenarios) {
    const matches = (report.testResults ?? [])
      .filter((file) => resolve(file.name) === resolve(root, scenario.testPath))
      .flatMap((file) => file.assertionResults ?? [])
      .filter((result) => result.fullName === scenario.testName);
    if (matches.length !== 1)
      errors.push(`${scenario.id}: expected exactly one executed test, found ${matches.length} results`);
    else if (matches[0].status !== "passed")
      errors.push(
        `${scenario.id}: test not passed (${matches[0].status}) ${(matches[0].failureMessages ?? []).join("\n")}`,
      );
    const options = (runtimeOptions ?? []).filter(
      (entry) => resolve(entry.testPath) === resolve(root, scenario.testPath) && entry.testName === scenario.testName,
    );
    if (options.length !== 1 || options[0].expectedFailure !== false)
      errors.push(`${scenario.id}: missing ordinary-test runtime evidence or expected failure`);
  }
  return errors;
}

/** Expected-failure tests can be reported as passed; reject them in evidence files. */
export function hasExpectedFailure(source) {
  const file = ts.createSourceFile("test.ts", source, ts.ScriptTarget.Latest, true);
  let found = false;
  function visit(node) {
    if (ts.isPropertyAccessExpression(node) && node.name.text === "fails") found = true;
    if (
      ts.isElementAccessExpression(node) &&
      ts.isStringLiteral(node.argumentExpression) &&
      node.argumentExpression.text === "fails"
    )
      found = true;
    ts.forEachChild(node, visit);
  }
  visit(file);
  return found;
}

function run(command, args, options = {}) {
  const { allowFailure = false, env = {}, ...spawnOptions } = options;
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
      NODE_OPTIONS: "--max-old-space-size=2048",
      TEST_HEAP_MB: "2048",
      TEST_MAX_WORKERS: "1",
      TEST_MAX_THREADS: "1",
      FAST: "",
    },
    ...spawnOptions,
  });
  if (result.error || (result.status !== 0 && !allowFailure))
    throw new Error(`Command failed: ${command} ${args.join(" ")} (${result.error?.message ?? result.status})`);
  return result;
}

function main() {
  const scope = process.argv[2];
  if (!scope || process.argv.length !== 3) throw new Error("Usage: node tools/kb/verify-rule-scenarios.mjs <scope>");
  const inventory = JSON.parse(readFileSync(INVENTORY_PATH, "utf8"));
  const index = JSON.parse(readFileSync(INDEX_PATH, "utf8"));
  const invalid = validateInventory(inventory, index);
  if (invalid.length) throw new Error(invalid.join("\n"));
  const obligations = selectScopeObligations(inventory, scope);
  const allScenarios = obligations.flatMap((record) => record.scenarios);
  const scenarios = allScenarios.filter((scenario) => scenario.status === "proven");
  if (!scenarios.length) throw new Error(`No executable reviewed scenarios in ${scope}`);
  const paths = [...new Set(scenarios.map((scenario) => scenario.testPath))];
  const fingerprints = Object.fromEntries(
    paths.map((path) => {
      const source = readFileSync(resolve(ROOT, path), "utf8");
      if (hasExpectedFailure(source)) throw new Error(`Evidence file contains expected-failure declarations: ${path}`);
      return [path, sha256(source)];
    }),
  );
  const directory = mkdtempSync(join(tmpdir(), "aegis-rule-scenarios-"));
  const reportPath = join(directory, "vitest.json");
  const optionsPath = join(directory, "runtime-options.json");
  try {
    const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    run(pnpm, ["--filter", "@aegis/shared", "build"]);
    const commands = [];
    const errors = [];
    const layers = {};
    for (const layer of ["engine", "ui"]) {
      const selected = scenarios.filter((scenario) => scenario.layer === layer);
      if (!selected.length) continue;
      const selectedPaths = [...new Set(selected.map((scenario) => resolve(ROOT, scenario.testPath)))];
      const args = [
        "--filter",
        layer === "engine" ? "@aegis/api" : "@aegis/web",
        "exec",
        "vitest",
        "run",
        ...selectedPaths,
        layer === "engine" ? "--pool=forks" : "--pool=threads",
        "--maxWorkers=1",
        "--no-file-parallelism",
        "--reporter=json",
        `--reporter=${resolve(ROOT, "tools/kb/rule-scenario-reporter.mjs")}`,
        `--outputFile=${reportPath}`,
      ];
      commands.push([pnpm, ...args]);
      const execution = run(pnpm, args, { allowFailure: true, env: { AEGIS_RULE_EVIDENCE_PATH: optionsPath } });
      let report;
      let runtimeOptions;
      try {
        report = JSON.parse(readFileSync(reportPath, "utf8"));
        runtimeOptions = JSON.parse(readFileSync(optionsPath, "utf8"));
      } catch {
        report = { success: false, testResults: [] };
      }
      const failures = assessResults(selected, report, ROOT, runtimeOptions);
      if (execution.status !== 0)
        failures.push(`${layer}: test process exited with ${execution.status ?? execution.signal}`);
      errors.push(...failures);
      layers[layer] = { reviewedScenarios: selected.length, verified: failures.length === 0 };
      rmSync(reportPath, { force: true });
      rmSync(optionsPath, { force: true });
    }
    for (const path of paths) {
      if (sha256(readFileSync(resolve(ROOT, path), "utf8")) !== fingerprints[path])
        errors.push(`Test changed during execution: ${path}`);
    }
    const gaps = allScenarios.filter((scenario) => scenario.status === "gap");
    const revision = run("git", ["rev-parse", "HEAD"], { encoding: "utf8", stdio: "pipe" }).stdout.trim();
    const dirty = run("git", ["status", "--porcelain"], { encoding: "utf8", stdio: "pipe" }).stdout.trim().length > 0;
    console.log(
      JSON.stringify(
        {
          scope,
          scopes: [...new Set(obligations.map((record) => record.scope))],
          ...(obligations.some((record) => record.scope === ROUTE_SCOPE)
            ? { routeMatrix: inventory.effectPlayRouteMatrix }
            : {}),
          revision,
          dirty,
          source: inventory.source,
          inventorySha256: sha256(JSON.stringify(inventory)),
          testFingerprints: fingerprints,
          commands,
          obligations: obligations.length,
          reviewedScenarios: scenarios.length,
          uniqueLinkedTests: new Set(scenarios.map(({ testPath, testName }) => JSON.stringify([testPath, testName])))
            .size,
          layers,
          gaps: gaps.map(({ id, reason }) => ({ id, reason })),
          errors,
        },
        null,
        2,
      ),
    );
    if (errors.length || gaps.length)
      throw new Error(`Scope incomplete: ${errors.length} verification errors, ${gaps.length} gaps`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
