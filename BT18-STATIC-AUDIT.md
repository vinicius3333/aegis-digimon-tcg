# BT18 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT17 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT18-001` through `BT18-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT18 workers may prepare static range
evidence in five parallel Luna lanes. BT17 static coverage is now recorded,
so accepted BT18 ranges may be integrated in strict ascending order. Detailed English reports belong under
`internal-docs/audits/BT18/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT18-001–010 | Coordinator reviewed | `internal-docs/audits/BT18/BT18-001-010.md` | Yes |
| BT18-011–020 | Coordinator reviewed | `internal-docs/audits/BT18/BT18-011-020.md` | Yes |
| BT18-021–030 | Coordinator reviewed | `internal-docs/audits/BT18/BT18-021-030.md` | Yes |
| BT18-031–040 | Luna assigned | `internal-docs/audits/BT18/BT18-031-040.md` | No |
| BT18-041–050 | Luna assigned | `internal-docs/audits/BT18/BT18-041-050.md` | No |
| BT18-051–060 | Luna assigned | `internal-docs/audits/BT18/BT18-051-060.md` | No |
| BT18-061–070 | Luna assigned | `internal-docs/audits/BT18/BT18-061-070.md` | No |
| BT18-071–080 | Luna assigned | `internal-docs/audits/BT18/BT18-071-080.md` | No |
| BT18-081–090 | Unassigned | `internal-docs/audits/BT18/BT18-081-090.md` | No |
| BT18-091–100 | Unassigned | `internal-docs/audits/BT18/BT18-091-100.md` | No |
| BT18-101–102 | Unassigned | `internal-docs/audits/BT18/BT18-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT18-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal red stack and two natural attacks prove the exact DP deletion, Tamer condition, and once-per-turn boundary (`2325e63ad`). |
| BT18-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal blue host observes the self-excluding other-blue-Digimon +1000 DP aura appear and disappear (`2b3dded8b`). |
| BT18-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A legal yellow stack and repeated natural attacks prove the Tamer-gated -2000 DP effect and once-per-turn boundary (`65e6ccd55`). |
| BT18-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production turn flow proves accepted and declined start-main security exchange branches on a legal green host (`a0020656d`). |
| BT18-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added an exact self/field watcher filter; unrelated and repeated natural battle deletions prove source scope and once-per-turn draw (`df1547cfb`). |
| BT18-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A natural losing battle on a legal purple stack proves distinct opposing Digimon/Tamer color scaling and the no-source boundary (`ec9004503`). |
| BT18-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, Pagumon alternate evolution, reveal-category boundary, and inherited Retaliation use legal red/purple fixtures (`2951918c7`). |
| BT18-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play proves the 2000-DP deletion ceiling, and legal red evolution preserves the source stack (`54d347540`). |
| BT18-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent Digimon deletion proves non-Tamer memory gain is blocked while shared capability paths preserve Tamer and dual-kind exceptions (`430e48ab0`). |
| BT18-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Digimon- and Tamer-to-Hybrid evolution plus a non-Hybrid negative prove the owned-source watcher and once-per-turn memory gain (`16d8f49e6`). |
| BT18-011 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 7/10 provisional | Natural BurningGreymon evolution proves return/decline and inherited-Tamer filtering, but no exact Ten Warriors peer target is separately exercised (`2707bb73f`). |
| BT18-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play, Gigasmon evolution, DP boundaries, and inherited attack are covered; a natural same-turn second attack is absent (`849688dae`). |
| BT18-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play and both evolution routes prove trash cost/return, decline, mixed traits, Raid, and inherited Retaliation (`0bb87db9c`). |
| BT18-014 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play/evolution proves Rush and a real attack proves the deletion boundary; no natural same-turn reattack proves frequency (`f168b9df4`). |
| BT18-015 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution, attack, cost decline, lowest-DP selection, inherited Security Attack, and losing-battle DNA use legal Kimeramon/Machinedramon stacks (`66afdbbe1`). |
| BT18-016 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural red evolution proves Blitz/cost and a natural attack proves the opponent-turn DP duration (`822f1c041`). |
| BT18-017 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural entry, tied-lowest deletion, both losing-battle replacement branches, and public DigiXros are covered; optional refusal remains unproved (`c9265a94d`). |
| BT18-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural legal Takuya evolution and repeated attacks prove color scaling, optional attack, requirement boundary, unsuspend, and once-per-turn bonus (`059adc110`). |
| BT18-019 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play, public DNA, decline, DigiXros distinct slots, and complete/incomplete losing-battle recovery prove the preserved hand-authored DNA requirement (`613ebe053`). |
| BT18-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural blue evolution and live observation prove the self-bound Aquatic Rule trait and stack preservation (`af6e46ff3`). |
| BT18-021 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolution and inherited replacement cases prove multicolor reduction, self/Tamer/breeding boundaries, and monocolor rejection (`6e648b09c`). |
| BT18-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural Tommy evolution, attack evolution, and opponent battle deletion prove bottom-stack trash, cost reduction, and own-stack Tamer play (`5e695968e`, `1a358b3fc`). |
| BT18-023 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural On Play/When Digivolving reveal, place-under, alternate evolution, and inherited attack return prove both categories and stack behavior (`080d3a7fe`). |
| BT18-024 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public play and legal Lanamon evolutions prove no-stack placement, stack-enabled return, inherited return, and named cost (`ed0ec92d1`, `a2fc34f5d`, `07bd253a4`). |
| BT18-025 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution proves the stackless restriction, duration and stacked negative; legal alternate costs and both Jamming projections are covered (`67dfc6103`). |
| BT18-026 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public hand activation proves atomic named costs and refusal; legal Hybrid evolution proves stackless deletion, Ice Clad, trait, and inherited DP (`f8dcd4b56`, `461023cfd`). |
| BT18-027 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove both legal own-stack play alternatives and zero-memory payment (`151421ed1`). |
| BT18-028 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution proves every bottom-stack trash, the stackless restriction/duration, DigiXros, leave replacement, and trait grant (`eb5819b44`). |
| BT18-029 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution and leave flows prove the scaled level return, DigiXros, source return, and stack play branches (`425db2b1c`). |
| BT18-030 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/reveal and opponent effect deletion prove dual-category selection and the inherited security replacement boundary (`be5fbd84c`). |

## Aggregate

- Catalog cards: 102
- Assigned: 80
- Integrated card audits: 30
- Corrected: 1
- Provisional: 30
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 4 (`BT18-011`, `BT18-012`, `BT18-014`, `BT18-017` source-proof gaps)
- Remaining unassigned: 22

BT18 static auditing is in progress; accepted ranges are eligible for strict chronological integration.
