import assert from "node:assert/strict";
import test from "node:test";

import {
  catalogIdsForSet,
  parseArguments,
  replaceTopLevelEntries,
  semanticScopeDiff,
  topLevelEntryRanges,
} from "./sync-effects-from-card-modules.mjs";

test("parses a scoped set in write and check modes", () => {
  assert.deepEqual(parseArguments(["--set", "bt16"]), { check: false, set: "BT16" });
  assert.deepEqual(parseArguments(["--", "--set", "bt16"]), { check: false, set: "BT16" });
  assert.deepEqual(parseArguments(["--check", "--set=BT16"]), { check: true, set: "BT16" });
  assert.deepEqual(parseArguments(["--check", "--set=BT16", "--base", "origin/main"]), {
    base: "origin/main",
    check: true,
    set: "BT16",
  });
  assert.throws(() => parseArguments(["--set", "../BT16"]), /safe set code/);
  assert.throws(() => parseArguments(["--set", "BT16", "--base"]), /safe Git base ref/);
  assert.throws(() => parseArguments(["--set", "BT16", "--base", "--work-tree=/tmp"]), /safe Git base ref/);
});

test("discovers cardId values from the committed catalog", () => {
  const ids = catalogIdsForSet("BT16");

  assert.equal(ids.length, 102);
  assert.equal(ids[0], "BT16-001");
  assert.equal(ids.at(-1), "BT16-102");
});

test("replaces only requested top-level records", () => {
  const document = `{
  "BT16-001": {
  "effects": [{ "raw": "a } brace" }]
  },
  "BT17-001": {
    "effects": [],
    "coverage": "full"
  }
}
`;
  const before = topLevelEntryRanges(document);
  const replacement = '{ "effects": [], "coverage": "full", "residual": [] }';

  const updated = replaceTopLevelEntries(document, new Map([["BT16-001", replacement]]));
  const after = topLevelEntryRanges(updated);

  assert.equal(after.get("BT16-001")?.value, replacement);
  assert.equal(after.get("BT17-001")?.value, before.get("BT17-001")?.value);
  assert.deepEqual(JSON.parse(updated)["BT16-001"], { effects: [], coverage: "full", residual: [] });
});

test("rejects a requested record that is absent", () => {
  const document = `{
  "BT17-001": { "effects": [] }
}
`;

  assert.throws(() => replaceTopLevelEntries(document, new Map([["BT16-001", "{}"]])), /BT16-001 is missing/);
});

test("reports semantic changes inside and outside a requested set", () => {
  const base = JSON.stringify({ "BT16-001": { effects: [] }, "BT17-001": { effects: [] } });
  const onlyBt16 = JSON.stringify({ "BT16-001": { effects: [{ trigger: "Main" }] }, "BT17-001": { effects: [] } });
  const outside = JSON.stringify({
    "BT16-001": { effects: [{ trigger: "Main" }] },
    "BT17-001": { effects: [{ trigger: "Security" }] },
  });

  assert.deepEqual(semanticScopeDiff(base, onlyBt16, "BT16"), { inSet: ["BT16-001"], outsideSet: [] });
  assert.deepEqual(semanticScopeDiff(base, outside, "BT16"), {
    inSet: ["BT16-001"],
    outsideSet: ["BT17-001"],
  });
});
