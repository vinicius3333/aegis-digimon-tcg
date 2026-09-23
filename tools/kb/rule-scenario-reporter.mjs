import { writeFileSync } from "node:fs";

/** Runtime options catch expected failures even when test.fails is aliased. */
export default class RuleScenarioReporter {
  tests = [];

  onTestCaseResult(testCase) {
    const titles = [testCase.name];
    for (let parent = testCase.parent; parent?.type === "suite"; parent = parent.parent) titles.unshift(parent.name);
    this.tests.push({
      testPath: testCase.module.moduleId,
      testName: titles.join(" "),
      expectedFailure: testCase.options.fails === true,
    });
  }

  onTestRunEnd() {
    if (!process.env.AEGIS_RULE_EVIDENCE_PATH) throw new Error("Missing rule evidence output path");
    writeFileSync(process.env.AEGIS_RULE_EVIDENCE_PATH, JSON.stringify(this.tests));
  }
}
