import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildUnits, chunkUnits, migrateMixedHistoryChunks } from "./index-rules.mjs";
import { reconcileRuleChunks } from "./lib/reconcile-rule-chunks.mjs";

test("malformed and archived CLI sources fail before extraction or network access", () => {
  const entry = fileURLToPath(new URL("./index-rules.mjs", import.meta.url));
  for (const argument of ["--source=", "--source=unknown", "--source=glossary"]) {
    const result = spawnSync(process.execPath, [entry, argument], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown or archived refresh source/);
    assert.equal(result.stdout, "");
  }
});

test("version history is separated from normative rules and cannot create false numbered sections", () => {
  const text =
    "18-3. Infinite Loops\n18-3-1. A loop ends in a draw.\nUpdate History\n(2026/08/07) Ver.4.2\n14-1-9. Updated old text.\nAdded Detach.";
  const chunks = chunkUnits(buildUnits(text), { id: "comprehensive", title: "Comprehensive Rules" });
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].section, "18-3");
  assert.equal(chunks[0].title, "Infinite Loops");
  assert.ok(!chunks[0].text.includes("Ver.4.2"));
  assert.equal(chunks[1].section, null);
  assert.equal(chunks[1].title, "Update History");
  assert.ok(chunks[1].text.includes("14-1-9."));
});

test("reviewed mixed-history migration preserves the loop citation and retires pure old history", () => {
  const previousChunks = [
    {
      id: "comprehensive-0270",
      source: "comprehensive",
      section: "18-3-3-3",
      title: "Infinite Loops",
      text: "18-3. Infinite Loops 18-3-1. A loop ends in a draw. Update History old versions",
    },
    {
      id: "comprehensive-0271",
      source: "comprehensive",
      section: "18-3-3-3",
      title: "Infinite Loops",
      text: "old versions continued",
    },
  ];
  const chunks = chunkUnits(
    buildUnits("18-3. Infinite Loops\n18-3-1. A loop ends in a draw.\nUpdate History\nnew versions"),
    { id: "comprehensive", title: "Comprehensive Rules" },
  );
  const result = reconcileRuleChunks({ previousChunks: migrateMixedHistoryChunks(previousChunks), chunks });
  assert.equal(result.chunks[0].id, "comprehensive-0270");
  assert.equal(result.chunks[1].id, "comprehensive-0272");
  assert.deepEqual(result.retiredIds, ["comprehensive-0271"]);
  assert.ok(previousChunks[0].text.includes("Update History"));
});
