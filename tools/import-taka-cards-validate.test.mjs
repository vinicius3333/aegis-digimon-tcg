// Runs `node tools/import-taka-cards.mjs --validate <SET>` as an automated,
// network-free consistency check.
//
// For every set/batch imported from the community DB (TakaOtaku/Digimon-Card-App), this
// reconstructs each card's record from a vendored source snapshot via `convert()` and
// diffs it against the committed packages/shared/src/cards/data/cards.json record. Any
// field difference must be pre-approved in import-taka-validate-allowlist.json, each entry
// carrying a short reason — this test does not weaken the comparison to pass, it only
// tolerates documented, already-known deviations that should shrink over time.
//
// The snapshot at tools/fixtures/taka-community-db-snapshot.json is a subset of
// TakaOtaku/Digimon-Card-App's src/assets/cardlists/DigimonCards.json (fetched 2026-08-06),
// filtered to just the cardIds imported via this tool: BT26 (all), EX12 (all), and the 6
// promo cards P-239..P-244. It is deterministic and committed so this test needs no
// network access. If it is ever removed, the test skips with an explicit message instead
// of silently passing — it never reports success without having actually compared records.
//
// To refresh: download DigimonCards.json, filter to the batches in BATCHES below, and
// overwrite the fixture; then re-run this test and update the allowlist for whatever
// newly differs.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMPORTER = join(ROOT, "tools/import-taka-cards.mjs");
const SNAPSHOT = join(ROOT, "tools/fixtures/taka-community-db-snapshot.json");
const ALLOWLIST_PATH = join(ROOT, "tools/import-taka-validate-allowlist.json");

// Every set/batch actually imported via tools/import-taka-cards.mjs (not every set that
// happens to share a cardId prefix — most "P" promo cards were already present
// in the committed snapshot and were never touched by this importer).
const BATCHES = [
  { label: "BT26", validate: "BT26" },
  { label: "EX12", validate: "EX12" },
  { label: "PROMO", validate: "PROMO", ids: ["P-239", "P-240", "P-241", "P-242", "P-243", "P-244"] },
];

const snapshotAvailable = existsSync(SNAPSHOT);

function runValidate({ validate, ids }) {
  const args = [IMPORTER, "--source", SNAPSHOT, "--validate", validate, "--json"];
  if (ids) args.push("--ids", ids.join(","));
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
  assert.equal(result.status, 0, `import-taka-cards.mjs --validate ${validate} exited nonzero: ${result.stderr}`);
  return JSON.parse(result.stdout);
}

function loadAllowlist() {
  const raw = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8"));
  const byCardField = new Map();
  for (const entry of raw) {
    assert.ok(entry.cardId && entry.field && entry.reason, `malformed allowlist entry: ${JSON.stringify(entry)}`);
    byCardField.set(`${entry.cardId} ${entry.field}`, entry);
  }
  return byCardField;
}

test(
  "importer --validate: BT26/EX12/promo reconstructions match cards.json except documented deviations",
  { skip: !snapshotAvailable && `vendored source snapshot missing at ${SNAPSHOT} — cannot verify the importer without network access; see the fixture-refresh note in this file` },
  () => {
    const allowlist = loadAllowlist();
    const used = new Set();
    const unexpected = [];

    for (const batch of BATCHES) {
      const result = runValidate(batch);
      assert.ok(result.sourceCount > 0, `${batch.label}: source-side selection was empty — check the snapshot still contains this batch`);
      assert.ok(result.oursCount > 0, `${batch.label}: no matching committed cards found — check cards.json still has this batch`);

      for (const diff of result.diffs) {
        for (const { field, ours, conv } of diff.fields) {
          const key = `${diff.cardId} ${field}`;
          if (allowlist.has(key)) {
            used.add(key);
          } else {
            unexpected.push(
              `${batch.label} ${diff.cardId}.${field}: ours=${JSON.stringify(ours)} conv=${JSON.stringify(conv)}`,
            );
          }
        }
      }
    }

    assert.deepEqual(
      unexpected,
      [],
      "undocumented deviation(s) between cards.json and the reconstructed source — either an importer " +
        "regression/community-DB drift (fix or add to tools/import-taka-validate-allowlist.json with a reason):\n" +
        unexpected.join("\n"),
    );

    const stale = [...allowlist.keys()].filter((k) => !used.has(k));
    assert.deepEqual(
      stale,
      [],
      "stale allowlist entries no longer produce a diff — remove them from the allowlist:\n" +
        stale.map((k) => k.replace(" ", ".")).join("\n"),
    );
  },
);
