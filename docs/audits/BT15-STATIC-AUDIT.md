# BT15 Static Card Implementation Re-audit

Status: static card-by-card coverage complete; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT15-001` through `BT15-102`, derived from
the immutable catalog blob for `packages/shared/src/cards/data/cards.json`.

This campaign ledger follows the repository's `verify-card-implementation`
protocol and the chronological execution plan in
`docs/plans/2026-08-27-bt-card-by-card-audit.md`. Detailed clause traces are
written in English under `internal-docs/audits/BT15/` and integrated here only
after review. The prior `internal-docs/audits/BT15-runtime-2026-08-25.md`
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
| BT15-001–010 | Reviewed | `internal-docs/audits/BT15/BT15-001-010.md` | Yes |
| BT15-011–020 | Reviewed | `internal-docs/audits/BT15/BT15-011-020.md` | Yes |
| BT15-021–030 | Reviewed | `internal-docs/audits/BT15/BT15-021-030.md` | Yes |
| BT15-031–040 | Reviewed | `internal-docs/audits/BT15/BT15-031-040.md` | Yes |
| BT15-041–050 | Reviewed | `internal-docs/audits/BT15/BT15-041-050.md` | Yes |
| BT15-051–060 | Reviewed | `internal-docs/audits/BT15/BT15-051-060.md` | Yes |
| BT15-061–070 | Reviewed | `internal-docs/audits/BT15/BT15-061-070.md` | Yes |
| BT15-071–080 | Reviewed | `internal-docs/audits/BT15/BT15-071-080.md` | Yes |
| BT15-081–090 | Reviewed | `internal-docs/audits/BT15/BT15-081-090.md` | Yes |
| BT15-091–100 | Reviewed | `internal-docs/audits/BT15/BT15-091-100.md` | Yes |
| BT15-101–102 | Reviewed | `internal-docs/audits/BT15/BT15-101-102.md` | Yes |

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
| BT15-061 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inherited Reboot correction and legal level 3-to-4-to-5 stack proof `744a68a39` |
| BT15-062 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Inherited Reboot correction plus natural reveal and end-turn breeding-play proof `3c2c212ca` |
| BT15-063 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Any-controller, non-self Digimon/Tamer suspension-watcher corrections and natural BT14-043 origin `330086372` |
| BT15-064 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Reveal placement anchored to this Megadramon and competing-host boundary proof `f03ba10cd` |
| BT15-065 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Numemon digivolution-card cost scoped to this Digimon plus hand-cost and placement proof `d00ec5866` |
| BT15-066 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Supported white-only evolution restriction and inherited Reboot corrections with natural phase proof `5b713084a` |
| BT15-067 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Self-anchored suspension watcher correction and natural BT14-043 suspension-cost origin `03456599a` |
| BT15-068 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Opponent battle-area effect-play filter correction and natural WaruSeadramon origin `c721d01d6` |
| BT15-069 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle deletion at the exact one-memory boundary proves both clauses |
| BT15-070 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public reveal plus legal DemiDevimon-to-Vilemon losing-battle source-stack proof |
| BT15-071 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | No-target processing-cost and SoC Tamer stack-filter corrections with natural attack proof `4f7db3ef4` |
| BT15-072 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural leave-play prevention paths, self-exclusion, owner-effect exclusion, and Blocker proof |
| BT15-073 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Unsupported Main timing removed plus natural battle-loss opponent binding proof `66582497e` |
| BT15-074 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Opponent chooser correction plus natural entry, fallback, attack-aura, and inherited effect-play proof `44694c667` |
| BT15-075 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | SoC Tamer stack-filter corrections and natural trash-cost-before-draw behavior `cfcc9d8bf` |
| BT15-076 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Executable hand Counter digivolution, shared hand discovery/residency seam, and Blocker correction `5e3f4851c` |
| BT15-077 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal, end-turn breeding play, and inherited battle-loss source-stack proof |
| BT15-078 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural effect-play aura, suppressed On Play, result-bound redirect, and inherited Piercing proof |
| BT15-079 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Supported white-only evolution restriction correction plus natural opponent-end and battle-stack proof `82758e70f` |
| BT15-080 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play, evolution, deletion, target-ceiling, and Blocker behavior proof |
| BT15-081 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural effect-played security path and legal Leviamon-stack alternate evolution proof |
| BT15-082 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Explicit Sea Animal exclusion correction plus natural Wings of Love trash-return origin `9dd149d12` |
| BT15-083 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural reveal/bottom ordering and Digimon-effect hand-add watcher proof |
| BT15-084 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack paths prove direct security trash and own effect-driven security removal |
| BT15-085 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent attack redirect to a suspended Insectoid and security boundary proof |
| BT15-086 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public Mind Link, inherited Jamming/Blocker, end-turn stack exit, and Security play proof |
| BT15-087 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Invalid TeamWork replaced by Alliance plus natural Mind Link, Reboot, stack-exit, and Security proof `ce55583cf` |
| BT15-088 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural post-play Sora sequencing and Security Biyomon play/self-return proof |
| BT15-089 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main and Security paths prove live opposing-security DP ceilings |
| BT15-090 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural qualified/unqualified/Security branches prove catalog-authoritative lowest-level selection |
| BT15-091 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Compound material-cost sequencing and bound-host correction plus natural complete/incomplete payment proof `0d6ea26f7` |
| BT15-092 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main security play/replacement and attack-origin Security DP reduction proof |
| BT15-093 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Mandatory second -6000 DP correction plus natural same-target -12000 DP proof `c338fc75d` |
| BT15-094 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural controller-any suspension, Insectoid selection, and opponent-turn duration proof |
| BT15-095 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Option play and battle deletion prove the granted security-trash trigger |
| BT15-096 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural two-hit and one-hit reveal flows prove add/trash/top-deck boundaries |
| BT15-097 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Mandatory Machine/Cyborg/SoC hand cost correction and cross-kind lowest-play-cost proof `6c91dc629` |
| BT15-098 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural own-deletion cost, optional Myotismon play, self-placement, and no-cost negative proof |
| BT15-099 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Mandatory hand-trash cost correction plus stored-level deletion and Myotismon draw proof `2f47b813f` |
| BT15-100 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main and Leviamon X digivolution origins prove both level deletions and trash return |
| BT15-101 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Missing self-suspend deletion prevention and alternate Gabumon evolution correction with natural positive/negative deletion proof `09aacd357` |
| BT15-102 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Mixed trash/battle-area reducer, top-card shedding, and last-placed On Play corrections with natural play/end-turn proof `d7c021d93` |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 102
- Corrected: 35
- Provisional: 102
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 0
- Remaining unassigned: 0

BT15 static card-by-card coverage is complete. Execution gates remain
deferred, so no collection-complete or 10/10 claim is made.

Process note: the BT15-039 worker accidentally performed one metadata-only
pre-push amend (`e34ca8bdb` to `fab5fa267`). The trees and messages are
identical, no force push occurred, and the range report records the violation.
The BT15-060 worker also accidentally invoked `git diff --check` once; it
produced no output and earns no gate credit. The BT15-101–102 worker likewise
accidentally invoked `git diff --check` once during a read-only consistency
review; it produced no output and earns no gate credit. No other prohibited
gate ran.
