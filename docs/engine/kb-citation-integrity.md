---
title: KB citation integrity audit
updated: 2026-09-13
---

# KB citation integrity audit

## Version 4.3 checkpoint (2026-09-22)

The version 4.2 source and citation counts below are historical. The current comprehensive corpus and index match the official September 18 version 4.3 PDF; the current static checker finds 436 pinned calls in 78 conformance files, with zero missing IDs, hash mismatches, missing notes, or review warnings. The reviewed source migration, Q5331 correction, and remaining manual/Q&A boundaries are recorded in [rules-v4-3-source-drift.md](rules-v4-3-source-drift.md). Static citation integrity still does not establish behavioral proof.

The checker now also recursively scans all card test files containing `cite()`. Its current combined scope is 78 conformance and 11 card test files, with 454 pinned calls and zero static errors or review warnings. This caught six stale card pins after the v4.3 import. BT10-111's DigiXros note and BT14-054's optional-cost note were corrected against the current rule text; the affected four card suites pass 39/39. Card set ledgers BT10, BT11, BT14, and BT20 record their individual source reviews and limits.

## Status

Bounded infrastructure audit delivered; complete normative proof and source freshness remain open. `cite(id, note?, expectedFingerprint?)` now checks an optional
SHA-256 fingerprint of exact chunk text before recording a citation. Existing
two-argument calls remain compatible and are explicitly unpinned. Citation
diagnostics also retain the calling file. This is source-integrity evidence,
not behavioral rule coverage.

## Scoped Q&A refresh (2026-09-13)

The replacement and remaining-engine fronts refreshed 224 card Q&A pages from
the official card-rulings endpoint. Temporary extraction inputs were kept outside the repository; the durable per-card URL, timestamp, raw-response hash and outcome receipts are in the committed manifest. The scope contains 171 pages with self-category rulings, 53 pages with no self-category rulings, and zero fetch failures. Of these 53, 50 have the explicit empty-page marker and BT20-100, EX3-013 and EX7-048 contain only related categories, confirmed against the requested physical card category. The scoped receipt is recorded in
`data/kb/manifest.json` under `qa.scopedRefreshes`; the historical global Q&A
metadata remains unchanged (4,375 cards scanned on 2026-08-19, 2,617 cards
with rulings and 42 historical failures).

Nineteen cards differed from the committed map. Sixteen cards lost 21 wrongly attributed related-category entries through
category reconciliation: the HTML page included a related card's
category, and the parser now excludes it. Removed IDs and category owners are
Q2612 → BT16-014, Q4905 → BT22-052, Q5349 → BT23-073, Q5352 → BT23-075,
Q5604 → BT24-025, Q1308 → BT5-030, Q2858 → BT17-081, Q1967 → BT10-042,
Q1688 → BT7-112, Q1736 → BT8-057, Q3359 → EX2-070, Q5169 → EX10-059,
Q5166/Q5167 → EX10-059, Q2212/Q2213 → BT12-072, Q3816 → EX6-065, Q3084
→ BT19-027, Q4585 → BT21-074, Q4108 → RB1-034, and Q974 → BT1-105.

The refresh adds five self-category entries (BT26-029/Q7195,
BT26-054/Q7056, BT26-054/Q7057, BT26-085/Q7129, and BT26-085/Q7130), updates
the substantive answer and date of BT26-029/Q6995, and adds EX7-061 to
EX10-055/Q5141's `related` metadata while preserving its answer. These are
source reconciliation changes; they do not certify engine behavior. The
official card pages retain the removed IDs in related-category HTML, so no
removal is treated as a fetch failure.

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

## Scoped 282-reference reconciliation (2026-09-13)

Branch `audit-scoped-four-fronts-282-refs`, baseline `85a465314`. A TypeScript
AST inventory of the baseline finds **431 chapter calls: 149 pinned and 282
unpinned**, excluding `_kb.meta.test.ts` and the deliberate
`kb-citation-drift.test.ts` infrastructure probes. Including the latter's
literal compatibility citation gives 432 calls / 283 unpinned; that extra call
intentionally remains unpinned. The older balanced-text recipe above is a
historical receipt, not the current authoritative declaration inventory.

All 282 chapter calls now carry literal SHA-256 fingerprints of their exact
committed chunk text, across 32 changed files. A separate structural AST
comparison against `85a465314`, ignoring only the third `cite` argument,
confirmed all 32 files retain the same assertion bodies, citation IDs and
notes. No rule-index text, full normative citation note, not-testable
classification or catalog record was removed or replaced by this migration.

The new finite placement mechanism fixture adds five pinned declarations.
Current chapter inventory is therefore **436 / 436 pinned calls**, with zero
missing, unresolved or mismatched references. Its 76 files exclude both helper
files; the historical 76-file scan included the drift helper and predates the
new placement file, so equal file counts do not imply equal membership.

Reproduce the integrity and provenance check from the repository root:

```sh
node tools/kb/check-conformance-citations.mjs
node tools/kb/check-conformance-citations.mjs --json
node --test tools/kb/check-conformance-citations.test.mjs
```

The JSON stdout report retains each declaration's file, line, ID, original
note, literal fingerprint, source title, section and chunk title. Full
normative text and primary-source URLs remain in `data/kb/rules-index.json`;
no per-reference audit file or JSON evidence ledger is generated. Pins must
be reviewed after source drift; the checker has no automatic repinning mode.
It rejects missing IDs, absent/dynamic/invalid pins, changed text and ambiguous
shadowed constants. Only immutable top-level literal constants are resolved;
unsupported expressions are reported rather than evaluated.

Fingerprint protection is **source identity evidence**, not proof that every
subclause in a chunk is behaviorally exercised. The checker reports one known
partial-note warning: `ch15-03-targeting-and-selection.test.ts`'s
`comprehensive-0184` note states the fixed-X case without its largest-feasible,
unique-target and overall-processing clauses. That test proves its demonstrated
fixed-X witness; it does not certify the full chunk. The corrected ordinary
different-color subset oracle and retained atomic-cost controls are recorded
in [the current four-front consumer reconciliation](mechanism-inventory.md#current-four-front-consumer-reconciliation-2026-09-13).
The warning is a reviewed example, not an exhaustive semantic note validator.

The manual remains unrefreshed, the glossary archived, and Q&A provenance
retains the earlier recorded scan/date/failure boundaries. No fresh-source,
whole-KB normative execution or whole-catalog coverage claim follows from
436 protected declarations. Final regression, review and delivery receipts
are recorded in the four-front owner section after those gates complete.

## Latest scoped Q&A provenance correction (2026-09-13)

The persistent manifest now embeds all 224 per-card fetch rows (card ID, URL,
status, timestamp, SHA-256 and changed flag), so the scoped reconciliation does
not depend on `/tmp` artifacts for provenance. The refresh yielded 171 ruling
pages, 53 empty pages and no fetch failures. Against the pre-refresh map, 21
Q&A entries were removed because they belonged to related-card categories, and
five self-category entries were added. The earlier summary's “16 removed” was
the number of affected category groups, not the number of removed Q&A entries;
the manifest now records the correct count of 21.

The duration selector's exact current persisted aliases are
`untilEndOfAttack` (BT4-090, RB1-025) and `untilEndOfBattle` (EX13-076, three
occurrences). No `untilEndOfBattle` spelling variant is present. EX13-076's
fresh Q&A page was fetched successfully but is empty; it remains a zero-ruling
provider row rather than an omitted fetch.

The exclusion review found a material classification residual: `manual-0000`
through `manual-0005` are currently absent from `not-testable.ts`, but their
committed texts contain substantive normative rule/manual content (including
card information, game areas, breeding-area restrictions, deck construction,
and token rules), despite OCR noise. They must not be classified as
not-testable. The existing comprehensive title/TOC/bare-heading exclusions were
not re-certified as behavioral coverage; they remain only source-content
classifications pending independent review.

The official Rule Manual Ver. 6.0 source download succeeded and is identified
by SHA-256 `2cb70238044653781f71cc9f83d61c6cdf064557c7905838df9eda58d396cab2`.
It is image-only across 49 pages. A provisional 150-DPI OCR pass yielded 62
chunks versus 67 from the prior extraction; the discrepancy is an unresolved
OCR/chunking ambiguity, not a source-text change and does not authorize pin
updates. The source title is `Official Rule Manual`; the 57 manual and four
comprehensive classifications are retained as normative/historical comments,
not exclusions of unimplemented keywords. No source pins were changed.

## Current normative classification boundary (2026-09-13)

57 manual chunk IDs previously registered as not-testable solely because of repeated normative content, damaged OCR or historical lack-of-proof notes are no longer exclusions. Their original cross-references are preserved as comments explicitly labeled historical; old “unimplemented” keyword labels are not current defect findings. Four comprehensive IDs are similarly reclassified: 0031 (newest card text), 0171 (effect categories), 0174 (trigger-condition reference snapshots) and 0175 (processing/removal-time references). Repetition and absence of a convenient printed witness do not make normative text non-normative. No replacement cite is added without a behavioral witness. The separately authorized physical-marker classification at comprehensive-0029 and genuinely non-normative headings/TOC remain intact.

The chapter integrity check still reports **436/436 pinned references**, no missing/dynamic/mismatched pins, and the existing single partial-note warning for comprehensive-0184. Assertion bodies, normative rule text and fingerprints are unchanged by this classification repair. The newly added fixture files bring scanned files to 78; calls remain 436. Existing level-relative trigger/removal snapshot, live processing, category, keyword and manual worked-example suites are reused. This clears misleading exclusion credit; it does not turn all remaining normative clauses or citation notes into proven behavior.

Scoped Q&A refresh selection is reproducible from persisted IR: union cards containing explicit leave/delete prevent/instead actions, onAddDigivolutionCards, the rare duration aliases listed below, or the budget fields. Use `tools/kb/lib/http.mjs`'s force fetch and `parse-qa.mjs`'s requested-card category parser; successful empty pages are receipts, while fetch errors preserve historical data. Rare aliases are untilEachTurnEnd, endOfOpponentTurn, untilEndOfBattle, untilOpponentNextTurnEnd, untilEndOfAttack, forTheAttack, nextDigivolveThisTurn, untilOpponentNextUnsuspendPhase, untilYourTurnEnd. Budget fields are totalCost, totalDpCap, totalPlayCostBudget, totalPlayCostBudgetFromSelectionRef, costBudget, baseBudget, budget. The union is 224 cards; all per-card URLs, times, statuses and raw-response hashes are persisted in the scoped manifest receipt. This is not a fresh scan of all 4,458 catalog cards, and the historical global 42 fetch failures are not erased.

Successful scoped-empty categories remain absent from the nonempty Q&A map; their 53 success receipts remain in the manifest. The current nonempty map contains 2,616 cards; the historical global 2,617 count is not rewritten as a fresh global scan. Existing collection ledgers distinguish related-card authority from self-category attribution; valid interaction proofs and scores are unchanged.

The earlier manual-0000–0005 classification residual is superseded by the latest 57-ID removal: these IDs now retain normative historical cross-references without not-testable registration. Exhaustive behavioral correspondence of their clauses remains unproven. Fresh BT26-029 Q6995/Q7195 demonstrated a real stack-return versus whole-Digimon-return defect, corrected with dedicated red/green physical-instance controls and scoped IR parity (see BT26.md and digivolution-card-placement.md). No fingerprint was repinned. Final full API, real typecheck, tools and delivery receipts are recorded in mechanism-inventory.md.

After the final source-attribution corrections, the focused semantic-ledger/layout gate passed **2 files / 34 tests**, actual exit 0; the index remains current and diff validation is clean. Collection scores/statuses and historical physical interaction assertions are preserved.
