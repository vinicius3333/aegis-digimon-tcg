import assert from "node:assert/strict";
import { test } from "node:test";
import { assessResults, hasExpectedFailure, selectScopeObligations } from "./verify-rule-scenarios.mjs";

const scenarios = [{ id: "priority", testPath: "apps/api/example.test.ts", testName: "ordering turn player first" }];
const runtimeOptions = [
  { testPath: "/repo/apps/api/example.test.ts", testName: scenarios[0].testName, expectedFailure: false },
];

test("a matrix executes every declared member and refuses an incomplete membership", () => {
  const inventory = {
    scenarioScopes: { simultaneous: ["rule-a"], derived: ["rule-b"] },
    scenarioGroups: { matrix: ["simultaneous", "derived"] },
    obligations: [
      { id: "rule-a", scope: "simultaneous" },
      { id: "rule-b", scope: "derived" },
    ],
  };
  assert.deepEqual(selectScopeObligations(inventory, "matrix"), inventory.obligations);
  assert.deepEqual(selectScopeObligations(inventory, "simultaneous"), [inventory.obligations[0]]);
  inventory.obligations.pop();
  assert.throws(() => selectScopeObligations(inventory, "matrix"), /missing obligation/);
  assert.throws(() => selectScopeObligations(inventory, "unknown"), /Unknown/);
});
function report(status = "passed") {
  return {
    success: true,
    testResults: [
      {
        name: "/repo/apps/api/example.test.ts",
        assertionResults: [{ fullName: "ordering turn player first", status }],
      },
    ],
  };
}

test("requires the exact executed file and full test name", () => {
  assert.deepEqual(assessResults(scenarios, report(), "/repo", runtimeOptions), []);
  const wrong = report();
  wrong.testResults[0].assertionResults[0].fullName = "another test";
  assert.match(assessResults(scenarios, wrong, "/repo").join("\n"), /priority.*0 results/);
});

test("passing expected failures and absent runtime metadata are never accepted as proof", () => {
  assert.match(assessResults(scenarios, report(), "/repo").join("\n"), /runtime evidence/);
  assert.match(
    assessResults(scenarios, report(), "/repo", [{ ...runtimeOptions[0], expectedFailure: true }]).join("\n"),
    /expected failure/,
  );
});

test("rejects skipped, failing, duplicated and globally unsuccessful runs", () => {
  for (const status of ["pending", "failed", "todo", "skipped"]) {
    assert.match(assessResults(scenarios, report(status), "/repo").join("\n"), /not passed/);
  }
  const duplicate = report();
  duplicate.testResults.push(duplicate.testResults[0]);
  assert.match(assessResults(scenarios, duplicate, "/repo").join("\n"), /2 results/);
  assert.match(assessResults(scenarios, { ...report(), success: false }, "/repo").join("\n"), /unsuccessful/);
});

test("rejects expected-failure declarations without mistaking comments for evidence", () => {
  assert.equal(hasExpectedFailure('it.fails("known bug", () => {})'), true);
  assert.equal(hasExpectedFailure('it["fails"]("known bug", () => {})'), true);
  assert.equal(hasExpectedFailure('// it.fails was removed\nit("works", () => {})'), false);
});
