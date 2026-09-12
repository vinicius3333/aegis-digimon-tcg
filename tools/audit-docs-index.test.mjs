import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";

const repoRoot = resolve(import.meta.dirname, "..");

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "aegis-audit-index-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "tools/audit-docs"), { recursive: true });
  mkdirSync(join(root, "docs/audits"), { recursive: true });
  const script = join(root, "tools/audit-docs/build-index.mjs");
  copyFileSync(join(repoRoot, "tools/audit-docs/build-index.mjs"), script);
  const readme = join(root, "docs/audits/README.md");
  writeFileSync(
    readme,
    "# Audits\n\nBefore the index.\n\n<!-- index:start -->\n\n<!-- index:end -->\n\nAfter the index.\n",
  );
  const ledger = join(root, "docs/audits/BT10.md");
  writeFileSync(
    ledger,
    "---\nset: BT10\ncards: 112\nstatus: verified\nverified_at: 2026-09-12\ncatalog_commit: baseline\nevidence_commit: baseline\n---\n",
  );
  return {
    readme,
    ledger,
    run: (...args) => spawnSync(process.execPath, [script, ...args], { encoding: "utf8" }),
  };
}

test("a generated index survives the project formatter and remains current", (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const generated = readFileSync(f.readme, "utf8");
  const formatted = spawnSync(join(repoRoot, "node_modules/.bin/oxfmt"), [f.readme], { encoding: "utf8" });
  assert.equal(formatted.status, 0, formatted.stderr);
  assert.equal(readFileSync(f.readme, "utf8"), generated);
  assert.equal(f.run("--check").status, 0);
  assert.equal(f.run().status, 0);
  assert.equal(readFileSync(f.readme, "utf8"), generated);
  assert.match(generated, /Before the index\./u);
  assert.match(generated, /After the index\./u);
});

test("changed ledger status is rejected without writing, then regeneration updates it", (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const before = readFileSync(f.readme, "utf8");
  writeFileSync(f.ledger, readFileSync(f.ledger, "utf8").replace("status: verified", "status: in-progress"));
  const stale = f.run("--check");
  assert.equal(stale.status, 1);
  assert.match(stale.stderr, /status index is stale/u);
  assert.equal(readFileSync(f.readme, "utf8"), before);
  assert.equal(f.run().status, 0);
  assert.match(readFileSync(f.readme, "utf8"), /in-progress/u);
  assert.equal(f.run("--check").status, 0);
});

test("invalid front matter fails before overwriting the index", (t) => {
  const f = fixture(t);
  assert.equal(f.run().status, 0);
  const before = readFileSync(f.readme, "utf8");
  writeFileSync(f.ledger, readFileSync(f.ledger, "utf8").replace("set: BT10", "set: BT11"));
  const invalid = f.run();
  assert.equal(invalid.status, 1);
  assert.match(invalid.stderr, /expected "BT10"/u);
  assert.equal(readFileSync(f.readme, "utf8"), before);
});
