import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  catalogIdsFromCards,
  catalogIdsForSet,
  outsideSetBytesMatch,
  parseArguments,
  replaceTopLevelEntries,
  semanticScopeDiff,
  setRecordKeyDiff,
  topLevelEntryRanges,
  writeAtomically,
} from "./sync-effects-from-card-modules.mjs";

test("parses a scoped set in write and check modes", () => {
  assert.deepEqual(parseArguments(["--set", "bt10"]), { check: false, set: "BT10" });
  assert.deepEqual(parseArguments(["--", "--set", "bt10"]), { check: false, set: "BT10" });
  assert.deepEqual(parseArguments(["--check", "--set=BT10"]), { check: true, set: "BT10" });
  assert.deepEqual(parseArguments(["--check", "--set=BT10", "--base", "origin/main"]), {
    base: "origin/main",
    check: true,
    set: "BT10",
  });
  assert.throws(() => parseArguments(["--set", "../BT10"]), /safe set code/);
  assert.throws(() => parseArguments(["--set", "BT10", "--base"]), /safe Git base ref/);
  assert.throws(() => parseArguments(["--set", "BT10", "--base", "--work-tree=/tmp"]), /safe Git base ref/);
  assert.throws(() => parseArguments(["--set", "BT10", "--base=-work-tree=/tmp"]), /safe Git base ref/);
  assert.throws(() => parseArguments(["--set", "BT10", "--base", "../main"]), /safe Git base ref/);
});

test("discovers cardId values from the committed catalog", () => {
  const ids = catalogIdsForSet("BT10");

  assert.equal(ids.length, 112);
  assert.equal(ids[0], "BT10-001");
  assert.equal(ids.at(-1), "BT10-112");
});

test("rejects duplicate card IDs instead of silently normalizing the catalog", () => {
  assert.throws(
    () => catalogIdsFromCards([{ cardId: "BT10-001" }, { cardId: "BT10-001" }], "BT10"),
    /Duplicate BT10 card IDs.*BT10-001/,
  );
});

test("replaces only requested top-level records", () => {
  const document = `{
  "BT10-001": {
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

  const updated = replaceTopLevelEntries(document, new Map([["BT10-001", replacement]]));
  const after = topLevelEntryRanges(updated);

  assert.equal(after.get("BT10-001")?.value, replacement);
  assert.equal(after.get("BT13-001")?.value, before.get("BT13-001")?.value);
  assert.deepEqual(JSON.parse(updated)["BT10-001"], { effects: [], coverage: "full", residual: [] });
});

test("repeating a scoped replacement is byte-idempotent", () => {
  const document = `{
  "BT10-001": { "effects": [] },
  "BT13-001": { "effects": [{ "trigger": "Security" }] }
}
`;
  const replacements = new Map([["BT10-001", '{ "effects": [{ "trigger": "Main" }] }']]);

  const once = replaceTopLevelEntries(document, replacements);
  const twice = replaceTopLevelEntries(once, replacements);

  assert.equal(twice, once);
});

test("rejects a requested record that is absent", () => {
  const document = `{
  "BT13-001": { "effects": [] }
}
`;

  assert.throws(() => replaceTopLevelEntries(document, new Map([["BT10-001", "{}"]])), /BT10-001 is missing/);
});

test("rejects duplicate top-level effect keys", () => {
  assert.throws(
    () => topLevelEntryRanges('{"BT10-001":{"effects":[]},"BT10-001":{"effects":[]}}'),
    /Duplicate top-level effects\.json key BT10-001/,
  );
});

test("requires the requested set keys to match the card catalog exactly", () => {
  const document = JSON.stringify({
    "BT10-001": { effects: [] },
    "BT10-999": { effects: [] },
    "BT13-001": { effects: [] },
  });

  assert.deepEqual(setRecordKeyDiff(document, "BT10", ["BT10-001", "BT10-002"]), {
    missing: ["BT10-002"],
    extra: ["BT10-999"],
  });
});

test("reports semantic changes inside and outside a requested set", () => {
  const base = JSON.stringify({ "BT10-001": { effects: [] }, "BT13-001": { effects: [] } });
  const onlyBt12 = JSON.stringify({ "BT10-001": { effects: [{ trigger: "Main" }] }, "BT13-001": { effects: [] } });
  const outside = JSON.stringify({
    "BT10-001": { effects: [{ trigger: "Main" }] },
    "BT13-001": { effects: [{ trigger: "Security" }] },
  });

  assert.deepEqual(semanticScopeDiff(base, onlyBt12, "BT10"), { inSet: ["BT10-001"], outsideSet: [] });
  assert.deepEqual(semanticScopeDiff(base, outside, "BT10"), {
    inSet: ["BT10-001"],
    outsideSet: ["BT13-001"],
  });

  const reorderedBase = JSON.stringify({ "BT10-001": { effects: [], coverage: "full" } });
  const reorderedCurrent = JSON.stringify({ "BT10-001": { coverage: "full", effects: [] } });
  assert.deepEqual(semanticScopeDiff(reorderedBase, reorderedCurrent, "BT10"), { inSet: [], outsideSet: [] });
});

test("requires byte-for-byte stability outside the requested set", () => {
  const base = `{
  "BT10-001": { "effects": [] },
  "BT13-001": { "effects": [] }
}
`;
  const onlyBt10 = `{
  "BT10-001": {
    "effects": [{ "trigger": "Main" }]
  },
  "BT13-001": { "effects": [] }
}
`;
  const outsideWhitespace = `{
  "BT10-001": {
    "effects": [{ "trigger": "Main" }]
  },
  "BT13-001": {  "effects": [] }
}
`;

  assert.equal(outsideSetBytesMatch(base, onlyBt10, "BT10"), true);
  assert.equal(outsideSetBytesMatch(base, outsideWhitespace, "BT10"), false);
});

test("replaces the destination atomically", () => {
  const directory = mkdtempSync(join(tmpdir(), "aegis-effects-sync-"));
  const destination = join(directory, "effects.json");
  try {
    writeAtomically(destination, '{"BT10-001":{}}\n');
    assert.equal(readFileSync(destination, "utf8"), '{"BT10-001":{}}\n');
    writeAtomically(destination, '{"BT10-001":{"effects":[]}}\n');
    assert.equal(readFileSync(destination, "utf8"), '{"BT10-001":{"effects":[]}}\n');
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
});
