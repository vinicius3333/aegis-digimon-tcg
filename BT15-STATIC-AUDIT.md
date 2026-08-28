# BT15 Static Card Implementation Re-audit

Status: static card-by-card pass in progress; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT15-001` through `BT15-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT15/` and integrated here only
after coordinator review. The prior `internal-docs/audits/BT15-runtime-2026-08-25.md`
report is supporting evidence only; every card must be reread against the
immutable catalog, current KB, direct module, shared runtime, and
behavior-driving source.

## Current execution state

The re-audit intentionally does not execute tests, typecheck, lint,
formatting, browser/UI validation, or `git diff --check`, at the user's
request. Workers may correct implementation gaps and strengthen test source,
but every result from this pass remains provisional and no
collection-complete claim is valid.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT15-001–010 | Coordinator reviewed | `internal-docs/audits/BT15/BT15-001-010.md` | Yes |
| BT15-011–020 | Coordinator reviewed | `internal-docs/audits/BT15/BT15-011-020.md` | Yes |
| BT15-021–030 | Coordinator reviewed | `internal-docs/audits/BT15/BT15-021-030.md` | Yes |
| BT15-031–040 | Coordinator reviewed | `internal-docs/audits/BT15/BT15-031-040.md` | Yes |
| BT15-041–050 | Coordinator reviewed | `internal-docs/audits/BT15/BT15-041-050.md` | Yes |
| BT15-051–060 | Coordinator reviewed | `internal-docs/audits/BT15/BT15-051-060.md` | Yes |
| BT15-061–070 | Luna assigned | `internal-docs/audits/BT15/BT15-061-070.md` | No |
| BT15-071–080 | Luna assigned | `internal-docs/audits/BT15/BT15-071-080.md` | No |
| BT15-081–090 | Luna assigned | `internal-docs/audits/BT15/BT15-081-090.md` | No |
| BT15-091–100 | Luna assigned | `internal-docs/audits/BT15/BT15-091-100.md` | No |
| BT15-101–102 | Unassigned | `internal-docs/audits/BT15/BT15-101-102.md` | No |

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
| BT15-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletion and legal inherited return stack proof |
| BT15-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public hand-add origin, turn duration, provenance, and legal stack proof |
| BT15-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove both Security ends, decline, and Once Per Turn |
| BT15-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural end-turn attack, suspension boundary, and Insectoid stack proof |
| BT15-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Any-controller unsuspend filter correction and natural opponent-phase proof `703db853f` |
| BT15-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural deletion-origin proof with the printed trait and stack boundaries |
| BT15-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public entry origins, legal evolution stack, and inherited behavior proof |
| BT15-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal stack fixture plus printed effect boundaries and peer comparison |
| BT15-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal stack fixture plus printed effect boundaries and peer comparison |
| BT15-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Legal stack fixture plus printed effect boundaries and peer comparison |
| BT15-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public On Play reveal/trash, zero-hit, Blocker, and evolution proof |
| BT15-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public-origin effect proof with legal evolution and inherited stack coverage |
| BT15-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry/deletion behavior and legal red stack proof |
| BT15-014 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Catalog-to-IR clause trace with behavioral boundaries and peer proof |
| BT15-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural public timing origin and legal evolution-stack proof |
| BT15-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Catalog-to-IR clause trace with behavioral boundaries and peer proof |
| BT15-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural public timing origin and legal evolution-stack proof |
| BT15-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural public timing origin and legal evolution-stack proof |
| BT15-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural public timing origin and legal evolution-stack proof |
| BT15-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public behavior origin, blue evolution route, and inherited stack proof |
| BT15-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public reveal/attack origins and equal, fewer, and greater source-count boundaries |
| BT15-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Effect-play versus normal-play origins, duration, Jamming, and legal stack proof |
| BT15-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public On Play source trash, empty-stack memory boundary, and legal evolution |
| BT15-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Optional public behavior branches and legal Garurumon stack proof |
| BT15-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public behavior boundaries and legal blue evolution-stack proof |
| BT15-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | ACE catalog trace, public Counter/Overflow behavior, and legal stack proof |
| BT15-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public source-trash behavior, target boundaries, and legal evolution proof |
| BT15-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public behavior origin, target boundary coverage, and legal blue stack proof |
| BT15-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public behavior origin, legal predecessor stack, and inherited proof |
| BT15-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play/deletion origins, all-target source boundaries, Blocker, and legal stacks |
| BT15-031 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent-end turn progression, return, free Dark Masters play, and Blocker proof |
| BT15-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Equal/greater stack comparisons, shared Once Per Turn, and legal Plesiomon stack proof |
| BT15-033 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle replacement, Security payment, decline, and inherited-stack proof |
| BT15-034 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2515 live 3-to-2 Security transition, placement branches, and inherited proof |
| BT15-035 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Effective Numemon alias, exact payment, On Play/deletion, and inherited proof |
| BT15-036 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Both Security-end payments, On Play/deletion DP reduction, and natural Blocker proof |
| BT15-037 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Same-time Security-play removal bus correction and natural BT15-092 origin `fd212e862` |
| BT15-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Blast Digivolve, selectable Security cost, live threshold, and recovery proof |
| BT15-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2523 inherited-effect exclusion correction and natural Gammamon stack proof `fab5fa267` |
| BT15-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2524 single target, live own-Digimon scaling, and legal X Antibody stack proof |
| BT15-041 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent-end delete/play/reactivation and legal green evolution proof |
| BT15-042 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Top-or-bottom recovery choice correction and natural Security/evolution proof `1c5b1c59b` |
| BT15-043 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural start-main suspend/DP and inherited battle-deletion memory proof |
| BT15-044 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public effect origins, printed boundaries, peer comparison, and legal stack proof |
| BT15-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public effect origins, printed boundaries, peer comparison, and legal stack proof |
| BT15-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public effect origins, printed boundaries, peer comparison, and legal stack proof |
| BT15-047 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public effect origins, printed boundaries, peer comparison, and legal stack proof |
| BT15-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public effect origins, printed boundaries, peer comparison, and legal stack proof |
| BT15-049 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Missing Blast Digivolve marker correction, Counter timing, immunity, and stack proof `65b095536` |
| BT15-050 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Q2529–Q2533 reveal and natural Dark Masters breeding-play proof |
| BT15-051 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural X Antibody evolution, suspended-opponent scaling, negative stack gate, and inherited DP proof |
| BT15-052 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | White-only evolution restriction correction plus natural return and Dark Masters end-step proof `0f0eeffae` |
| BT15-053 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution/start-main suspension, Piercing, and opponent Digimon-effect immunity proof |
| BT15-054 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | X Antibody trait-gate correction plus natural paired suspension and breeding watcher proof `d431af36c` |
| BT15-055 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inherited Reboot correction, both reveal-category boundaries, and opponent Active-phase proof `d919a3cf1` |
| BT15-056 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Self-anchored suspension watcher correction, cost ceiling, start-main placement, and immunity proof `1675cb0b4` |
| BT15-057 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Missing named deletion-effect library correction and natural battle-deletion play proof `83a8504e0` |
| BT15-058 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Self/cost inherited watcher correction, DigiPolice stack, suspension, restriction, and Blocker proof `685c7a815` |
| BT15-059 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inherited Reboot correction plus natural Marvin placement, De-Digivolve floor, and Active-phase proof `8fe64f85d` |
| BT15-060 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Blocker and reveal-scoped Omnimon alias corrections plus natural reveal/evolution/attack proof `74f816e3f` |

## Aggregate

- Catalog cards: 102
- Assigned: 100
- Integrated card audits: 60
- Corrected: 13
- Provisional: 60
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 2

BT15 static re-audit is in progress.

Process note: the BT15-039 worker accidentally performed one metadata-only
pre-push amend (`e34ca8bdb` to `fab5fa267`). The trees and messages are
identical, no force push occurred, and the range report records the violation.
The BT15-060 worker also accidentally invoked `git diff --check` once; it
produced no output and earns no gate credit. No other prohibited gate ran.
