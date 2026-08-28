# BT20 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT19 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT20-001` through `BT20-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT20 workers may prepare static range
evidence in five parallel Luna lanes. BT19 static coverage is now recorded,
so accepted BT20 ranges may be integrated in strict ascending order. Detailed
English reports belong under `internal-docs/audits/BT20/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT20-001–010 | Coordinator reviewed | `internal-docs/audits/BT20/BT20-001-010.md` | Yes |
| BT20-011–020 | Coordinator reviewed | `internal-docs/audits/BT20/BT20-011-020.md` | Yes |
| BT20-021–030 | Coordinator reviewed | `internal-docs/audits/BT20/BT20-021-030.md` | Yes |
| BT20-031–040 | Coordinator reviewed | `internal-docs/audits/BT20/BT20-031-040.md` | Yes |
| BT20-041–050 | Luna assigned | `internal-docs/audits/BT20/BT20-041-050.md` | No |
| BT20-051–060 | Luna assigned | `internal-docs/audits/BT20/BT20-051-060.md` | No |
| BT20-061–070 | Luna assigned | `internal-docs/audits/BT20/BT20-061-070.md` | No |
| BT20-071–080 | Luna assigned | `internal-docs/audits/BT20/BT20-071-080.md` | No |
| BT20-081–090 | Unassigned | `internal-docs/audits/BT20/BT20-081-090.md` | No |
| BT20-091–100 | Unassigned | `internal-docs/audits/BT20/BT20-091-100.md` | No |
| BT20-101–102 | Unassigned | `internal-docs/audits/BT20/BT20-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT20-001 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural continuous boundaries prove the four-source and turn-scope clauses; the fixture stack is not fully catalog-legal (`cc3e0f987`). |
| BT20-002 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural attacks prove draw and trigger boundaries, but the negative cross-color stack is not catalog-legal (`cc3e0f987`). |
| BT20-003 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 6/10 provisional | End-turn behavior is manually fired and current host fixtures are synthetic despite correct placement/gating structure (`cc3e0f987`). |
| BT20-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural ACCEL play drives a legal reduced-cost Pinamon-to-Liamon evolution and negative boundary (`cc3e0f987`). |
| BT20-005 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural attacks distinguish pre-existing face-up security for Jamming, but the behavior stack is cross-color (`cc3e0f987`). |
| BT20-006 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural battle deletion proves Ghost recovery and exclusion, while the inherited host stack is not fully legal (`cc3e0f987`). |
| BT20-007 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Start-main payment/decline uses direct timing; the legal inherited stack and DP scope remain observable (`cc3e0f987`). |
| BT20-008 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Start-main name/trait payment uses direct timing; the legal inherited aura scope is observable (`cc3e0f987`). |
| BT20-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural purple play drives a legal reduced-cost Free evolution and inherited turn boundary (`cc3e0f987`). |
| BT20-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public evolutions prove battle-area-only Ginryumon reduction and inherited DP on a legal stack (`cc3e0f987`). |
| BT20-011 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves deletion, paid DNA evolution, source continuity, and inherited DP on a legal Free route (`175a52725`). |
| BT20-012 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attack evolves a legal Ryudamon/Ginryumon stack into Hisyaryumon with paid alternate cost (`175a52725`). |
| BT20-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Main activation proves reduced Sistermon play, matching, frequency, and inherited allied aura (`175a52725`). |
| BT20-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry deletion and inherited Alliance are natural, but feasible end-turn evolution remains manually timed (`175a52725`). |
| BT20-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural in-attack evolution proves breeding placement, Chronicle path, modifiers, and inherited security suppression (`175a52725`). |
| BT20-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry and deletion paths prove bound buffs, optional attack, paid DNA replacement, and inherited Security Attack (`175a52725`). |
| BT20-017 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural entry and allied play prove the canonical token, 8000-DP boundary, once-per-turn watcher, and optional attack (`175a52725`). |
| BT20-018 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected either-stack Security removal direction; the central security/inherited clauses still use explicit subtrigger timing (`36a33e645`). |
| BT20-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Jesmon evolution proves independent immunity/attack branches, auras, exact peers, and legal inherited stack (`175a52725`). |
| BT20-020 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected opponent-stack Security removal direction; restriction and watcher proof retain explicit timing seams (`dc63d9aa3`). |
| BT20-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Royal Knight stack scaling to include Option cards; entry/attack behavior remains manually timed (`c62d1538a`). |
| BT20-022 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Battle protection and inherited draw state are observable after manually fired entry/attack timings (`b910cfb4f`). |
| BT20-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural green Dracomon-text play drives reduced Wingdramon evolution; Jamming and inherited DP boundaries are observable (`b910cfb4f`). |
| BT20-024 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Return, stack-gated Tamer lock, and inherited draw are observed through manually fired entry/attack timings (`b910cfb4f`). |
| BT20-025 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 7/10 provisional | Entry deletion is manually fired and no natural Examon DNA path proves the field-only alias/level treatment (`b910cfb4f`). |
| BT20-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry return/restriction is manually fired; the inherited attack-target restriction uses a natural attack (`b910cfb4f`). |
| BT20-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion/prevention behavior is covered, but the feasible Security-removal watcher remains injected (`b910cfb4f`). |
| BT20-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural digivolution and stack-source play prove the watcher, condition boundary, De-Digivolve, and keywords (`b910cfb4f`). |
| BT20-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Pulsemon name-only matching with legal SEEKERS positive/text-only negative; inherited timing remains injected (`adb60c364`). |
| BT20-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves independent reveal selectors and bottoming; live stack state proves inherited-only Barrier (`b910cfb4f`). |
| BT20-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry paths prove -3000 DP, but inherited Barrier remains observational rather than behavior-driving (`1fdfbef5a`). |
| BT20-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves ordered Security take/recovery boundaries and natural battle proves inherited memory (`1fdfbef5a`). |
| BT20-033 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected the second debuff to reuse the selected LoaderLeomon target; suppression boundaries remain unexecuted (`209ee634a`). |
| BT20-034 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Inherited Security trash is natural, but Tamer placement and Fortitude remain injected or observational (`1fdfbef5a`). |
| BT20-035 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Tamer-placement and Security-removal paths are injected while Fortitude is structural despite feasible natural origins (`1fdfbef5a`). |
| BT20-036 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected the follow-up attack to bind the actual DNA result; the feasible end-turn origin remains manually fired (`cf95fc6e1`). |
| BT20-037 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural evolution proves scaling and locks, but Partition still uses a manually driven deletion seam (`1fdfbef5a`). |
| BT20-038 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural battle/breeding evolutions prove zone-scoped reduction; natural combat proves inherited Piercing (`1fdfbef5a`). |
| BT20-039 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution prove one-target suspension and natural combat proves inherited Piercing (`1fdfbef5a`). |
| BT20-040 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural qualifying play drives reduced Groundramon evolution; Raid and inherited DP are behavior-driven (`1fdfbef5a`). |

## Aggregate

- Catalog cards: 102
- Assigned: 80
- Integrated card audits: 40
- Corrected: 6
- Provisional: 40
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 23 (`BT20-001`–`BT20-003`, `BT20-005`–`BT20-008`, `BT20-014`, `BT20-018`, `BT20-020`–`BT20-022`, `BT20-024`–`BT20-027`, `BT20-029`, `BT20-031`, `BT20-033`–`BT20-037` source/stack-proof gaps)
- Remaining unassigned: 22

BT20 static auditing is in progress; accepted ranges are eligible for strict chronological integration.
