import assert from "node:assert/strict";
import test from "node:test";
import { reconcileRuleChunks } from "./lib/reconcile-rule-chunks.mjs";

function chunk(id, section, text, source = "comprehensive") {
  return { id, source, section, title: "Rules", text };
}

test("reviewed PDF heading and TOC page artifacts do not retire their citations", () => {
  const previousChunks = [
    { ...chunk("comprehensive-0003", "3", "old TOC"), title: "Game Areas.....5" },
    { ...chunk("comprehensive-0162", "15-4-1", "old activation"), title: "Activation24" },
  ];
  const chunks = [
    { ...chunk("temporary", "3", "new TOC"), title: "Game Areas.....6" },
    { ...chunk("temporary", "15-4-1", "new activation"), title: "Activation" },
    { ...chunk("temporary", "3", "actual rules"), title: "Game Areas" },
  ];
  const result = reconcileRuleChunks({ previousChunks, chunks });
  assert.deepEqual(
    result.chunks.map(({ id }) => id),
    ["comprehensive-0003", "comprehensive-0162", "comprehensive-0163"],
  );
  assert.deepEqual(result.retiredIds, []);
});

test("duplicate extracted content fails with or without prior chunks, including shared object references", () => {
  const existing = chunk("comprehensive-0000", "1", "same");
  for (const previousChunks of [[], [existing]]) {
    for (const chunks of [
      [existing, existing],
      [existing, { ...existing }],
    ]) {
      assert.throws(() => reconcileRuleChunks({ previousChunks, chunks }), /Duplicate fresh rule chunk/);
    }
  }
});

test("insertions and reordering never retarget existing citations", () => {
  const previousChunks = [chunk("comprehensive-0000", "1", "first"), chunk("comprehensive-0001", "2", "second")];
  const result = reconcileRuleChunks({
    previousChunks,
    chunks: [chunk("temporary-0", "new", "inserted"), previousChunks[1], previousChunks[0]],
  });
  assert.deepEqual(
    result.chunks.map(({ id }) => id),
    ["comprehensive-0002", "comprehensive-0001", "comprehensive-0000"],
  );
  assert.deepEqual(result.retiredIds, []);
});

test("changed prose retains a unique rule identity for fingerprint drift detection", () => {
  const result = reconcileRuleChunks({
    previousChunks: [chunk("comprehensive-0169", "15-7-1", "old")],
    chunks: [chunk("temporary", "15-7-1", "new")],
  });
  assert.equal(result.chunks[0].id, "comprehensive-0169");
  assert.equal(result.chunks[0].text, "new");
});

test("unchanged split chunks match by text even when their order changes", () => {
  const previousChunks = [chunk("comprehensive-0000", "1", "a"), chunk("comprehensive-0001", "1", "b")];
  assert.deepEqual(
    reconcileRuleChunks({ previousChunks, chunks: [...previousChunks].reverse() }).chunks.map(({ id }) => id),
    ["comprehensive-0001", "comprehensive-0000"],
  );
});

test("ambiguous changed split chunks fail instead of guessing their citation identities", () => {
  assert.throws(
    () =>
      reconcileRuleChunks({
        previousChunks: [chunk("comprehensive-0000", "1", "a"), chunk("comprehensive-0001", "1", "b")],
        chunks: [chunk("temporary", "1", "merged")],
      }),
    /Ambiguous changed rule chunks/,
  );
});

test("removed IDs remain retired across refreshes and cannot be reused", () => {
  const first = reconcileRuleChunks({ previousChunks: [chunk("comprehensive-0007", "1", "removed")], chunks: [] });
  const second = reconcileRuleChunks({
    ...first,
    previousChunks: first.chunks,
    chunks: [chunk("temporary", "2", "new")],
  });
  assert.equal(second.chunks[0].id, "comprehensive-0008");
  assert.deepEqual(second.retiredIds, ["comprehensive-0007"]);
});

test("sources have independent namespaces and duplicate prior IDs are rejected", () => {
  const previousChunks = [chunk("manual-0020", "1", "manual", "manual")];
  const result = reconcileRuleChunks({ previousChunks, chunks: [chunk("temporary", "1", "rules"), ...previousChunks] });
  assert.equal(result.chunks[0].id, "comprehensive-0000");
  assert.equal(result.chunks[1].id, "manual-0020");
  assert.throws(
    () => reconcileRuleChunks({ previousChunks: [...previousChunks, ...previousChunks], chunks: [] }),
    /Duplicate or retired/,
  );
});
