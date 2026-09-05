# BT1–BT26 Static Card Implementation Reconciliation

Status: all 2,792 catalog cards have integrated provisional static evidence;
delivery gates remain unexecuted

Audit date: 2026-08-29
Catalog authority: `packages/shared/src/cards/data/cards.json` blob
`efbecc002fb9000789123e2f91f201466e1e5b0a`

This is aggregate reconciliation of the card-by-card static
campaign for BT1 through BT26. The authoritative detailed evidence is the 299
range reports under `internal-docs/audits/BT1/` through
`internal-docs/audits/BT26/`, together with the current per-set static ledgers.
It does not convert static source evidence into executed-gate evidence and it
does not make a collection-complete claim.

## Score and execution model

Each card has exactly five two-point components: Catalog/rules, IR trace,
Behavioral proof, Peer and stack proof, and Executed delivery gates. The final
component remains 0/2 for every card in this campaign. Source assertions,
manual timing/subtrigger injection, synthetic stacks, and unexecuted tests are
scored conservatively in the applicable evidence component.

No tests, typecheck, lint, formatter, browser/UI check, focused gate,
mechanism gate, or collection gate was run as part of this static campaign.
One accidental `git diff --check` invocation in the BT25-061–070 child is
disclosed in that range report; it returned no output and does not constitute
the Executed delivery gates component. No other `git diff --check` was run.

## Per-set reconciliation

`Direct/indexed` counts production card modules and their explicit set-index
imports. Selective vanilla omissions are explained below.

| Set | Catalog cards | Direct/indexed | Range reports | Provisional score | Below 8/10 | Net corrections |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| BT1 | 115 | 115/115 | 12 | 911/1150 | 9 | 3 |
| BT2 | 112 | 112/98 | 12 | 895/1120 | 1 | 1 |
| BT3 | 112 | 93/93 | 12 | 896/1120 | 0 | 17 |
| BT4 | 115 | 115/115 | 12 | 920/1150 | 0 | 21 |
| BT5 | 112 | 112/112 | 12 | 895/1120 | 1 | 5 |
| BT6 | 112 | 112/112 | 12 | 896/1120 | 0 | 20 |
| BT7 | 112 | 112/112 | 12 | 896/1120 | 0 | 37 |
| BT8 | 112 | 112/112 | 12 | 896/1120 | 0 | 14 |
| BT9 | 112 | 112/102 | 12 | 896/1120 | 0 | 17 |
| BT10 | 112 | 112/106 | 12 | 896/1120 | 0 | 23 |
| BT11 | 112 | 112/112 | 12 | 896/1120 | 0 | 22 |
| BT12 | 112 | 112/112 | 12 | 868/1120 | 20 | 14 |
| BT13 | 112 | 112/112 | 12 | 885/1120 | 11 | 47 |
| BT14 | 102 | 102/102 | 11 | 808/1020 | 8 | 17 |
| BT15 | 102 | 102/102 | 11 | 816/1020 | 0 | 35 |
| BT16 | 102 | 102/102 | 11 | 808/1020 | 4 | 29 |
| BT17 | 102 | 102/102 | 11 | 813/1020 | 2 | 32 |
| BT18 | 102 | 102/102 | 11 | 811/1020 | 5 | 29 |
| BT19 | 102 | 102/102 | 11 | 705/1020 | 75 | 26 |
| BT20 | 102 | 102/102 | 11 | 728/1020 | 64 | 21 |
| BT21 | 102 | 102/102 | 11 | 762/1020 | 50 | 37 |
| BT22 | 102 | 102/102 | 11 | 717/1020 | 84 | 31 |
| BT23 | 102 | 102/102 | 11 | 727/1020 | 86 | 20 |
| BT24 | 102 | 102/102 | 11 | 731/1020 | 84 | 9 |
| BT25 | 104 | 104/104 | 11 | 797/1040 | 35 | 12 |
| BT26 | 104 | 104/104 | 11 | 765/1040 | 59 | 2 |
| **Total** | **2,792** | **2,773 direct** | **299** | **21,634/27,920** | **598** | **541** |

All 2,792 ledger rows are unique and sequential inside their set. The 299
range reports cover exactly the same 2,792 IDs, with no missing, duplicate, or
extra report coverage. Of the 2,792 cards, 598 score below 8/10 and 2,194 score
8/10; none earns 10/10 because the gate component remains zero.

The BT25 subtotal above corrects a report-only arithmetic inconsistency in
`docs/audits/BT25-STATIC-AUDIT.md`: its 69 cards at 8/10 and 35 cards at 7/10 total
797/1040, not 798/1040.

## Module, index, and registration coverage

There are 2,773 direct BT production modules. Every one registers executable
behavior through `registerIrCard`; none of those audited production modules
uses `registerCard`. The only extra IR registration inside a direct module is
the intentional `TOKEN-Petrification-Token` registration beside BT24-017.
Legacy `registerCard` occurrences remain outside audited production modules in
compatibility/internal engine seams and test stubs, including BT15-041 and
BT22-092 test fixtures.

The 19 catalog cards without direct modules are exactly these BT3 vanillas:

`BT3-007`, `BT3-009`, `BT3-020`, `BT3-022`, `BT3-028`, `BT3-032`,
`BT3-037`, `BT3-038`, `BT3-044`, `BT3-045`, `BT3-053`, `BT3-059`,
`BT3-060`, `BT3-067`, `BT3-076`, `BT3-078`, `BT3-083`, `BT3-085`, and
`BT3-089`.

They have no `effectText`, inherited effect, or Security effect in the
authoritative catalog and have empty generated-effect snapshots. Their
catalog stats/evolution source assertions and range reports document the
intentional no-module boundary; they are not executable-behavior gaps.

Thirty additional vanilla modules are intentionally omitted from selective
set indexes: 14 in BT2, 10 in BT9, and 6 in BT10. The modules exist and are
IR-only, while every card with printed effect text has both its direct module
and required index import. These omissions therefore do not create missing
card behavior.

The read-only generated `packages/shared/src/effects/effects.json` snapshot
contains 2,688 IDs. Its 104 absent IDs are exactly BT26-001 through BT26-104,
whose executable authority is their direct compiled IR modules. The snapshot
was not edited by the BT26 campaign.

## Semantic correction reconciliation

The campaign integrated 541 net semantic corrections across BT1–BT26. The
per-set counts in the table sum to that total. Rejected intermediate edits and
their exact restorations do not count as corrections. In particular:

- BT26-051's temporary printed Link-effect removal was restored exactly and
  has zero net correction impact.
- BT26-101, BT26-102, and BT26-104 temporarily lost printed Security effects
  after the wrong catalog field was inspected. Their modules and assertions
  were restored byte-identically; the rejected chronology remains in Git and
  has zero net correction impact.
- BT26's two net corrections are BT26-004's generic hand-card payment and
  BT26-063's dedicated `[When Linking]` timing.

## Authority and historical documents

For current static status, this aggregate, the 299 range reports, and
`docs/audits/BT5-STATIC-AUDIT.md` through `docs/audits/BT26-STATIC-AUDIT.md` supersede older ledgers'
10/10, PASS, and collection-closeout language. BT1 through BT4 have no
separate `STATIC-AUDIT` file; their current range reports and this aggregate
are the static authority.

The following documents retain historical execution records and must not be
read as current campaign status: `docs/audits/BT5-AUDIT.md`, `docs/audits/BT5-AUDIT-LEDGER.md`,
`docs/audits/BT7-AUDIT.md`, `docs/audits/BT9-AUDIT.md`, `docs/audits/BT10-AUDIT.md`, `docs/audits/BT11-AUDIT.md`,
`docs/audits/BT13-AUDIT.md`, `docs/audits/BT14-AUDIT-LEDGER.md`, `internal-docs/audits/BT18.md`,
`internal-docs/audits/BT21.md`, `docs/audits/BT23-AUDIT.md`, `docs/audits/BT25-AUDIT.md`, and
`docs/audits/BT26-AUDIT.md`. The last already carries an explicit supersession banner.
Older BT1–BT3 ledger provenance names catalog blob `ef2e5b...`; current
reconciliation uses the immutable `efbecc...` blob stated above.

## Remaining delivery work

Static audit coverage and integration are reconciled for every
BT1–BT26 catalog card. Reproducible 10/10 evidence, green focused/mechanism/
collection tests, typecheck, lint/formatting, browser/UI validation where
applicable, and clean delivery-gate execution remain deliberately outside this
campaign. Until those gates are authorized and pass, no collection-complete
notification or Orca completed status is justified.

## Delivery record

The aggregate reconciliation and BT25 arithmetic correction were committed in
`2f0c31e2180256723b2abc3d67892b79f3cb5f80` and pushed normally to
`origin/audit-bt-card-by-card`. After removing an unrelated zero-byte,
untracked `direct` artifact that appeared during the audit, ordinary status
was clean; local HEAD and upstream were exact at that commit and divergence
was `0 0`.

Two Luna/xhigh reconciliation lanes independently confirmed the catalog,
report, module/registration, score, below-8, and correction totals using only
read-only inspection. They created no files or commits. No prohibited test,
typecheck, lint, formatter, browser/UI, focused/mechanism/collection gate, or
`git diff --check` was executed during reconciliation. This additive closeout
records delivery facts only and does not make a collection-complete claim.
