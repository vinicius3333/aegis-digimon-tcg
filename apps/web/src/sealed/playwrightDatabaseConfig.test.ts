import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

function validateCollectionReport(report: unknown) {
  if (
    typeof report !== "object" ||
    report === null ||
    !("errors" in report) ||
    !Array.isArray(report.errors) ||
    !("config" in report) ||
    typeof report.config !== "object" ||
    report.config === null ||
    !("projects" in report.config) ||
    !Array.isArray(report.config.projects) ||
    !("suites" in report) ||
    !Array.isArray(report.suites)
  ) {
    throw new Error("Invalid Playwright collection report");
  }
  const projects: Array<{ testIgnore: string[] }> = [];
  for (const project of report.config.projects) {
    if (
      typeof project !== "object" ||
      project === null ||
      !("testIgnore" in project) ||
      !Array.isArray(project.testIgnore) ||
      !project.testIgnore.every((value: unknown) => typeof value === "string")
    ) {
      throw new Error("Invalid Playwright project");
    }
    const testIgnore: string[] = [];
    for (const value of project.testIgnore) {
      if (typeof value !== "string") throw new Error("Invalid Playwright ignore");
      testIgnore.push(value);
    }
    projects.push({ testIgnore });
  }
  const titles: string[] = [];
  for (const suite of report.suites) {
    if (typeof suite !== "object" || suite === null || !("title" in suite) || typeof suite.title !== "string") {
      throw new Error("Invalid Playwright suite");
    }
    titles.push(suite.title);
  }

  const errors: unknown[] = Array.from(report.errors, (value: unknown) => value);
  return { errors, config: { projects }, suites: titles.map((title) => ({ title })) };
}

it.each([
  ["null", null],
  ["empty object", {}],
  ["null config", { errors: [], config: null, suites: [] }],
  ["missing projects", { errors: [], config: {}, suites: [] }],
  ["wrong project list", { errors: [], config: { projects: {} }, suites: [] }],
  ["null project", { errors: [], config: { projects: [null] }, suites: [] }],
  ["missing testIgnore", { errors: [], config: { projects: [{}] }, suites: [] }],
  ["wrong testIgnore list", { errors: [], config: { projects: [{ testIgnore: "x" }] }, suites: [] }],
  ["wrong testIgnore entry", { errors: [], config: { projects: [{ testIgnore: [42] }] }, suites: [] }],
  ["wrong suites list", { errors: [], config: { projects: [] }, suites: {} }],
  ["null suite", { errors: [], config: { projects: [] }, suites: [null] }],
  ["missing title", { errors: [], config: { projects: [] }, suites: [{}] }],
  ["wrong title", { errors: [], config: { projects: [] }, suites: [{ title: 42 }] }],
  ["missing errors", { config: { projects: [] }, suites: [] }],
  ["wrong errors array", { errors: {}, config: { projects: [] }, suites: [] }],
])("rejects malformed collection report: %s", (_name, value) => {
  expect(() => validateCollectionReport(value)).toThrow(/Invalid Playwright/);
});

it("copies validated collection fields without weakening collection assertions", () => {
  const value = {
    errors: ["reported failure"],
    config: { projects: [{ testIgnore: ["**/example.spec.ts"] }] },
    suites: [{ title: "example.spec.ts" }],
  };
  const report = validateCollectionReport(value);
  expect(report).toEqual(value);
  expect(report).not.toBe(value);
  expect(report.errors).not.toBe(value.errors);
  expect(report.config.projects).not.toBe(value.config.projects);
  expect(report.config.projects[0]?.testIgnore).not.toBe(value.config.projects[0]?.testIgnore);
  expect(report.suites).not.toBe(value.suites);
});

function testIgnoreForDatabase(databaseUrl: string): string[] {
  const configUrl = new URL("../../playwright.config.ts", import.meta.url).href;
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "const { default: config } = await import(process.argv[1]); console.log(JSON.stringify(config.testIgnore));",
      configUrl,
    ],
    {
      env: { ...process.env, SEALED_TEST_DATABASE_URL: databaseUrl },
      encoding: "utf8",
      timeout: 10_000,
    },
  );
  const testIgnore: unknown = JSON.parse(output);
  if (!Array.isArray(testIgnore) || !testIgnore.every((entry) => typeof entry === "string")) {
    throw new Error("Expected Playwright testIgnore to be an array of strings");
  }
  return testIgnore;
}

const databaseSpecs = [
  "private-sealed-no-name.spec.ts",
  "private-sealed.spec.ts",
  "sealed-native-touch.spec.ts",
  "sealed-opening-gate.spec.ts",
];

it("requires PostgreSQL for exactly the four private browser specs", () => {
  expect(databaseSpecs).toHaveLength(4);
  expect(testIgnoreForDatabase("")).toEqual(databaseSpecs.map((file) => `**/${file}`));
  expect(testIgnoreForDatabase("invalid-nonempty")).toEqual([]);
});

it("collects the complete filesystem spec multiset by URL presence without executing database hooks", () => {
  const cwd = fileURLToPath(new URL("../..", import.meta.url));
  const cli = fileURLToPath(new URL("../../node_modules/@playwright/test/cli.js", import.meta.url));
  const inventory = readdirSync(`${cwd}/e2e`, { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".spec.ts"))
    .sort();
  expect(databaseSpecs.every((file) => inventory.includes(file))).toBe(true);
  for (const connectionString of [
    undefined,
    "",
    "postgres://postgres@127.0.0.1:55439/aegis_sealed_test",
    "invalid-nonempty",
  ]) {
    const directory = mkdtempSync(join(tmpdir(), "sealed-collection-"));
    const reportPath = join(directory, "report.json");
    const env: NodeJS.ProcessEnv = { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath };
    if (connectionString === undefined) {
      delete env.SEALED_TEST_DATABASE_URL;
    } else {
      env.SEALED_TEST_DATABASE_URL = connectionString;
    }
    try {
      execFileSync(process.execPath, [cli, "test", "--list", "--reporter=json"], {
        cwd,
        env,
        encoding: "utf8",
        timeout: 60_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      const report = validateCollectionReport(JSON.parse(readFileSync(reportPath, "utf8")));
      expect(report.errors).toEqual([]);
      expect(report.config.projects).toHaveLength(1);
      for (const project of report.config.projects) {
        expect(project.testIgnore).toEqual(connectionString ? [] : databaseSpecs.map((file) => `**/${file}`));
      }
      const collected = report.suites.map(({ title }) => title).sort();
      expect(collected).toEqual(
        connectionString ? inventory : inventory.filter((file) => !databaseSpecs.includes(file)),
      );
      console.log(JSON.stringify({ lane: connectionString ?? "absent", files: collected }));
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }
}, 120_000);
