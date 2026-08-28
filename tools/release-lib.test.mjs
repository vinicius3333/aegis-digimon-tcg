import assert from "node:assert/strict";
import test from "node:test";
import {
  bumpVersion,
  cardChangesForPaths,
  parseConventionalCommit,
  renderWebReleaseData,
  requiredBump,
} from "./release-lib.mjs";

test("parses conventional commits and identifies breaking changes", () => {
  assert.deepEqual(
    parseConventionalCommit("feat(ui): add changelog", "BREAKING CHANGE: removes the old release endpoint"),
    {
      type: "feat",
      subject: "add changelog",
      breaking: true,
    },
  );
  assert.equal(parseConventionalCommit("Add changelog"), undefined);
});

test("uses the largest semantic-version impact", () => {
  assert.equal(
    requiredBump([
      { type: "fix", breaking: false },
      { type: "feat", breaking: false },
    ]),
    "minor",
  );
  assert.equal(requiredBump([{ type: "feat", breaking: true }]), "major");
  assert.equal(bumpVersion("1.9.4", "major"), "2.0.0");
  assert.equal(bumpVersion("1.9.4", "minor"), "1.10.0");
  assert.equal(bumpVersion("1.9.4", "patch"), "1.9.5");
});

test("renders optional release-note translations for the web client", () => {
  const output = renderWebReleaseData("1.0.0", [
    {
      version: "1.0.0",
      date: "2026-08-09",
      changes: [
        {
          type: "added",
          description: "Initial production release.",
          translations: { "pt-BR": "Lançamento inicial de produção." },
        },
      ],
    },
  ]);

  assert.ok(output.includes('translations: {"pt-BR":"Lançamento inicial de produção."}'));
});

test("builds release notes only from unique changed card IDs", () => {
  assert.deepEqual(
    cardChangesForPaths([
      "apps/api/src/cards/BT10/BT10-099.test.ts",
      "apps/api/src/cards/BT10/BT10-099.ts",
      "apps/api/src/cards/BT2/BT2-017.ts",
      "apps/api/src/engine/effects/interpreter.ts",
      "README.md",
    ]),
    [
      { type: "fixed", description: "BT2-017" },
      { type: "fixed", description: "BT10-099" },
    ],
  );
});
