# EX9 Card Implementation Revalidation

## Scope and source of truth

This independent audit starts from immutable base
`53616a8e464dacbcb4e73dd31deb043ae59f88e0` on
`audit-ex9-card-by-card-20260904`. The committed catalog contains 74 contiguous
IDs, EX9-001 through EX9-074. All 74 direct modules and 74 colocated test files
exist. Three additional collection files, EX9-074.behavior.test.ts,
EX9-074.faceDown.test.ts and EX9.audit.test.ts, bring the current exact
collection inventory to 77 test files.
Every direct module registers IR; the inventory found no legacy
registration or RawUnparsed node. Structural presence is not a runtime score.

EX1 through EX8 were delivered separately. The remaining sequential scope is
EX9 (74 cards), EX10 (74), EX11 (74), and EX12 (77). EX10 through EX12 are not
started here. Earlier audit scores and green baselines are not adopted without
fresh catalog, local knowledge-base, IR and runtime review.

The user's subsequent scope extension adds LM, promotional cards and all starter
deck (ST) collections after EX12. Recalculate those groups from the catalog when
their turn begins; none is claimed reviewed or complete by this EX9 ledger.

## Work ownership and verification

The initial worker split assigned EX9-001..025, EX9-026..050 and EX9-051..073;
those assignments are historical, not current running-worker claims. The
coordinator owns EX9-074 and the subsequent sequential review follow-ups.
Each card is handled individually. The coordinator owns shared engine changes,
independent review, this ledger, effects synchronization and all Git staging,
commits and delivery. Workers never stage or commit shared worktree changes.

Focused command, substituting the exact card ID:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX9/EX9-NNN.test.ts --no-file-parallelism --pool=forks --maxWorkers=1 --reporter=dot
```

Behavioral evidence must use legal stacks and neutral peers, resolve decisions,
and explicitly assert final state. A settle predicate alone is not an assertion.
Inherited limits need real repeat-activation boundaries and duration expiry;
reveal routing needs an unrevealed anchor. Shared fixes require a red-capable
regression and scoped mechanism checks. Collection tests, typechecks, builds,
style, effects synchronization and independent review are closure gates, not
per-card repeated work.

## Current results

### Late serial follow-ups — current checkpoint, not collection closure

Final-candidate affected regressions: **8/8 files, 311/311 tests passed** in
3.46 seconds with one worker: assemblySkullGreymon, advancedKeywords,
retaliationOverflow, interpreter, interpreter/actions/play,
targeting/colorMatching, modifiers and stack. This consolidates the modified
mechanism test files without rerunning the entire engine suite. Independent
read-only review of all 34 changed engine files from the immutable audit base
through `f054a1a0b` returned **Ready, 0 Critical / 0 Important / 0 Minor**.
The reviewer inspected production call paths, added regressions and relevant
plans; it did not execute tests. This verdict covers the engine diff, not the
remaining ledger reconciliation or final collection delivery.

Dynamic collection (`vitest list src/cards/EX9 --json --staticParse=false
--maxWorkers=1`) independently enumerated 862 runtime cases: 850 in the 74
colocated card files plus EX9-074.behavior (7), EX9-074.faceDown (2) and EX9.audit
(3). Static listing's 663 declarations do not expand parameterized cases and
are not a runtime-test count. The passing exact run covers every enumerated case.

Current primary-file inventory (card suffix: passing runtime cases):

```text
001:9  002:8  003:5  004:4  005:9  006:7  007:3  008:4  009:4  010:5
011:2  012:13 013:3  014:6  015:3  016:6  017:3  018:16 019:3  020:4
021:6  022:2  023:3  024:10 025:4  026:10 027:15 028:13 029:11 030:18
031:15 032:3  033:7  034:5  035:5  036:9  037:13 038:16 039:12 040:9
041:15 042:19 043:22 044:18 045:22 046:6  047:9  048:6  049:12 050:12
051:16 052:12 053:14 054:13 055:23 056:20 057:20 058:10 059:12 060:12
061:16 062:21 063:23 064:18 065:13 066:20 067:19 068:21 069:17 070:25
071:18 072:16 073:17 074:10
```

Latest final-candidate collection rerun: **77/77 files, 862/862 tests passed**
with one worker (92.86 seconds, exit 0), superseding the failed consolidation
below. Web production build passed; Vite reported mixed static/dynamic imports
and large chunks. Shared/API builds passed during the effects verification.

Explicit outside-set effects exception: `f054a1a0b` adds only `position: bottom`
to BT8-084, matching the previously delivered module exactly (runtime deep equality
verified); focused BT8-084 passed 4/4. Every other record was preserved. A global
effects JSON formatting check reports preserved differences in BT25 records and
EX12-066/067/068; comparing formatter output by top-level record found no differences
in EX9 or BT8-084. No unrelated formatting rewrite was performed. The ledger still
requires final reconciliation, affected-regression consolidation and independent
review before push and coordinator completion notification.

Latest consolidation: catalog recalculated at 74 cards (EX9-001..074), all with
colocated tests. Exact collection run with one worker found 77 files / 862 tests:
860 passed and two old expectations failed in EX9-004/006. Both expected a visible
physical bottom to prohibit the printed bottom-face-down cost, contradicting the
Q4785 shared selection rule. Commit `0376df695` corrects those expectations and
uses legal visible egg sources; the two focused files passed 11/11 with API
typecheck and scoped style/diff checks. The final exact collection rerun is pending.

Effects commit `d1487361b`: all 74 EX9 runtime records synchronized, 62 semantic
changes against `53616a8e464dacbcb4e73dd31deb043ae59f88e0`, zero semantic or byte
changes outside EX9. `effects:check:set` passed after one formatter timeout;
shared/API builds passed as part of sync/check. The separately delivered BT8-084
module change still needs its explicitly scoped effect-record reconciliation.
These are consolidation results, not a collection completion or push claim.

The serial pass has reached EX9-074. The following fresh focused results replace
older per-card counts below; they do not replace the pending exact collection run.

| Card | Focused tests passed | Delivered commit |
| --- | ---: | --- |
| EX9-012 | 13 | `d5cc403c4` |
| EX9-018 | 16 | `7b02f270e` |
| EX9-026 | 10 | `730dda3af` |
| EX9-027 | 15 | `6a8eab673` |
| EX9-028 | 13 | `94927c71b` |
| EX9-029 | 11 | `db995b7d5` |
| EX9-031 | 15 | `959f43911` (Q4785 prerequisite `b79958a97`) |
| EX9-035 | 5 | `90685fc59` |
| EX9-036 | 9 | `ffe362794` |
| EX9-037 | 13 | `3c5735a69` |
| EX9-038 | 16 | `7e5bdfa6b` |
| EX9-042 | 19 | `94958c0e9` |
| EX9-043 | 22 | `700b85713` |
| EX9-044 | 18 | `aefea6919` (follow-up to `71d673fa8`) |
| EX9-045 | 22 | `373a8dc88` |
| EX9-063 | 23 | `cc88e297a` |
| EX9-064 | 18 | `988aa11a4` |
| EX9-065 | 13 | `910452fe2` |
| EX9-066 | 20 | `521cf073c` |
| EX9-067 | 19 | `931a4481c` |
| EX9-068 | 21 | `57d5c8174` (follow-up to `7b7f903e2`) |
| EX9-069 | 17 | `d60e97232` |
| EX9-070 | 25 | `b3b721b38` |
| EX9-071 | 18 | `343cc6336` |
| EX9-072 | 16 | `8a7343ea4` |
| EX9-073 | 17 | `4138e2988` |
| EX9-074 | 19 across three files | `78d803a3e` |

Independent reviews returned Ready for these late follow-ups. Focused affected
checks include EX9-063 + EX9-006 (30 tests), the play interpreter (4 tests),
EX9-073 + EX9-064 (35 tests), and EX9-074 + EX9-062 Assembly (40 tests).
The security shuffle face-down reset primitive passed its selected regression
(1 passed, 139 skipped). Scoped formatting, lint, diff checks and API typechecks
passed for the delivered changes. These are not final production-build evidence.

EX9-063 fixed optional-play preflight so its payable hidden-source cost can supply
the later trash candidate. Revealed nonmatching cards remain in trash. Later
changes above are test-only. EX9-074's Assembly implementation and catalog update
were delivered earlier with EX9-062 in `c35806b1b`.

Closeout is still open: old coverage concerns in earlier cards are being checked
against current runtime tests. EX9-027 has 15 focused tests reviewed and delivered.
EX9-042 has 19 focused tests, API typecheck and scoped style/diff checks passing;
its mixed-board failure was an old-Main-window fixture race, resolved by draining
turn startup before public play and asserting the real turn's draw. No engine or
card module change was needed. EX9-043's 22 focused tests, scoped style/diff checks
and the preceding API typecheck passed on its delivered test-only changes.
EX9-031 Q4785 was red with a visible bottom source and two hidden sources above it:
the shared selector incorrectly required the absolute stack bottom. Commit
`b79958a97` selects the first hidden source only for bottom-plus-face-down filters,
preserving ordinary bottom semantics. Public card proof passed 9/9 and the complete
interpreter file passed 204/204 (213 combined in 2.94 seconds); the new selector
regression was red before the fix. Full shared/API/web typecheck and scoped
format/lint/diff checks passed. Follow-up `959f43911` proves Q4786 through real
security checking: Hammer Spark changes memory 3 to 1, Harpymon's active-player
effect changes it to 2, then the defending Etemon inherited target choice opens.
It also proves shared digivolve/attack recovery use with a second payable source.
The exact Sukamon route was red for PlatinumSukamon and is corrected with
`namesExact`; independent off-color Sukamon and DM positives remain green.
Focused EX9-031 passed 15/15, shared requirements 106/106, full shared/API/web
typecheck and scoped style/diff checks passed. Effects sync is still pending.
Remaining earlier review notes require reconciliation; no collection verdict is implied.

EX9-044 follow-up `71d673fa8` passed 17/17 focused tests. Q4798 now uses a
public play and explicitly resolves the pre-payment and post-On-Play optional
decisions before testing restriction expiry. DNA refusal preserves both materials,
the hand candidate and the deck; non-WG own-turn and WG opponent-turn effect plays
leave a legal DNA pair unchanged. Scoped formatting/lint/diff checks passed and an
API typecheck passed during this test-only follow-up. Follow-up `aefea6919` passed
18/18 (1.99 seconds), scoped style/diff checks and API typecheck. A real off-color
WG evolution triggers the first DNA using separate neutral level-6 materials;
the same Hydramon stays in play. A later WG effect play cannot trigger another
DNA despite a second legal pair and EX9-045 remaining available. Deck, memory,
materials and optional-decision count are unchanged, proving shared use across
the two event timings.

EX9-045 follow-up `373a8dc88` passed 22/22 (2.05 seconds), API typecheck and
scoped format/lint/diff checks. Real normal and DNA evolutions both play an eligible
WG while preserving an over-cost WG and a non-WG hand card; only DNA returns the
two opponents below an unrevealed anchor. Mandatory evolution draws are explicit.
The leave-play response lets the original WG leave, cannot repeat for a second WG
with a second eligible hand card still available, rejects non-WG and battle losses,
and preserves the candidate on explicit refusal. No card module changed.
Collection-wide inventory, effects, final gates and independent closeout remain open.

EX9-018 and EX9-037 now group their optional placement costs with all following
actions, preserving continuations after successful payment even when the first
operation is a no-op. EX9-038 additionally limits its restriction to the next
opponent unsuspend phase, permitting effect-driven unsuspension. Their focused
comparison passed 45 tests across three files. EX9-028's repeat-use proof re-exposes
the same Nanimon through De-Digivolve, with another payable cost and legal evolution
still available. Full shared/API/web typecheck and scoped style/diff checks passed
for these changes. Effects records remain pending synchronization. The listed
commits are local audit evidence; final push/remote verification remain open.

The coordinator must reconcile the historical ledger, synchronize effects
(including explicit outside-set exceptions), run the final exact collection and
affected mechanisms, finish type/build/style gates, obtain final review, commit,
push, verify the remote and notify Orca/coordinator. None of those collection-wide
completion steps is claimed by this checkpoint. The full queue remains
EX9 → EX10 → EX11 → EX12 → LM → Promo → all STs.

### 2026-09-05 consolidation checkpoint (not final closure)

The latest completed exact collection run passed 77 files / 562 tests before
the subsequent focused additions below. Do not use that historical total as
the current final inventory. The older table and checkpoint paragraphs below
remain historical evidence and require reconciliation before closeout.

Delivered focused follow-ups include EX9-008 (4 tests, `adda9a19a`), EX9-012
(5, `bc5295cd4`), EX9-015 (3, `4d07929ac`), EX9-016 (6, `6c63351ca`),
EX9-018 (5, `b889a41c5`), EX9-024 (10, `c3fd9b789`), EX9-026
(6, `7c110826c`), EX9-027 (6, `c03fedf9f`), EX9-028 (6, `e45652def`),
EX9-045 (9, `f4a9dfd49`) and EX9-054 (12, `5e33ed425`). These counts are
passing focused tests, not blanket 10/10 fidelity verdicts. EX9-028 required
`payCost: true`; its former EX9-063-only positive hid missing payment through
that target's intrinsic reduction. EX9-064 exposed memory 5 instead of 2.

The effective-color correction is delivered in `0bf219aa0`, and mandatory
seven-color selection in `c9c5aad71`. Related focused color evidence is
5 files / 28 tests. The BT8-084 peer module change is an explicit outside-set
exception requiring separate effects synchronization accounting.

Raid declaration eligibility remains an uncommitted engine correction:
EX9-001 Q4751/Q4752 reproduced retroactive inherited Raid activation. Capturing
eligibility at declaration passes EX9-001, EX9-008 and advanced keyword tests
(3 files / 38 tests); API typecheck passed. Independent review requested an
additional source-departure regression, which is still being validated.
EX9-006 proof strengthening is also in progress. No final collection score,
effects synchronization, full final gates, push or completion notification is
claimed at this checkpoint.

### Historical checkpoints

No card is claimed complete from the initial inventory. Dependencies installed
offline from the existing cache with the frozen lockfile, without tracked
changes. The initial shared build passed.

Checkpoint: EX9-026..050 worker reports 25 focused files / 108 tests green;
independent stack-fidelity review remains open. EX9-051..073 reports 22 files
fully green and EX9-054 at 6/7, exposing loose free-play scaled level filtering;
its scoped fix is in progress. These are progress reports, not final scores.

EX9-074 Q5003 and Q5005 were reproduced independently: white survived despite
six source colors, and preferring a red/blue target left a red target alive.
Both failed before the per-color matching correction and passed afterward.
Current consolidated root check: four files / 19 tests green (primary 9/9,
six-color behavior 3/3, face-down regression 2/2, color-matching mechanism 5/5).
Runtime tests now use real play and normal
digivolution, including a legal DNA-derived source stack. Rush, two security
checks, source placement, source-color DP, refusal and ineligible trash are
asserted. Face-down source information (CR 4-6-9) has a red/green regression
and corrections in scaling, condition evaluation and source-color matching.
No EX9-074 final score is claimed until remaining review and shared gates pass.

| Card    | Fresh result                                   | Evidence / unresolved work                                                                                                                                                                                                                                                                                              |
| ------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX9-001 | OPEN: 2/4                                      | Two inherited evolution positives fail; dispatch investigation active                                                                                                                                                                                                                                                   |
| EX9-002 | Focused 7/7                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-003 | Focused 5/5                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-004 | Focused 4/4                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-005 | Focused 9/9                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-006 | OPEN: 2/3                                      | Inherited evolution positive fails; dispatch investigation active                                                                                                                                                                                                                                                       |
| EX9-007 | Focused 3/3                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-008 | OPEN: structural 1/1                           | Runtime proof missing                                                                                                                                                                                                                                                                                                   |
| EX9-009 | Focused 4/4                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-010 | Focused 5/5                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-011 | Focused 2/2                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-012 | Focused 4/4                                    | Neutral legal BT5-069 replaces active AD1-004 fixture; final gates pending                                                                                                                                                                                                                                              |
| EX9-013 | Focused 3/3                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-014 | Focused 6/6                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-015 | OPEN: structural 1/1                           | Runtime proof missing                                                                                                                                                                                                                                                                                                   |
| EX9-016 | OPEN: structural 1/1                           | Runtime proof missing                                                                                                                                                                                                                                                                                                   |
| EX9-017 | Focused 3/3                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-018 | Focused 4/4                                    | Legal trash fixture corrected; final fidelity/gates pending                                                                                                                                                                                                                                                             |
| EX9-019 | Focused 3/3                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-020 | Focused 4/4                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-021 | Focused 6/6                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-022 | Focused 2/2                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-023 | Focused 3/3                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-024 | Focused 5/5                                    | Duplicate optional wrapper removed; legal ST10-10 inherited accepted/refused attacks; final gates pending                                                                                                                                                                                                               |
| EX9-025 | Focused 4/4                                    | Worker review green; final fidelity/gates pending                                                                                                                                                                                                                                                                       |
| EX9-026 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-027 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-028 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-029 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-030 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-031 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-032 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-033 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-034 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-035 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-036 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-037 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-038 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-039 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-040 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-041 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-042 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-043 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-044 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-045 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-046 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-047 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-048 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-049 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-050 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-051 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-052 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-053 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-054 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-055 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-056 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-057 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-058 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-059 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-060 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-061 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-062 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-063 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-064 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-065 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-066 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-067 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-068 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-069 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-070 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-071 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-072 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-073 | Pending                                        | Fresh audit required                                                                                                                                                                                                                                                                                                    |
| EX9-074 | OPEN: 14/14 card tests; 5/5 matching mechanism | Red/green fixes for missing seventh color, invalid multicolor choices and face-down color information. Primary 9/9, behavior 3/3, face-down 2/2. Public play/Rush/security checks, legal normal evolution and DNA-derived six-color source stack now exercised. Independent fidelity review and final gates remain open |

## Delivery status

Consolidated blocks: EX9-030 payment `ea5a739bc` (18/18, selected payment
mechanisms 21/21); dynamic play level ceilings/EX9-054 `f7856f4ad` (11/11
card plus 4/4 helper tests); Training (15/15 EX9-051 plus 10/10 builders).
Payment review's proposed BT1-051 legality blocker is disproved by EX9-030's
printed Yellow level-four cost-four route; Machine/DM is an alternative.
Training independent review is clear, including newly added field/breeding
second activation after unsuspend (no intrinsic Once Per Turn cap).

Color review remains OPEN: BT8-084 focused reproductions are 2 pass / 2 fail.
Hidden source colors leak into `selfAndDigivolutionCardColors` and
`hasAllDigivolutionColors`; opponent-turn color accounting also overcounts the
turn-gated grant. The exact bottom-placement assertion is now present. No
color-block completion or final collection claim is made from the prior checkpoint.

EX9-030 payment consolidation found and fixed a face-down-security lookup gap:
the exact selected origin instance now reaches the would-be-played hook without
including hidden security in general timing scans. The new faceUp=false
comparison failed before this change; focused file now passes 18/18. Selected
play-action/primitive regressions pass 21/21 (147 skipped). API typecheck and
scoped lint/format/diff pass. Payment block is pending independent review and
atomic delivery; Training and color blocks are independently under review.

Latest collection checkpoint: **77/77 files, 558/558 tests passed** in 9.24s.
This is not set completion: pending shared-change review/atomic delivery,
effects synchronization and final gates remain. EX9-003 `d9af9120b` resolves
real unrelated decisions and preserves legal-stack OPT payment proofs.
EX9-013 `5f1917164` asserts the full Alter-S End of Attack lifecycle (materials
return to play, Alter-S enters security), replacing its obsolete final-state
expectation. Four-file focused regression was 32/32 before collection.

The imminent-play selector exclusion now applies at the common result boundary.
Five new red/green zone cases pass with ordinary no-trigger controls; selected
candidate tests 11/11, EX9-030/057 27/27, API typecheck green. Independent
read-only review found no actionable regression. Broader payment integration
remains separate and open.

Collection checkpoint (not a final gate): exact `src/cards/EX9` run completed
77 files / 558 tests in 10.33s: 555 passed, 3 failed (EX9-003, EX9-013,
EX9-074). EX9-073 was green. EX9-074 was order-dependent: isolated test lacked
the registered EX9-008 inherited Raid; after the full registry loaded,
autoSelectCards accepted its redirect instead of checking security. The local
test now imports the registry and explicitly submits an empty Raid selection,
then proves both checks and the untouched opposing Blue Digimon. Focused
EX9-074 is 10/10; edits remain with its pending shared-color changes.
EX9-003/013 are assigned for focused diagnosis; final collection remains open.
The EX9-013 `s.ready()` follow-up was insufficient: combined EX9-073/013/074
still fails 013 (26 pass / 1 fail), while 074 is now green under the full
registry. Further order-dependent decision diagnosis remains assigned.
Read-only payment review also found the imminent-card exclusion missing from
direct stack/under-Tamer/linked candidate loops; production proof is pending.

EX9-073 placement boundaries delivered in `8b08d971c`: focused 14/14.
EX9-010 isolates the level gate (Ver.5 but level four), BT1-038 isolates
the trait gate (level-five Puppet), and public refusal preserves eligible
EX9-041 in trash without executing its borrowed suspension. The selected
EX9-064 Q4824 real self-deletion-prevention case passes 1/1 (14 skipped).
API typecheck passed; scoped lint/format/diff clean.

EX9-073 Q4841 delivered in `115090d60`: focused inventory
11/11. The initial reproduction was 10 pass / 1 fail. A real attack places Ver.5-only EX9-041
from trash. BT20-037's When Digivolving timing installs an On Play prohibition;
the public observer confirms it remains active before and after placement,
but before the fix EX9-041's borrowed On Play still suspended the opposing
Digimon. Both comparative cases now pass. `collectForeignCandidates` in
`actions/borrowed.ts` omits host permanent identity for stack cards, whereas
`availableBorrowedEffects` only checks timing disables when sourcePermanentId
is present. The fix passes the stack host separately for timing checks without
changing lender registration, usage or conferral identity. EX9-073 plus EX8-054
and BT15-102 pass 3 files / 23 tests; selected battle-area/security borrowers
pass 3 files / 11 tests (17 skipped). API typecheck passed. Independent
read-only review found no actionable regression; scoped lint/format/diff clean.

Other new EX9-073 proofs are green: real battle Q4842 accepts two hidden,
mixed hidden/Cyborg and two Cyborg sources; explicit public refusal allows
deletion. The prior synthetic On Play proof now uses a real hand play and
asserts the borrowed deletion result. Scoped formatting/lint/diff clean.

EX9-072 lifecycle follow-up: 15/15 focused tests passed. Real checking removes
File Island's DP bonus, while face-up sources, non-DM and opponent Digimon
are excluded. Security candidates independently reject over-cost DM EX9-013
and cheap non-DM BT1-009. The selected shuffle-security primitive test passes
1/1 (139 skipped), confirming face-up security is hidden by shuffling.
API typecheck and scoped lint/format/diff checks passed.

EX9-073 first public shared-timing follow-up: 5/5 focused tests passed.
EX9-030 to EX9-073 explicitly selects the DM alternate route (cost three),
draws, places EX9-011 and executes its On Play source placement. A subsequent
real attack retains a second eligible candidate (shared Once Per Turn) and
performs two security checks from EX9-011's inherited keyword. Q4841/Q4842,
independent Ver.5 placement and further refusal proofs remain open.

EX9-071 boundary follow-up `8d074abb7`: 18/18 focused tests passed. Q4834
uses independent off-color DM Digimon/Tamer/breeding positives and non-DM,
opponent and face-up-security negatives. Delay pays exactly the bottom two
hidden sources while preserving a third; wrong controller, wrong trait,
split-host and face-up costs do not offer activation. API typecheck passed;
scoped lint/format/diff clean. No card module or engine changes.

EX9-072 focused inventory is now 12/12. Public attack checks a face-up File
Island and explicitly accepts or declines its Security effect. Positive cases
play a cost-five DM Digimon independently from hand/trash and a DM Tamer;
all preserve memory, finish combat and put the checked Option in trash.
An own face-up security card blocks the off-color waiver. Other DP lifecycle
and candidate-filter boundaries remain under review; no full-card closure yet.

EX9-070 reducer-combination follow-up delivered in `c8bb7297b`: 25/25 pass,
including Q4939 payment of one. Initialized BT22-076 public evolution now
pays three (4/4 peer file). Matching live IR intrinsic-reduction provenance
prevents duplicate application of GameEngine's shared fallback. The combined
three-file run passed 56/56; the subsequent fixed/increasing-cost guard test
passed with the modifier file at 28/28 (current focused inventory: 57 tests).
API typecheck passed. Scoped lint has four pre-existing warnings: one
underscore name, two shadows and the peer's explicit any; no new warnings.
Multiple physical reducer copies in hand remain a separately documented risk,
not a claimed complete BT22-076 audit.

EX9-071 refusal follow-up delivered in `2e5d58ab8`, focused 8/8. Public
respondDecision(false) clears the pending choice, leaves both hidden sources
and suspension unchanged, and trashes only Protein. Scoped style/diff clean.
Other clause boundaries and final collection gates remain open.

EX9-070 follow-up: 18/18 passed; Q4741/Q4749 now use actual attacks with
legal Red inherited stacks and available Meat hand candidates. The pending
reaction rejects Delay without consuming it, and the attack evolves for one
memory and completes its security check. Q4742 uses public Training on a legal
Blue EX9-015/EX9-002 stack and found missing paid evolution in EX9-002 too.
EX9-002 corrected in `b87074c51`, colocated 8/8 tests passed; EX9-070 timing
proof in `29f9be1c1`. Combined 2 files / 26 tests and API typecheck passed;
scoped formatting/lint/diff checks clean. Remaining EX9-070 follow-ups are
additional linked reducer combinations, not these three timing rulings.

EX9-070 earlier focused checkpoint: 15/15 passed. A cost-four real effect evolution
revealed missing `payCost: true`: the module evolved for free instead of
paying one after Meat's two-memory reduction and EX9-063's one-card Ver.4
reduction. Corrected only the card IR. Q4831 rejects a second activation while
the first decision is pending; the second established, effect-placed Meat stays
on the field. Initial apparent second-copy deletion was a Board Spec provenance
error, independently confirmed as mandatory cleanup of an Option with
`placedByEffect: false`, not a second engine defect. Q4832 now uses independent
off-color DM Digimon/Tamer and breeding positives plus own non-DM/opponent DM
negatives. Refusal preserves hand/host after Delay's own trash; newly played
Meat has no same-turn Delay ability. EX9-070/063: 2 files / 33 tests passed;
API typecheck and scoped style/diff checks passed. Linked attack-window rulings
and additional reducer combinations remain follow-up audit work.

EX9-069 focused checkpoint: 15/15 passed. Q4830 explicit public ordering
reproduced an engine defect: after the first derived effect, its remaining
sibling was offered together with the older pending start-main effect. Two
minimal stack tests reproduced the wrong order for both controller seats.
Persistent activation tiers now preserve each derived batch until it drains,
including a regression for nested derived batches. Real Training proves
Q4829 breeding exclusion, Q4978 refusal, and exact 7/8-card draw boundaries.
Reboot actually unsuspends both DM and non-DM hidden-source hosts during an
opponent turn, excludes a face-up-only host, and disappears on the owner's turn.
EX9-069, stack, timing conformance and retaliationOverflow: 4 files / 74 tests
passed; API typecheck and scoped formatting/lint/diff checks passed. Independent
read-only review returned Ready with no concrete findings, including reentrancy
and cancellation inspection. No collection closure or push is claimed here.

EX9-067 focused checkpoint: 17/17 passed; commit `210521cb9`. Real evolution
with two Mirai copies reproduced an illegal play of non-Puppet/non-Arisa
BT1-048. The module incorrectly used a union with an unconstrained primary
controller predicate; replacing `orFilters` with required `or` alternatives
fixed the public regression without changing the engine. Q4827 independent
Puppet and Arisa plays retain a single three-memory discount; refusal,
non-Puppet evolution and independent search branches with deck-bottom anchors
pass. Focused peer regression EX9-032/033/067: 3 files, 27 tests passed. API
typecheck and scoped formatting/lint/diff checks passed; debug logs removed.

EX9-068 focused checkpoint: 19/19 passed, test-only. Independent real Cyborg,
Machine and DM plays prove suspend, draw, memory and face-down placement.
Q4828 refusal and already-suspended cases preserve hand/deck and prohibit
placement. Explicit public decisions accept suspension then decline placement,
retaining mandatory draw and memory. Cost-six Cyborg, cost-seven nonmatching
trait and opposing play negatives pass. Start-turn memory tests cover 0/2/3/4.
API typecheck and scoped formatting/lint/diff checks passed. These checkpoints
do not close EX9 or replace its remaining collection/review/delivery gates.

EX9-066 focused checkpoint: 20/20 passed, test-only. Real Tamer plays independently
recover Greymon/Garurumon/Omnimon name branches without drawing; Q4825 explicitly
declines an available recovery and still draws exactly one card. Public Digimon
plays cover neither/Greymon-only/Garurumon-only/both memory conditions and an
opponent-play negative. Public evolution covers accepted suspend, explicit
decline and already-suspended failure: Q4826's trailing memory is unavailable
without payment. Scoped formatting/lint/diff checks passed. Collection closure
and independent review remain pending.

EX9-065 Retaliation correction: 10/10 card tests now pass. Combat first resolves
all prevention, snapshots the sole deleted Retaliation holder and its battled
opponent, then exposes the mandatory reaction through the normal On Deletion
collector. The victim is deleted by the ordinary effect primitive, not appended
to the simultaneous battle-deletion list. Explicit orderTriggers tests prove both
orders with the holder's printed On Deletion effect. An outside-battle inherited
effect regression uses Falcomon/Pinamon to prove effect provenance
(opponent hand trash and memory gain), and only one Retaliation triggers even
when its victim also has the keyword. Retaliation/Overflow 7/7 passed; advanced
combat keywords 25/25 and the separate keywordBattle/context/EX9-065 run 46/46
passed. Debug probes were removed. Final independent review and broader collection
gates remain pending; this supersedes the red checkpoint below.

EX9-065 remains RED: the retained real-battle Scapegoat/Retaliation interaction
shows Titamon surviving by sacrificing BT1-009 while the opposing 15000-DP
BT1-024 is incorrectly deleted. CR 16-13 requires the Retaliation holder to be
deleted in battle. `combat/controller.ts` currently adds Retaliation's victim
before Armor Purge, Fragment, Scapegoat and generic card prevention settle.
Do not mask this with a post-hoc victim filter: that would still offer/pay
prevention costs for a Retaliation deletion that never should have triggered.
The retained case must guide a correctly ordered resolution change and affected
combat regression. No combat code was changed in this checkpoint.

Other new EX9-065 proofs cover a Ver.4 ally's losing block followed by Retaliation,
own/opponent/trait aura boundaries and removal of grants after Titamon leaves,
explicit On Play refusal, and public Blast Counter evolution onto an off-color
DM level five, filtered free play, mandatory draw and subsequent blocking.
The first Blast fixture used EX9-037, whose On Play consumed the drawn card;
replacing it with EX9-010 isolates the mandatory-draw proof. This was a fixture
interaction, not a missing evolution draw.

EX9-064 focused checkpoint: 15/15 passed. Independent Cyborg-only and Ver.4-only
hand payments reduce real play by exactly 2; Q4823 effect-driven free play still
pays the optional trash with unchanged memory. Explicit decline preserves both
payment zones and the opponent. Independent off-color Cyborg/DM evolution and
nonmatching rejection assert cost, mandatory draw, bottom placement and scaled
deletion of cost-5/6 opponents while cost 7 survives. Two actual attacks prove
the inherited once-per-turn limit with another lowest-level target still present.
Q4824 uses a legal Machinedramon/Megadramon stack and two bottom face-down cards:
the inherited effect unsuspends, then the host pays its own prevention and remains.
No EX9-064 module change; scoped formatting/lint/diff check passed.

EX9-063 follow-up focused inventory is now 18/18. Real evolution followed by a
real attack proves the shared once-per-turn free-play boundary while a second
legal trash target and another payable face-down source remain. Independent
non-DM cost-4 and DM cost-5 decoys remain in trash. Another real attack rejects
payment from a face-up own source and a different Digimon's face-down source.
Scapegoat battle cases cover acceptance, explicit empty-card selection refusal,
and no ally. Scapegoat uses a min-zero selection, not an optional boolean;
autoDeclineOptional alone is not refusal evidence. Selected keyword regression
3/3 passed (combined 21/21; 22 unrelated tests skipped).

EX9-063 incoming-evolution reducer was genuinely inactive: public Ver.4 evolution
with 1, 2 or 5 face-down sources always cost 4. Adding EX9-063 to the verified
intrinsic digivolution-reducer registry enabled the existing source-stack scaling
and excluded its marker from ordinary field effects. Focused 13/13 passed,
including zero-source/full-cost, cost-floor zero, non-Ver.4 name-only Nanimon,
and an already-played Digitamamon not discounting another incoming card.
BT17-048 and EX5-012 affected peer tests passed (9/9; combined run 22/22).
Inherited Alliance now uses a legal purple level-six host, survives a 15000-DP
security battle, checks twice and restores base DP after combat. Card remains
open for remaining clauses and collection closeout; one existing conditional
expect lint warning remains in its timing-parameterized test.

Root verification supersedes the worker Collision report: CR 16-30 grants
Blocker and forces blocking when possible; it does not allow selecting an
unsuspended Digimon as the attack target. EX9-047 now proves rejection of that
direct target, a player attack opening a mandatory block window for a printed
non-Blocker, rejected decline, accepted block, battle deletion and untouched
security. Card 7/7 plus selected Collision mechanism 4/4 passed (8 unrelated
mechanism tests skipped); no engine change was needed.

Root retained Q4815 batch-deletion tests in EX9-056. Both two other Ver.3 Digimon
and a three-Digimon batch including HiAndromon itself survive for one security
payment, with exact final battlefield/security/trash assertions. EX9-056 9/9
passed in the current tree. The earlier worker deletion report is not reproduced
by these cases and does not justify a speculative engine patch.

Security-origin payment follow-up: Q4784 was reproduced through the dedicated
`playFromSecurity` primitive with the source revealed face up. Without the
zero-base finalization call, the optional payment remained in hand; restoring
the call passed the case. EX9-030 reached 17 focused tests; combined with the
selected play primitives, 33 passed and 124 unrelated tests were skipped.
The security route retains its existing entry/removal buses and relocates the
selected instance by identity after the asynchronous payment window. A narrow
advance-surface verb exposes that production route without private reach-through.
Face-down security/deck lookup remains outside this proof.

Worker reports requiring root reproduction, not closure: EX9-056/Q4815 batch
deletion reportedly prevents only one of two Ver.3 deletions; EX9-047 Collision
reportedly rejects an unsuspended Digimon target. Neither reproducer was retained
by its worker. Reconstruct them before accepting or rejecting these findings.
Two worker refusal tests used nonexistent `EffectTiming.WhenAttacking` and thus
gave invalid no-op evidence; root replaced them with public attack intents and
explicit pending-decision/suspension assertions in EX9-059/060.

EX9-030 focused checkpoint: 16/16 passed. New public-intent proofs cover
normal yellow level-four evolution (cost 4), the mandatory evolution draw,
face-down placement below the original source, DP reduction persisting through
the controller's turn and expiring after the opponent's turn, and explicit
refusal of both optional costs during real play. The preceding API typecheck
completed successfully. This is not card or collection closure.

Independent payment review leaves two shared-route risks open for reproduction:
pending-card exclusion currently covers loose-zone collection but not direct
stack/linked enumeration; free Security self-play uses `playFromSecurity`, not
the newly updated `playInstances` route. A further source-zone relocation risk
was reported without reproduction. Hand-size conditions read the actual hand
array, rather than the loose-card candidate helper. Do not claim these routes
verified from EX9-030's hand-origin proof.

Training follow-up: the breeding-area regression is now green. Registration
appends an explicitly breeding-scoped Training counterpart, preserving the
original Main key. Main-ability projection now includes the breeding permanent;
ordinary activated abilities remain excluded there. A BT11-061 comparative
runtime test asserts both hidden availability and rejected direct activation.
EX9-051 focused: 13/13; affected builders: 10/10; API typecheck, scoped style
and diff checks passed. These supersede the Training red checkpoint below.

Further focused checkpoint: EX9-051 now has real On Play, attack payment and
refusal, no-hand failure, legal inherited Blocker combat, and off-color DM
evolution/rejection proofs. Its Training test exposed top-versus-bottom routing:
`trainingActivatedEffect` lacked `position: "bottom"`. Adding the explicit
position passed 11/11 card tests and the selected CR Training mechanism (1/1,
29 unrelated cases skipped). A subsequent CR 16-41 breeding-area variant is
red because no activated Training ability is projected there. Keep EX9-051
open; do not discard this required breeding exception to retain a green score.

EX9-074 primary DP lifecycle/source-removal extension passed 10/10. Independent
review identified effective opponent colors in both deletion branches and
requested executable provenance for the six-color stack plus a public-choice
assertion. Those follow-ups are assigned; the earlier 19-test checkpoint is
not the final closure inventory.

In progress. No collection completion, runtime 10/10 total, final commit or push
is claimed yet. Upon full verified completion the coordinator must update the
Orca worktree status and notify the parent coordinator before becoming idle.
