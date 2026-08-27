# EX2 card-by-card static audit — 2026-08-27

Scope: all 74 committed EX2 records, `EX2-001` through `EX2-074`, audited in ascending card-ID order by three Luna agents using the repository's `verify-card-implementation` workflow.

## Method and evidence boundary

- For every card, the auditor read the catalog record in `packages/shared/src/cards/data/cards.json`, queried `node tools/kb/query.mjs card <CARD-ID>`, traced the direct module and the shared primitives it uses, reviewed the colocated test, and checked peers where the effect vocabulary or trait interaction required it.
- The catalog is contiguous at 74 records; all 74 direct modules and all 74 colocated test files exist.
- Every EX2 module registers executable behavior exclusively through `registerIrCard`; no EX2 module registers through `registerCard`.
- Cards that were already faithful were not modified and received no new tests.
- Seven cards had material defects. Their implementations were corrected and focused regressions were added or strengthened.
- At the user's explicit request, the new/changed tests were not executed in this audit. The earlier `EX2-runtime-2026-08-21.md` run remains historical evidence (74/74 focused files green before these corrections), not runtime proof of the current diff. The ratings below are therefore static implementation-fidelity ratings.

## Corrected findings

| Card | Defect and correction | Regression added |
| --- | --- | --- |
| EX2-028 Parasitemon | The End of Attack destination included Parasitemon itself. Added `excludeSelf` to implement the erratum and Q3323's “other Digimon” boundary. | Exercises an attack ending and observes Parasitemon move only beneath the other Digimon. |
| EX2-037 Reapermon | De-Digivolve selected a generic opposing Digimon instead of the Digimon that became unsuspended. Bound the target to `triggerSubject`, matching Q3327–Q3330. | Fires the unsuspend event and checks that exact subject loses its top source. |
| EX2-043 Gulfmon | The watcher lacked the printed “one of your effects” provenance gate and incorrectly excluded Gulfmon from “1 of your Digimon.” Added `triggerByYourEffect` and restored self as a legal target. | Asserts the provenance gate and full own-Digimon target scope; existing watcher cases cover own/opponent effect provenance. |
| EX2-046 ADR-02 Searcher | The play-cost replacement could match another controlled card being played. Bound the replacement source to this Searcher with `isSelfRef`. | Asserts the compiled replacement is self-scoped; existing behavior covers Searcher's reduced cost and draw. |
| EX2-049 ADR-01 Jeri | With no Mother D-Reaper, the chosen Searcher was omitted from both placement and the returned reveal cards, contrary to Q3344. It now remains among the cards returned to deck bottom. | Activates with no Mother and observes all five revealed cards, including Searcher, returned to the deck. |
| EX2-055 Reaper | The payment trashed from the top of Mother's stack and did not reliably require seven cards actually trashed around protected sources. It now takes the declared bottom segment, honors untrashable cards, and grants cost 0 only after at least seven cards were actually trashed, matching Q1923/Q3288/Q3347. | Distinguishes the bottom seven from the top card in an eight-source stack. |
| EX2-060 Rika Nonaka | The attack watcher had an unprinted once-per-turn limit. Removed the outer `OncePerTurn`. | Asserts no frequency limit exists on the attack watcher. |

## Card-by-card verdicts

`10/10 static` means the complete printed contract, applicable errata/rulings, registration, and executable mapping were found faithful after the corrections above. It does not claim that this audit executed the changed tests.

| Card | Name | Verdict |
| --- | --- | --- |
| EX2-001 | Gigimon | 10/10 static |
| EX2-002 | Xiaomon | 10/10 static |
| EX2-003 | Viximon | 10/10 static |
| EX2-004 | Gummymon | 10/10 static |
| EX2-005 | Hopmon | 10/10 static |
| EX2-006 | Yaamon | 10/10 static |
| EX2-007 | Mother D-Reaper | 10/10 static |
| EX2-008 | Guilmon | 10/10 static |
| EX2-009 | Growlmon | 10/10 static |
| EX2-010 | WarGrowlmon | 10/10 static |
| EX2-011 | Gallantmon | 10/10 static |
| EX2-012 | Megidramon | 10/10 static |
| EX2-013 | Labramon | 10/10 static |
| EX2-014 | IceDevimon | 10/10 static |
| EX2-015 | Seasarmon | 10/10 static |
| EX2-016 | Gorillamon | 10/10 static |
| EX2-017 | Leomon | 10/10 static |
| EX2-018 | MarineAngemon | 10/10 static |
| EX2-019 | Renamon | 10/10 static |
| EX2-020 | Lopmon | 10/10 static |
| EX2-021 | Kyubimon | 10/10 static |
| EX2-022 | Antylamon | 10/10 static |
| EX2-023 | Taomon | 10/10 static |
| EX2-024 | Sakuyamon | 10/10 static |
| EX2-025 | Terriermon | 10/10 static |
| EX2-026 | Gargomon | 10/10 static |
| EX2-027 | Rapidmon | 10/10 static |
| EX2-028 | Parasitemon | 10/10 static after correction |
| EX2-029 | MegaGargomon | 10/10 static |
| EX2-030 | Monodramon | 10/10 static |
| EX2-031 | Guardromon | 10/10 static |
| EX2-032 | Strikedramon | 10/10 static |
| EX2-033 | Locomon | 10/10 static |
| EX2-034 | Andromon | 10/10 static |
| EX2-035 | Cyberdramon | 10/10 static |
| EX2-036 | GroundLocomon | 10/10 static |
| EX2-037 | Reapermon | 10/10 static after correction |
| EX2-038 | Justimon: Blitz Arm | 10/10 static |
| EX2-039 | Impmon | 10/10 static |
| EX2-040 | Devidramon | 10/10 static |
| EX2-041 | Dobermon | 10/10 static |
| EX2-042 | Mephistomon | 10/10 static |
| EX2-043 | Gulfmon | 10/10 static after correction |
| EX2-044 | Beelzemon | 10/10 static |
| EX2-045 | Calumon | 10/10 static |
| EX2-046 | ADR-02 Searcher | 10/10 static after correction |
| EX2-047 | ADR-03 Pendulum Feet | 10/10 static |
| EX2-048 | ADR-04 Bubbles | 10/10 static |
| EX2-049 | ADR-01 Jeri | 10/10 static after correction |
| EX2-050 | ADR-05 Creep Hands | 10/10 static |
| EX2-051 | ADR-07 Palates Head | 10/10 static |
| EX2-052 | ADR-06 Horn Striker | 10/10 static |
| EX2-053 | ADR-08 Optimizer | 10/10 static |
| EX2-054 | ADR-09 Gatekeeper | 10/10 static |
| EX2-055 | Reaper | 10/10 static after correction |
| EX2-056 | Takato Matsuki | 10/10 static |
| EX2-057 | Kenta Kitagawa | 10/10 static |
| EX2-058 | Jeri Kato | 10/10 static |
| EX2-059 | Shu-Chong Wong | 10/10 static |
| EX2-060 | Rika Nonaka | 10/10 static after correction |
| EX2-061 | Henry Wong | 10/10 static |
| EX2-062 | Ryo Akiyama | 10/10 static |
| EX2-063 | Kazu Shioda | 10/10 static |
| EX2-064 | Alice McCoy | 10/10 static |
| EX2-065 | Ai & Mako | 10/10 static |
| EX2-066 | Offensive Plug-In A | 10/10 static |
| EX2-067 | Fire Ball | 10/10 static |
| EX2-068 | High-Speed Plug-In D | 10/10 static |
| EX2-069 | Fist of the Beast King | 10/10 static |
| EX2-070 | Digivolution Plug-In S | 10/10 static |
| EX2-071 | Death Slinger | 10/10 static |
| EX2-072 | Blue Card | 10/10 static |
| EX2-073 | Gallantmon: Crimson Mode | 10/10 static |
| EX2-074 | Beelzemon: Blast Mode | 10/10 static |

## Validation recorded

- Catalog/KB/module/test inspection: 74/74 cards.
- Registration scan: 74/74 direct modules use `registerIrCard`; zero `registerCard` calls under `apps/api/src/cards/EX2`.
- `pnpm typecheck`: passed after all implementation and regression-file edits.
- `git diff --check`: clean after integration.
- Runtime tests: intentionally not run for this audit per user instruction. The new regressions remain unexecuted.
- Unresolved rules ambiguities: none identified.
