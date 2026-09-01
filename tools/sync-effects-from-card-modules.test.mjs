import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  catalogIdsForSet,
  parseArguments,
  replaceTopLevelEntries,
  semanticScopeDiff,
  topLevelEntryRanges,
  writeAtomically,
} from "./sync-effects-from-card-modules.mjs";

test("parses a scoped set in write and check modes", () => {
  assert.deepEqual(parseArguments(["--set", "bt12"]), { check: false, set: "BT12" });
  assert.deepEqual(parseArguments(["--", "--set", "bt12"]), { check: false, set: "BT12" });
  assert.deepEqual(parseArguments(["--check", "--set=BT12"]), { check: true, set: "BT12" });
  assert.deepEqual(parseArguments(["--check", "--set=BT12", "--base", "origin/main"]), {
    base: "origin/main",
    check: true,
    set: "BT12",
  });
  assert.throws(() => parseArguments(["--set", "../BT12"]), /safe set code/);
  assert.throws(() => parseArguments(["--set", "BT12", "--base"]), /safe Git base ref/);
  assert.throws(() => parseArguments(["--set", "BT12", "--base", "--work-tree=/tmp"]), /safe Git base ref/);
  assert.throws(() => parseArguments(["--set", "BT12", "--base=-work-tree=/tmp"]), /safe Git base ref/);
  assert.throws(() => parseArguments(["--set", "BT12", "--base", "../main"]), /safe Git base ref/);
});

test("discovers cardId values from the committed catalog", () => {
  const ids = catalogIdsForSet("BT12");

  assert.equal(ids.length, 112);
  assert.equal(ids[0], "BT12-001");
  assert.equal(ids.at(-1), "BT12-112");
});

test("replaces only requested top-level records", () => {
  const document = `{
  "BT12-001": {
  "effects": [{ "raw": "a } brace" }]
  },
  "BT13-001": {
    "effects": [],
    "coverage": "full"
  }
}
`;
  const before = topLevelEntryRanges(document);
  const replacement = '{ "effects": [], "coverage": "full", "residual": [] }';

  const updated = replaceTopLevelEntries(document, new Map([["BT12-001", replacement]]));
  const after = topLevelEntryRanges(updated);

  assert.equal(after.get("BT12-001")?.value, replacement);
  assert.equal(after.get("BT13-001")?.value, before.get("BT13-001")?.value);
  assert.deepEqual(JSON.parse(updated)["BT12-001"], { effects: [], coverage: "full", residual: [] });
});

test("repeating a scoped replacement is byte-idempotent", () => {
  const document = `{
  "BT12-001": { "effects": [] },
  "BT13-001": { "effects": [{ "trigger": "Security" }] }
}
`;
  const replacements = new Map([["BT12-001", '{ "effects": [{ "trigger": "Main" }] }']]);

  const once = replaceTopLevelEntries(document, replacements);
  const twice = replaceTopLevelEntries(once, replacements);

  assert.equal(twice, once);
});

test("rejects a requested record that is absent", () => {
  const document = `{
  "BT13-001": { "effects": [] }
}
`;

  assert.throws(() => replaceTopLevelEntries(document, new Map([["BT12-001", "{}"]])), /BT12-001 is missing/);
});

test("reports semantic changes inside and outside a requested set", () => {
  const base = JSON.stringify({ "BT12-001": { effects: [] }, "BT13-001": { effects: [] } });
  const onlyBt12 = JSON.stringify({ "BT12-001": { effects: [{ trigger: "Main" }] }, "BT13-001": { effects: [] } });
  const outside = JSON.stringify({
    "BT12-001": { effects: [{ trigger: "Main" }] },
    "BT13-001": { effects: [{ trigger: "Security" }] },
  });

  assert.deepEqual(semanticScopeDiff(base, onlyBt12, "BT12"), { inSet: ["BT12-001"], outsideSet: [] });
  assert.deepEqual(semanticScopeDiff(base, outside, "BT12"), {
    inSet: ["BT12-001"],
    outsideSet: ["BT13-001"],
  });

  const reorderedBase = JSON.stringify({ "BT12-001": { effects: [], coverage: "full" } });
  const reorderedCurrent = JSON.stringify({ "BT12-001": { coverage: "full", effects: [] } });
  assert.deepEqual(semanticScopeDiff(reorderedBase, reorderedCurrent, "BT12"), { inSet: [], outsideSet: [] });
});

test("replaces the destination atomically", () => {
  const directory = mkdtempSync(join(tmpdir(), "aegis-effects-sync-"));
  const destination = join(directory, "effects.json");
  try {
    writeAtomically(destination, '{"BT12-001":{}}\n');
    assert.equal(readFileSync(destination, "utf8"), '{"BT12-001":{}}\n');
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
