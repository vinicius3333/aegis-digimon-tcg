# BT14 Static Card Implementation Re-audit

Status: static card-by-card coverage 102/102; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT14-001` through `BT14-102`, derived from
`packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT14/` and integrated here only
after review. The historical `internal-docs/audits/BT14.md` report
is prior evidence only; every card must be re-read against the immutable
catalog, current KB, direct module, shared runtime, and behavior-driving source.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT14-001–010 | Reviewed | `internal-docs/audits/BT14/BT14-001-010.md` | Yes |
| BT14-011–020 | Reviewed | `internal-docs/audits/BT14/BT14-011-020.md` | Yes |
| BT14-021–030 | Reviewed | `internal-docs/audits/BT14/BT14-021-030.md` | Yes |
| BT14-031–040 | Reviewed | `internal-docs/audits/BT14/BT14-031-040.md` | Yes |
| BT14-041–050 | Reviewed | `internal-docs/audits/BT14/BT14-041-050.md` | Yes |
| BT14-051–060 | Reviewed | `internal-docs/audits/BT14/BT14-051-060.md` | Yes |
| BT14-061–070 | Reviewed | `internal-docs/audits/BT14/BT14-061-070.md` | Yes |
| BT14-071–080 | Reviewed | `internal-docs/audits/BT14/BT14-071-080.md` | Yes |
| BT14-081–090 | Reviewed | `internal-docs/audits/BT14/BT14-081-090.md` | Yes |
| BT14-091–100 | Reviewed | `internal-docs/audits/BT14/BT14-091-100.md` | Yes |
| BT14-101–102 | Reviewed | `internal-docs/audits/BT14/BT14-101-102.md` | Yes |

## Score model

Each card is scored across five 2-point components:

1. **Catalog and rules (0–2):** identity, printed contract, local KB,
   rulings, errata, restrictions, and ambiguities.
2. **IR trace (0–2):** every clause maps to direct compiled IR and real shared
   primitives, with exclusive `registerIrCard` registration.
3. **Behavioral proof (0–2):** positive, negative, boundary, optionality,
   cost, zones, duration, Security, and once-per-turn source cases as
   applicable.
4. **Peer and stack proof (0–2):** relevant comparative trait/name/color
   cases and realistic evolution-stack behavior.
5. **Executed delivery gates (0–2):** focused/mechanism/collection tests,
   typecheck, repository quality gate, and `git diff --check` have passed on
   the delivered commit.

This static pass can award at most provisional 8/10 because component 5 is
deliberately unexecuted. Unsupported or ambiguous behavior may reduce any
other component and is never rounded up. Structural-only assertions do not
receive full behavioral credit unless they drive the relevant production
behavior.

## Card ledger

| Card | Catalog and rules | IR trace | Behavioral proof | Peer and stack proof | Executed gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT14-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opposing-security removal and inherited Once Per Turn proof |
| BT14-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inclusive source-count erratum and live Jamming boundary proof |
| BT14-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural recovery-origin security addition and inherited draw proof |
| BT14-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural own-effect suspension plus foreign-cause rejection proof |
| BT14-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Exact-three trait cost, refusal, and Once Per Turn attack proof |
| BT14-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural hand-trash origin, exact card identity, cost, and breeding boundary |
| BT14-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Tai-gated free Greymon evolution and inherited name aura proof |
| BT14-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack, 3000-DP boundary, target count, and inherited stack proof |
| BT14-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Effect-play prohibition, breeding-placement seam, and legal stack proof |
| BT14-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Security-only Jamming boundary and legal evolution-stack proof |
| BT14-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Blocker declaration, redirection, suspension, and battle proof |
| BT14-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Alternate evolution, Tai attack branch, and inherited name aura proof |
| BT14-013 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural main-phase reducer; inherited end-of-turn edges retain timing seams |
| BT14-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | On Play/evolution deletion, Blast Digivolve, and Overflow proof |
| BT14-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural repeated attacks prove exact DP boundary and inherited OPT |
| BT14-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Raid selection, eligibility, tie peer, and decline proof |
| BT14-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2381 token RestrictPlay correction and natural Goldramon proof `20910491e` |
| BT14-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural token creation, replacement destinations, recovery, and X-stack proof |
| BT14-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent attacks, bottom-two ordering, partial count, and OPT proof |
| BT14-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural main-phase unblockable branch and Gomamon deletion replacement proof |
| BT14-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural effect/battle Evade, refusal, suspension, and evolution proof |
| BT14-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Any-source trash, re-evaluated return target, and public evolution proof |
| BT14-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inclusive erratum, pooled source trash, snapshot, and inherited proof |
| BT14-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent attacks, bottom-two inherited trash, and public stack proof |
| BT14-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Effect/battle Evade, refusal, suspended cost, and legal stack proof |
| BT14-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2394 pooled sources, Blast Digivolve, return, and Overflow proof |
| BT14-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2395 both-player level-3 return and legal evolution proof |
| BT14-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Blocker, source-triggered battle protection, Security, and Retaliation proof |
| BT14-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Errata diagnostic correction and equal-count/pooled-trash proof `c29f00cf1` |
| BT14-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2400–Q2404 routing, recovery, and both evolution-color proofs |
| BT14-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural inherited attack, DP duration, and Once Per Turn stack proof |
| BT14-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2405/Q2406 security transfer, optional placement, and inherited deletion proof |
| BT14-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural turn-machine start-main evolution, shuffle, ordering, and security-add proof |
| BT14-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Security battle/deferred play and inherited deletion-stack proof |
| BT14-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Barrier acceptance/refusal and legal Patamon evolution proof |
| BT14-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public evolution plus natural inherited attack/Once Per Turn proof |
| BT14-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2411/Q2412 recovery scaling, Blast Digivolve, and Overflow proof |
| BT14-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2413 Security ordering, alternate evolution, and both deletion-placement paths |
| BT14-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Alternate evolution, placement cost, Armor Purge, and inherited Security Attack proof |
| BT14-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Tamer placement/play distinction, free level-3 play, and Once Per Turn proof |
| BT14-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2414 natural recovery/add-security origin, DP reduction, and Security Attack proof |
| BT14-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, suspend cost, exact reveal, and decline proof |
| BT14-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2415 natural suspend-cost payment with and without a target |
| BT14-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural start-main aura, suspension penalty, and inherited evolution reduction proof |
| BT14-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural losing Security battle proves Jamming survival |
| BT14-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Tamer play reduction/Once Per Turn and inherited evolution proof |
| BT14-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Q2416 restriction installation and opposing unsuspend-phase proof |
| BT14-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural higher-DP attack evolution plus inherited Leomon DP proof |
| BT14-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Counter/Blast Digivolve, bottom-deck effect, and Overflow proof |
| BT14-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and opposing unsuspend-phase restriction proof |
| BT14-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent-turn end window, suspend cost, reveal, and decline proof |
| BT14-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal Leomon stack, natural suspension, and inherited DP proof |
| BT14-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Digimon/Tamer event-filter correction and natural Tamer suspension proof `2889861c8` |
| BT14-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Optional effect/mandatory attack correction and natural end-turn attack proof `c60169a23` |
| BT14-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural inherited Blocker declaration and redirection proof |
| BT14-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Leave-cause prevention correction plus natural reveal/replacement proof `2cbf62d48` |
| BT14-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural inherited Blocker and existing Save/PlaceUnder proof |
| BT14-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play/evolution placement, Rush, and inherited Blocker proof |
| BT14-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Missing Save placement correction plus natural Retaliation/Save proof `0925a97b6` |
| BT14-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural traited-Tamer attack play and inherited leave-play replacement proof |
| BT14-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play/evolution opponent-trash return and mandatory By-cost proof |
| BT14-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent Option deletion-immunity proof and cause boundary trace |
| BT14-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletion reveal/add/play and inherited Blocker proof |
| BT14-064 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural On Play and inherited deletion watcher; When Digivolving remains structural |
| BT14-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Opponent reveal/top-or-bottom runtime correction and repeated De-Digivolve proof `b64241ff4` |
| BT14-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution memory gain and On Deletion Numemon play proof |
| BT14-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play/evolution reveal-budget and top-or-bottom restoration proof |
| BT14-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal, opponent attack, Blocker duration, and De-Digivolve proof |
| BT14-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural inherited battle-deletion memory proof on a legal stack |
| BT14-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural effect-origin hand trash and same-turn Once Per Turn proof |
| BT14-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural start-main Eiji placement and inherited Dark Animal watcher proof |
| BT14-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play/When Attacking return-then-trash proof |
| BT14-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Effect-owner provenance correction and natural direct/inherited proof `4302a4b37` |
| BT14-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack-cost/Eiji memory and inherited play-watcher proof |
| BT14-075 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/attack mill and DP scaling; On Deletion remains direct/manual |
| BT14-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Played-Agumon Rush binding correction and natural evolution/deletion chain `bc75ffe11` |
| BT14-077 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural On Play mill/memory; When Digivolving remains structural |
| BT14-078 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural end-turn deletion/draw; scaled On Deletion remains direct/manual |
| BT14-079 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Legal evolution and inherited unsuspend; Eiji level-4 branch remains structural |
| BT14-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution/attack proves scaled mill, shared OPT, and Security Attack |
| BT14-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution, Eiji +2 play scaling, attack, and turn-end threshold proof |
| BT14-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Opponent-security watcher correction and natural removal/Security proof `be66987a4` |
| BT14-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Opponent-host source-discard correction and natural watcher/Security proof `f6713bdb3` |
| BT14-084 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Dedicated security-to-hand cost correction; Security self-play remains structural `de359e124` |
| BT14-085 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Digimon suspension-subject correction and natural watcher/Security proof `23d48e38e` |
| BT14-086 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Host-only Mind Link aura/own-stack correction; Security remains structural `dd70776f8` |
| BT14-087 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Own-stack Mind Link recovery correction and host-only keyword/Security proof `dd29f8ba3` |
| BT14-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack watcher/non-white filter correction and breeding/Security proof `170afbb01` |
| BT14-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural no-Greymon/Greymon deletion branches and Security ActivateMain proof |
| BT14-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Tai waiver, Courage stack/evolution, and Security self-return proof |
| BT14-091 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural pooled source trash, inclusive erratum boundary, and Security proof |
| BT14-092 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Chosen-stack snapshot, three-target restriction, exclusion, and Security proof |
| BT14-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural security search/evolution/recovery and Security Patamon proof |
| BT14-094 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural DP and Angemon-cost modal branches plus Security proof |
| BT14-095 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural granted suspension-memory watcher and Security proof |
| BT14-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Independent-target correction plus natural distinct-target/Security proof `312685ed0` |
| BT14-097 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural free Sukamon evolution and Security identity transformation proof |
| BT14-098 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural De-Digivolve, exact-three return, deletion budget, and Security proof |
| BT14-099 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural mill, Devimon Security Attack, attack checks, and Security proof |
| BT14-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural effect-origin self hand trash/draw, Main deletion, and Security proof |
| BT14-101 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural conditional hand evolution, Raid attack, and attack-keyword proof |
| BT14-102 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural modal deletion, self placement/hatch, and inherited Security proof |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 102
- Corrected: 17
- Provisional: 102
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT14 has static card-by-card coverage for all 102 cards. Execution gates remain
deferred, every score is provisional, and no collection-complete claim is made.
