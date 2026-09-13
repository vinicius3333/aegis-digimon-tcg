import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checkConformanceCitations } from "./check-conformance-citations.mjs";

test("current conformance inventory has no unpinned calls and only the deliberate legacy probe is excluded", () => {
  const report = checkConformanceCitations();
  const expectedFiles = readdirSync(join(process.cwd(), "apps/api/src/engine/conformance")).filter(
    (name) => name.endsWith(".test.ts") && name !== "_kb.meta.test.ts" && name !== "kb-citation-drift.test.ts",
  );
  assert.equal(report.files, expectedFiles.length);
  assert.equal(report.summary.recognized, report.summary.pinned);
  assert.ok(report.summary.recognized >= 431);
  assert.equal(report.summary.unpinned, 0);
  assert.equal(report.summary.unresolved, 0);
  assert.equal(report.summary.mismatches, 0);
  assert.equal(report.summary.missingNotes, 0);
  assert.equal(report.summary.reviewWarnings, 1);
  assert.equal(report.errors.length, 0);
});

test("provenance retains source identity, exact hash and readable note", () => {
  const report = checkConformanceCitations();
  const citation = report.calls.find((call) => call.id === "comprehensive-0020");
  assert.equal(citation.sourceTitle, "Comprehensive Rules");
  assert.equal(citation.section, "1-1");
  assert.equal(citation.title, "Number of Players");
  assert.match(citation.fingerprint, /^[0-9a-f]{64}$/);
  assert.match(citation.note, /played by two players/);
  assert.match(report.reviewWarnings.find((warning) => warning.id === "comprehensive-0184").reason, /up-to-X/);
});

test("the checker reports an unresolved dynamic pin without guessing", () => {
  const root = mkdtempSync(join(tmpdir(), "kb-citation-check-"));
  try {
    mkdirSync(join(root, "data/kb"), { recursive: true });
    mkdirSync(join(root, "apps/api/src/engine/conformance"), { recursive: true });
    writeFileSync(
      join(root, "data/kb/rules-index.json"),
      JSON.stringify({
        chunks: [{ id: "comprehensive-0000", sourceTitle: "Rules", section: "1", title: "Test", text: "Test" }],
      }),
    );
    writeFileSync(
      join(root, "apps/api/src/engine/conformance/example.test.ts"),
      'const PIN = getPin(); cite("comprehensive-0000", "dynamic", PIN);',
    );
    const report = checkConformanceCitations({ root });
    assert.equal(report.summary.unresolved, 1);
    assert.equal(report.errors[0].kind, "unresolved-pin");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the checker rejects missing IDs, unpinned calls, drifted hashes and shadowed constants", () => {
  const root = mkdtempSync(join(tmpdir(), "kb-citation-gates-"));
  try {
    mkdirSync(join(root, "data/kb"), { recursive: true });
    mkdirSync(join(root, "apps/api/src/engine/conformance"), { recursive: true });
    const text = "Test";
    const valid = createHash("sha256").update(text).digest("hex");
    writeFileSync(
      join(root, "data/kb/rules-index.json"),
      JSON.stringify({
        chunks: [{ id: "comprehensive-0000", sourceTitle: "Rules", section: "1", title: "Test", text }],
      }),
    );
    writeFileSync(
      join(root, "apps/api/src/engine/conformance/example.test.ts"),
      `cite("comprehensive-0000", "missing pin");
cite("comprehensive-0001", "missing chunk", "${valid}");
cite("comprehensive-0000", "drift", "${"0".repeat(64)}");
const PIN = "${valid}";
function shadowed(PIN) { cite("comprehensive-0000", "parameter shadow", PIN); }
function mutable() { var PIN = "${"0".repeat(64)}"; cite("comprehensive-0000", "var shadow", PIN); }
cite("comprehensive-0000", "valid", PIN);`,
    );
    writeFileSync(
      join(root, "apps/api/src/engine/conformance/valid.test.ts"),
      `const PIN = "${valid}"; cite("comprehensive-0000", "valid static const", PIN);`,
    );
    const report = checkConformanceCitations({ root });
    assert.deepEqual(
      report.errors.map((error) => error.kind).sort(),
      ["hash-mismatch", "missing-id", "shadowed-pin", "shadowed-pin", "shadowed-pin", "unpinned"].sort(),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
