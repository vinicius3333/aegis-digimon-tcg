# BT19 Static Card Implementation Re-audit

Status: static card-by-card audit in progress; BT18 static coverage recorded; execution gates deferred

Catalog snapshot: `efbecc002fb9000789123e2f91f201466e1e5b0a`

Authoritative scope: 102 cards, `BT19-001` through `BT19-102`, derived from
the immutable committed card-catalog blob.

This ledger follows the repository's `verify-card-implementation` protocol
and the chronological campaign plan. BT19 workers may prepare static range
evidence in five parallel Luna lanes. BT18 static coverage is now recorded,
so accepted BT19 ranges may be integrated in strict ascending order. Detailed English reports belong under
`internal-docs/audits/BT19/`.

## Current execution state

Tests, typecheck, lint, formatting, browser/UI checks, delivery gates, and
`git diff --check` remain intentionally unexecuted. Every score is therefore
provisional and capped at 8/10.

| Range | Worker state | Range report | Integrated |
| --- | --- | --- | --- |
| BT19-001–010 | Coordinator reviewed | `internal-docs/audits/BT19/BT19-001-010.md` | Yes |
| BT19-011–020 | Coordinator reviewed | `internal-docs/audits/BT19/BT19-011-020.md` | Yes |
| BT19-021–030 | Coordinator reviewed | `internal-docs/audits/BT19/BT19-021-030.md` | Yes |
| BT19-031–040 | Coordinator reviewed | `internal-docs/audits/BT19/BT19-031-040.md` | Yes |
| BT19-041–050 | Coordinator reviewed | `internal-docs/audits/BT19/BT19-041-050.md` | Yes |
| BT19-051–060 | Luna prepared; coordinator review pending | `internal-docs/audits/BT19/BT19-051-060.md` | No |
| BT19-061–070 | Luna assigned | `internal-docs/audits/BT19/BT19-061-070.md` | No |
| BT19-071–080 | Luna prepared; chronological review pending | `internal-docs/audits/BT19/BT19-071-080.md` | No |
| BT19-081–090 | Luna assigned | `internal-docs/audits/BT19/BT19-081-090.md` | No |
| BT19-091–100 | Luna assigned | `internal-docs/audits/BT19/BT19-091-100.md` | No |
| BT19-101–102 | Luna assigned | `internal-docs/audits/BT19/BT19-101-102.md` | No |

## Score model

Each card is scored across five fixed two-point components: Catalog/rules,
IR trace, Behavioral proof, Peer and stack proof, and Executed delivery gates.
The final component is fixed at 0/2 in this static campaign. Unsupported,
ambiguous, structural-only, or manually injected evidence reduces the
applicable non-gate component rather than being rounded up.

## Card ledger

| Card | Catalog/rules | IR trace | Behavioral proof | Peer and stack proof | Executed delivery gates | Result | Direct evidence |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| BT19-001 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural attacks prove matching hand placement, draw, optional decline, inherited-source binding, and once-per-turn (`b80127651`). |
| BT19-002 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural opponent attacks prove the self-return cost, level snapshot, decline, and Q3058 Decode ordering on a legal blue stack (`85aaf971d`). |
| BT19-003 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | A production turn proves Plug-In return naturally; the otherwise unoriginable repeat window is supplemental once-per-turn evidence only (`19cba4bc0`). |
| BT19-004 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Live continuous state proves another-green-Digimon, self-exclusion, owner-turn duration, and aura removal (`ace820a84`). |
| BT19-005 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Live continuous state proves opponent-Digimon presence, host-only Reboot, opponent-turn duration, and Tamer exclusion (`2302175c8`). |
| BT19-006 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production effect deletion and a natural battle prove the non-battle cause plus exact purple level-3 trash return filters (`844ef1801`). |
| BT19-007 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production turns, legal evolution, and natural attacks prove named support, memory boundary, numeric DP-ceiling increase, and relative-ceiling exclusion (`0ddcbda2c`). |
| BT19-008 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play plus production deletion prove legal OmniShoutmon evolution, Q3062 rejection, reveal/Tamer/Save ordering, and inherited Rush (`4d11fd476`). |
| BT19-009 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural evolutions and attacks prove exact Takato play, Tamer-count boundary, numeric DP-ceiling increase, and relative-ceiling exclusion (`a0d1a705d`). |
| BT19-010 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public DigiXros and production deletion/return prove four exact materials, reduction, trait-filtered stack placement, decline, and Q3067 departure (`572ff93db`). |
| BT19-011 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | IR/runtime and legal stacks cover DP-budget scaling and result-bound memory, but all focused triggers remain manually injected despite feasible natural origins (`0105db29a`, `38586033b`). |
| BT19-012 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion and DigiXros prove placement and the DigiXros-only Shoutmon alias; entry and inherited clauses lack complete natural proof (`bf58e3058`, `4f8497843`). |
| BT19-013 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Added the exact five-slot DigiXros recipe; natural DigiXros, effect deletion, stack-local Save, and free play prove the sequence (`0203c5fdd`). |
| BT19-014 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Exact DigiXros and stack peers support the IR, but feasible On Play and When Attacking origins remain replaced by manual timing (`929e48857`). |
| BT19-015 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural opponent deletions prove memory/frequency, while mandatory deletion and fallback branches still use injected digivolution timing (`30f943367`, `41cf1c81a`). |
| BT19-016 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion proves Blue Flare placement followed by draw; On Play and decline remain manually timed (`6b48f7aba`, `e60dcf5ab`). |
| BT19-017 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | IR and peer fixtures prove reveal selectors, nonduplication, Aquatic Rule, and frequency, but both feasible origins remain manually injected (`430f2792c`, `8dacfbfdc`). |
| BT19-018 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural deletion exercises Evade and survival; live stack comparisons prove self-scoped Aquatic Rule and inherited Jamming (`6b8dca009`, `123fbd7b1`). |
| BT19-019 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | IR and stack fixtures cover Yao count, Aquatic Rule, and inherited memory, but evolution and attack origins remain manually injected (`31fd45154`, `f3fbedb05`). |
| BT19-020 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural deletions prove Kiriha play, decline, 0/1/2-Tamer boundaries, and independent mandatory Save; stack proof preserves inherited Reboot (`7b5ac18fb`). |
| BT19-021 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Manual entry timings and legal stack observations support level filtering, Aquatic Rule, and inherited Jamming, but natural play/evolution proof is absent (`6cbef27a1`). |
| BT19-022 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Production deletion proves trash-only Blue Flare placement, no-candidate behavior, independent Save, and static/inherited Blocker scope (`f7a0e7f15`). |
| BT19-023 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Entry timing is injected; legal peers still prove own-target protection, duration, Blocker, and inherited target-switch restriction (`6d932e910`). |
| BT19-024 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Decode, leave cause, trait containment, and source placement; natural battle supplies only the negative while positive timings remain injected (`a2037c5aa`). |
| BT19-025 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected exact Blue Greymon/MailBirdramon DigiXros and ordering; public DigiXros is natural, but entry/attack/end-of-attack timings remain injected (`abbfca41e`). |
| BT19-026 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected post-De-Digivolve count, under-Tamer source, and independent Save; deletion is production-driven, but entry/count proof is injected (`3a8b993c9`). |
| BT19-027 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected Decode and ordered dynamic-level returns; source play and boundaries are observed, but evolution/end-turn origins remain injected (`ad61c7a6b`). |
| BT19-028 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected trait containment, optional sequencing, and whole-permanent placement; digivolution behavior remains manually originated (`11d80a6ec`). |
| BT19-029 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected optional security cost and yellow Data/Witchelny opponent-effect scope; play/context origin remains manually injected (`8bb9214bd`). |
| BT19-030 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural Option use proves the inherited reduction, while start-main, threshold, Security, and turn-scope origins retain manual seams (`0159bf7b6`). |
| BT19-031 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Bound both named trash placements to the ShootingStarmon played by this effect; natural Decoy/deletion proof is strong, but inherited attack timing remains injected (`1494ec1cd`). |
| BT19-032 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural deletion and opponent-effect flows prove the security threshold, recovery, debuff duration, and inherited Barrier payment (`5c29abc3f`). |
| BT19-033 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion proves Save; free On Play evolution remains manually fired and inherited Piercing is structural (`9001a9a4b`). |
| BT19-034 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | A real Option use proves part of the inherited watcher, while digivolution and several cost/non-use boundaries remain injected (`26eb14e0e`). |
| BT19-035 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural play and deletion prove the watcher and source placement; inherited attack reduction remains manually fired (`f9c9fe9c3`). |
| BT19-036 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural opponent-effect replacement proves the inherited clause, while both entry timings and security placement remain injected (`23c87d1d9`). |
| BT19-037 | 2/2 | 2/2 | 0/2 | 2/2 | 0/2 | 6/10 provisional | Entry, inherited, and timing-suppression behavior is manually fired or structural despite feasible natural origins (`1a0b8a080`). |
| BT19-038 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion proves source placement; both entry timings remain injected and inherited Piercing is structural (`b9190c9d3`). |
| BT19-039 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Aligned When Digivolving optional security-cost abort semantics; natural Recovery is covered, but entry/security watcher origins remain injected (`05068ec53`). |
| BT19-040 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | A real Option use proves token creation, while digivolution and remaining watcher/boundary cases retain injected or structural seams (`1a6972f64`). |
| BT19-041 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural evolution and leave/Recovery ordering supply partial proof; positive entry cost, target, and duration branches remain manually fired (`b6bb687ae`). |
| BT19-042 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Gated both +6000 DP follow-ups on the Dynasmon/X Antibody stack condition; positive timings remain injected (`1a4eba93e`). |
| BT19-043 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural leave prevention proves atomic security payment and frequency; end-turn opponent-choice branches remain injected (`b6bb687ae`). |
| BT19-044 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Corrected exact Henry Wong/Calumon matching with a paired-name negative; start-main and inherited attack timings remain injected (`567d12701`). |
| BT19-045 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public evolution and live Security/stack state prove Royal Base reduction, breeding exclusion, and both DP grants (`b6bb687ae`). |
| BT19-046 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Natural play/evolution and real turns prove suspension, independent Data lock, target boundaries, and duration (`b6bb687ae`). |
| BT19-047 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Natural deletion proves Save; free On Play evolution remains injected and inherited Blocker is structural (`b6bb687ae`). |
| BT19-048 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 8/10 provisional | Public evolution and natural effect/battle departures prove face-up Security DP, all-target Royal Base replacement, cause boundary, and Rule trait (`b6bb687ae`). |
| BT19-049 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public evolution proves exact Henry play and 0/1/2-Tamer boundaries; decline and inherited attack/frequency remain injected (`b6bb687ae`). |
| BT19-050 | 2/2 | 2/2 | 1/2 | 2/2 | 0/2 | 7/10 provisional | Public evolution and inherited DP state are covered, while both positive entry trigger clauses use controlled timing (`b6bb687ae`). |

## Aggregate

- Catalog cards: 102
- Assigned: 102
- Integrated card audits: 50
- Corrected: 12
- Provisional: 50
- Verified 10/10 in this pass: 0
- Blocked or ambiguous: 32 (`BT19-011`, `BT19-012`, `BT19-014`, `BT19-015`, `BT19-016`, `BT19-017`, `BT19-019`, `BT19-021`, `BT19-023`–`BT19-031`, `BT19-033`–`BT19-044`, `BT19-047`, `BT19-049`, `BT19-050` source-proof gaps; excludes fully proved `BT19-022`, `BT19-032`, `BT19-045`, `BT19-046`, and `BT19-048`)
- Remaining unassigned: 0

Operational disclosure: the BT19-041–050 worker accidentally ran one isolated
`git diff --check` against the BT19-042/044 changed files. It was not used as a
delivery gate, was not repeated, and all Executed delivery gates remain `0/2`.

BT19 static auditing is in progress; accepted ranges are eligible for strict chronological integration.
