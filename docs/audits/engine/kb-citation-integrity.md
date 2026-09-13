---
title: KB citation integrity audit
updated: 2026-09-13
---

# KB citation integrity audit

## Status

Bounded infrastructure audit delivered; complete normative proof and source freshness remain open. `cite(id, note?, expectedFingerprint?)` now checks an optional
SHA-256 fingerprint of exact chunk text before recording a citation. Existing
two-argument calls remain compatible and are explicitly unpinned. Citation
diagnostics also retain the calling file. This is source-integrity evidence,
not behavioral rule coverage.

The rule importer now reconciles IDs against the previous index instead of
reusing extraction positions. Unchanged chunks match within their source,
section and title by exact text; unique section/title chunks retain identity
when prose changes so reviewed fingerprints can detect drift. Ambiguous
split/merged chunks and duplicate extraction content fail before committed
documents or the index are replaced. Removed IDs remain reserved in
`retiredIds` across later refreshes. Missing source extraction also fails,
instead of silently dropping that source from the index.

## Historical proof and gates

`src/engine/conformance/kb-citation-drift.test.ts`: 4/4 focused tests passed.
Tests prove unchanged content acceptance, changed content under the same ID
rejection before citation registration, unknown ID rejection, and legacy
compatibility. The mutation test restores cached text in `finally`.

`tools/kb/reconcile-rule-chunks.test.mjs`: 7/7 passed. Proof covers insertions,
reordering, changed prose, unchanged split chunks, ambiguous merging, permanent
ID retirement, source namespaces, duplicate prior IDs, and duplicate fresh
content with distinct or shared object references. Direct reconciliation of
the existing committed index preserved all 363 chunks exactly. The root
`pnpm test:tools` gate now includes KB tool tests: 26/26 passed. Independent
review reproduced the duplicate-input gap; its correction was re-reviewed
without remaining blockers in this bounded reconciliation change.

## Prior checkpoints and residuals

- Pin reviewed citations as each mechanism is audited; most existing citations
  remain unpinned and must not be reported as protected against drift.
- Conformance README updated for opt-in fingerprinting and current serial flags.
- Shared regression passed: 217 files / 3119 tests. API typecheck and scoped formatting passed. Infrastructure delivery commit:
  `d2753b28e`. Reviewed pilot obligations pin both local §15-7 chunks.
- Citation counts still do not establish obligation coverage. Retain honest
  residual reporting until a complete classified denominator exists.
- The earlier missing-file checkpoint is resolved: all three named files now register reviewed citations and fingerprints. The current chapter inventory is 76 files. Runtime coverage reporting still requires observed execution of every chapter; static declaration consistency does not establish execution.
- Official comprehensive version 4.2 was downloaded and extracted (27559 words,
  286 provisional chunks before fixing history separation). Multi-source refresh
  failed on the removed glossary URL, then on ambiguous illustrated-manual OCR
  chunks. `--source=comprehensive` now updates just the chosen source and records
  `refreshedSources`; the other active source remains explicitly unrefreshed.
  The reviewed glossary is archived and its historical chunks retained.
- Scoped comprehensive import produced 285 comprehensive chunks and 371 total
  chunks. Four reviewed heading-footer artifacts and TOC page numbers no longer
  retire otherwise matching identities. Loop citation `comprehensive-0270` is
  preserved after separating history; its normative text is unchanged after
  whitespace normalization. History-only IDs 0271–0276 retire; the appendix is
  classified from its explicit title and null section, without treating game
  rules as non-testable.
- Baseline inconsistency verified directly: HEAD's prose `comprehensive.md`
  already contains version 4.2, while its indexed title chunk says version 4.0.
  The freshly extracted prose matches baseline exactly after repository
  formatting; this delivery updates the stale indexed source rather than
  changing that already-current prose artifact.
- First source regression: 29 files failed / 1 passed, four failed / 17 passed;
  an unknown seeded TOC ID prevented chapter collection and the processing pin
  correctly detected text drift. After reviewed TOC correction, history
  classification and cost-pin review: 11 files failed / 19 passed, 60 failed /
  338 passed. Remaining retired normative citations require individual review;
  they have not been replaced just to make the suite pass.
- Reviewed §15-7 source changes: the old `126 [Machinedramon]` extraction artifact
  is now `1 [Machinedramon]`, with a trailing page marker; §15-7-5 now renders
  `- 5000 DP` instead of `-5000 DP`. Processing semantics are unchanged. Reviewed
  fingerprints are now `255a54ddb16e8b3afbf5e0e984ade2a3525df85fae97c11e90af762d2932bc0b`
  (0169) and `6cf99208432c9ac35794ee0edd04b5e68067edccb3fc5de44d96cfe768ce2c97`
  (0170). Name-reference chunk 0034 retains its prior fingerprint. Cost, Detach
  and citation-drift focused regression: 3 files / 45 tests passed.
- Retired-citation review is now corrected and green for the existing suite.
  The inserted §4-2 Cost shifts the former §4-2–§4-27 topics by one: citations
  0069–0098 now reference 0286–0315, matched by exact topic and new section.
  Source differences include DUAL declaration wording and the token's destination
  before removal; existing tests exercise only their named consequences. They
  do not certify every changed clause or the new cost section.
- Other reviewed mappings: 0057 → 0280 (batch private placement), 0061/0062 →
  0281/0282 (breeding), 0063 → 0283 (battle), 0154 → 0318 (security continuation),
  0203 → 0320 (private searches/numeric effects). The former 0126 mixed chunk
  splits by obligation: permanent identity now cites 0060 §3-4-5; no-draw
  digivolution cites 0125 §8-1-2-8. Burst final stacking cites 0317 §8-3-3-4;
  cost/Tamer procedure remains in 0132. The old Arts-information citation 0050
  was inappropriate for Option declaration; that prerequisite now cites DUAL
  chunk 0289, without claiming the Arts overwrite itself.
- Normative exclusions 0025 (DigiXros/Assembly declaration cost interaction) and
  0269 (immediate overwrite interruption) were removed: missing fixtures or
  implementation cannot make a game rule non-normative. Their full behavioral
  obligations remain open in the engine plan. Genuine revision history and the
  physical marker classification remain separate.
- One edit accidentally removed adjacent loop-fixture helpers with the invalid
  exclusion: 2 failed / 419 passed. The helpers were restored unchanged from
  baseline. Final conformance: 30 files / 421 tests passed.
- The earlier migration added 64 literal fingerprint arguments and recorded 73
  fingerprinted calls over 41 chunks at that checkpoint. The reproducible
  read-only scan from the repository root is the following embedded Node
  recipe; it uses a balanced-parenthesis scan, recognizes the first string
  argument of each `cite(...)`, and resolves file-local 64-hex constants:

  ```sh
  node --input-type=module <<'NODE'
  import { readdirSync, readFileSync } from "node:fs";
  import { join } from "node:path";
  const dir = "apps/api/src/engine/conformance";
  const files = readdirSync(dir).filter((n) => n.endsWith(".test.ts") && n !== "_kb.meta.test.ts");
  const idRe = /^(?:comprehensive|manual|glossary)-\d{4}$/;
  const hashRe = /^[0-9a-f]{64}$/;
  const split = (s) => { const out = []; let start = 0, depth = 0, quote = "";
    for (let i = 0; i < s.length; i++) { const c = s[i], p = s[i - 1];
      if (quote) { if (c === quote && p !== "\\") quote = ""; continue; }
      if (["'", '"', "`"] .includes(c)) quote = c;
      else if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (c === "," && depth === 0) { out.push(s.slice(start, i)); start = i + 1; }
    } out.push(s.slice(start)); return out; };
  const calls = (s) => { const out = [], re = /\bcite\s*\(/g; let m;
    while ((m = re.exec(s))) { let i = re.lastIndex, depth = 1, quote = "";
      for (; i < s.length; i++) { const c = s[i], p = s[i - 1];
        if (quote) { if (c === quote && p !== "\\") quote = ""; continue; }
        if (["'", '"', "`"] .includes(c)) quote = c;
        else if (c === "(") depth++;
        else if (c === ")" && --depth === 0) { out.push(s.slice(re.lastIndex, i)); re.lastIndex = i + 1; break; }
      }
    } return out; };
  let recognized = 0, pinned = 0; const ids = new Set(), pinnedIds = new Set();
  for (const file of files) { const text = readFileSync(join(dir, file), "utf8"), constants = new Map();
    for (const m of text.matchAll(/\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*["']([0-9a-f]{64})["']/g)) constants.set(m[1], m[2]);
    for (const body of calls(text)) { const args = split(body), id = args[0]?.trim().match(/^["']([^"']+)["']$/)?.[1];
      if (!idRe.test(id ?? "")) continue; recognized++; ids.add(id);
      const third = args[2]?.trim().replace(/[;,]\s*$/, "").replace(/["']/g, "");
      if (hashRe.test(third ?? "") || constants.has(third)) { pinned++; pinnedIds.add(id); }
    }
  }
  console.log({ files: files.length, recognized, pinned, unpinned: recognized - pinned, ids: ids.size, pinnedIds: pinnedIds.size });
  NODE
  # expected: files 76, recognized 431, pinned 149, unpinned 282, pinnedIds 88
  ```

  Before the three missing files were covered, the same scan reported 424
  recognized calls and 142 fingerprinted calls over 82 chunk IDs. The current
  scan reports 431 recognized calls, 149 fingerprinted calls over 88 chunk IDs,
  and 282 legacy two-argument calls.
  `cite` deliberately permits those unpinned calls: `_kb.ts` compares text only
  when `expectedFingerprint` is supplied, and `kb-citation-drift.test.ts`
  preserves two-argument compatibility. The 282 calls are therefore an
  integrity residual to pin before claiming drift protection, not a failed
  helper contract. These counts are integrity coverage, not a behavioral
  denominator or completion score.

- Affected broad regression: 425 files / 4627 tests passed across conformance,
  combat, effects, engine cards, BT26, EX10, BT14 and audit layout. The expected
  unsupported-effect logger receipt belongs to its negative regression test.
- At the historical checkpoint, the tool gate was 30/30 passed, including
  malformed/archived CLI source rejection. Independent review found no weakened
  behavioral assertions or semantic blocker, with stale narrative references
  subsequently corrected.
- Oxlint: zero new findings against an isolated HEAD snapshot; the same 23
  pre-existing conformance warnings remain. Final API typecheck passed. Formatter, audit layout
  (4/4), generated index and diff checks passed. Repeated reconciliation preserves
  all 371 current identities and 46 retired IDs; the 67 manual and 19 glossary
  chunks match baseline exactly. Illustrated-manual OCR reconciliation and
  complete mechanism proofs remain open.

## History

- 2026-09-12: compatible opt-in drift detection and four focused tests added
  from baseline `de4dda717d8c9e0c2420796cb387f68b1379b863`.

## Integrity checkpoint, 2026-09-13

The four existing meta-test assertions now combine runtime registrations with an AST inventory of literal declarations and file-local top-level string constants. This makes unknown IDs and cited/excluded overlap detectable when the meta-test runs alone, independently of worker scheduling. Dynamic declarations are reported as unresolved instead of guessed. Runtime fingerprint checks and the observed-file guard remain separate; declaration inventory is not behavioral coverage.

Cold meta execution reproduced the `comprehensive-0206` contradiction before correction. The obsolete exclusion was removed, preserving the existing reviewed activation-cost citation. Fifteen normative exclusions were removed in total: `manual-0034`, `0035`, `0036`, `0066`; `comprehensive-0158`, `0190`, `0199`, `0205`, `0206`, `0212`, `0218`, `0219`, `0241`, `0253`, `0255`. Missing producers, missing fixtures, timeouts and implementation gaps do not make normative rules non-testable. These are open proof obligations, not newly certified rules. Adjacent behavioral helpers and assertions were retained. Other historical exclusions still require individual classification.

The audit-index fixtures now provide their real formatter dependency and a minimal project manifest. Their three existing tests reproduced the missing-dependency failures before correction and now exercise the formatter without mocks. Formatter failures retain a useful diagnostic even when stderr is empty. The importer comparison now records two field-specific deviations verified against primary sources on 2026-09-13: [EX12-035 Japanese name](https://digimoncard.com/rule/?card_no=EX12-035) and [P-244 Your Turn clause](https://world.digimoncard.com/cards/?category=522901&search=true). The catalog was already correct; no catalog behavior or collection score is changed by the allowlist. The serialized tools gate passed **34/34** tests.

Persisted EX6 IR was reconciled to the authoritative direct modules: `EX6-002`, `010`, `021`, `027`, `030`, `043`, `054`, `057`, `065`, `067`, `068`, `069`, `074`. These 13 records normalize fields already used by runtime compilation: under-filter location, turn-duration aliases, cost-choice/destination representation, redundant inherited/frequency markers, Delay keywords, Recovery duration metadata and normal digivolution payment. No direct card module was changed in this checkpoint. Scoped sync and check report **74 synchronized records**, with **zero semantic or byte changes outside EX6** against `2debe592c`. This resolves the artifact-parity residual recorded at the earlier placement checkpoint without awarding new card behavioral credit.

Direct identity reconciliation preserves **371 current chunks and 46 retired IDs** exactly. The manifest records only the comprehensive source refreshed on 2026-09-12; the manual remains unrefreshed and the glossary archived. Q&A provenance is older: 4,375 cards scanned on 2026-08-19, 2,617 nonempty ruling entries and 42 historical fetch failures, versus 4,458 current catalog cards. Absence from the nonempty Q&A map does not imply a missing ruling. No complete fresh-source coverage claim is made. The citation scan remains **431 recognized calls, 149 pinned, 282 unpinned** across 76 chapter files. Pinning and exhaustive normative proof remain open.

The isolated meta-test passes **4/4** after correction. The combined conformance, EX6 collection and audit-layout gate passes **152 files / 1,082 tests**. Final serialized engine regression and style receipts follow below.

Three baseline behavioral-oracle failures were corrected in the existing tests, with no new test cases or production changes. Two waiver fixtures previously treated the Digimon half of DUAL BT25-043 as color-gated; they now use the registered Yellow Option EX6-068 through public `playCard`, assert empty-board rejection without waiver, and await actual battle placement with waiver. BT1-053 remains in hand as a legal Angel candidate, so it does not supply a field color source. Automatic optional/card decisions complete the printed Option flow. The different-colors negative now preserves its mandatory count of two and asserts rejection of an invalid two-red group without partial trash; both multicolor positive controls are unchanged. The corrected existing mechanic/interpreter suites pass **339/339** tests. An intermediate candidate-free Option fixture failed settlement and was corrected rather than increasing polling or accepting only an intent receipt.

Final serialized full engine regression: **328 files / 7,856 tests passed**, using `TEST_MAX_WORKERS=1 TEST_HEAP_MB=3072` and `--no-file-parallelism`. The earlier four baseline failures are resolved by the classification/oracle corrections above; the expected unsupported AD1-002 logger receipt remains part of its passing negative test. Shared, API and web typechecks passed in sequence. Scoped Oxlint reports no new findings after removing the newly unused exclusion imports; nine existing warnings remain in the changed chapter files. Scoped Oxfmt passes for changed code, tooling and documents. The generated `effects.json` retains a pre-existing formatter mismatch: read-only stdin formatting differs both at `2debe592c` and after synchronization. Its authoritative scoped serializer and 74-record parity check pass, and outside-EX6 bytes are preserved; whole-file reformatting is not claimed green. Audit layout, the generated 66-set index and `git diff --check` pass. These receipts certify the bounded infrastructure and regression contracts, not exhaustive normative rule execution or whole-collection 10/10 status.

Delivery commits: `1b8291557` (declaration consistency, normative classification and existing behavioral oracles), `711aa637d` (real-formatter fixtures and primary-source deviations), `df8f0317c` (scoped EX6 persisted IR). Read-only Luna review approved the bounded changes without material blockers. No complete collection certification or fresh-source denominator is inferred from these commits.
