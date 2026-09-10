---
set: EX5
cards: 74
status: verified
verified_at: 2026-09-09
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX5 audit

## Status

All 74 EX5 cards are verified at 10/10 (aggregate 740/740). The winning source is the re-audit of 2026-09-09 (`docs/audits/EX5-REAUDIT-LEDGER.md`, `1edc556bf`, with the run log and per-card reports under `docs/audits/EX5-reaudit/`, `8d9fb67af`), which was run from base `afa3ab2f451245fb03bf4e3f895ead8807f18df1` and did not inherit prior scores. It supersedes the earlier `docs/audits/EX5-AUDIT.md` of 2026-09-04, which reported the same 74/74 result from a different evidence pass. Two engine investigations opened during the run (Q5393 stack rotation for EX5-001 and Q3528 once-per-turn identity for EX5-007) were both closed as fixture errors, and every production engine edit proposed for them was withdrawn. The engine seam queue is empty. One narrow evidence limitation remains, listed under Open items.

## Gates

Copied from `docs/audits/EX5-reaudit/RUN.md` (`8d9fb67af`), sections "Baseline measured before worker acceptance", "2026-09-09 final coordinator gate", and "2026-09-09 strict TypeScript follow-up".

Baseline:

- `pnpm install --offline --frozen-lockfile`: exit 0; 423 packages reused.
- `pnpm effects:check:set -- --set EX5 --base afa3ab2f451245fb03bf4e3f895ead8807f18df1`: 74 records synchronized; zero EX5 semantic changes and zero changes outside EX5.
- Serial EX5 collection: 74 files / 364 tests passed.
- Serial workspace typecheck with a 4096 MB heap: exit 0 for shared, API, and web.

Final coordinator gate:

- Complete EX5 collection: 74 files and 548 tests passed serially with one worker.
- Mechanism regression: 4 files and 512 tests passed serially.
- Broad engine regression: 229 files and 6,778 tests passed serially.
- Workspace TypeScript check passed.
- Effects synchronization check: 14 semantic EX5 changes, zero semantic or byte changes outside EX5, 74 synchronized records; its 18 tool tests pass.
- Scoped Oxlint and Oxfmt checks pass, as does `git diff --check`.

Strict TypeScript follow-up:

- `// @ts-nocheck` removed from all 72 EX5 modules that still carried it; the set now contains zero such directives.
- Full API typecheck passes, the complete EX5 collection remains green at 74 files and 548 tests, and all 74 effects records are synchronized with zero changes outside EX5.

Per-card scoped gates recorded in each card section below use this shape:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-NNN.test.ts --maxWorkers=1 --no-file-parallelism
pnpm exec oxlint apps/api/src/cards/EX5/EX5-NNN.ts apps/api/src/cards/EX5/EX5-NNN.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-NNN.ts apps/api/src/cards/EX5/EX5-NNN.test.ts
git diff --check -- apps/api/src/cards/EX5/EX5-NNN.ts apps/api/src/cards/EX5/EX5-NNN.test.ts
```

## Card ledger

Scores are the final ones from `docs/audits/EX5-REAUDIT-LEDGER.md`; the per-card sections merge the reports in `docs/audits/EX5-reaudit/`. Card reports were written by worker lanes that could not award delivery gates, so many of them still read "8/10", "provisional", or "pending final coordinator gate". Those notes are superseded by the table below and by the Gates section: the coordinator awarded the delivery points after the closing gates passed, and every card is 10/10.

| Card    | Name                                 | Catalog/rules | IR trace | Behavioral proof | Peer/stack | Gates | Total | Status                                                                                                                                                           |
| ------- | ------------------------------------ | ------------- | -------- | ---------------- | ---------- | ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EX5-001 | Sunmon                               | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; paid reduced evolution and effect-only provenance corrected; Q3526/Q5393 public paths and legal rotation stack pass; 6 focused tests green          |
| EX5-002 | Moonmon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; paid evolution cost corrected; 8 focused tests cover both traits, public play, refusal, legality, turn ownership and peer stack; focused gate green |
| EX5-003 | Nyaromon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; public attack/turn-loop DP aura, both players, legal evolution and peer stack proof green; no card Q&A returned                                     |
| EX5-004 | Frimon                               | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; legal Leomon/non-Leomon stacks, public attacks, same-turn refusal and next-own-turn OPT reset pass; no card Q&A returned                            |
| EX5-005 | Tokomon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; public own/opponent-turn battle deletion, exact draw boundary and legal evolution stack pass; no card Q&A returned                                  |
| EX5-006 | Xiaomon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; public effect-play/manual boundary, same-turn refusal, next-turn reset and legal evolution stack pass; no card Q&A returned                         |
| EX5-007 | Coronamon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; Q3526-Q3528 public paths pass; per-copy OPT rotation blocks spent source and resets next own turn; 6 focused tests green                            |
| EX5-008 | Firamon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; public On Play/When Digivolving reveal paths cover Q3529/Q3530 mandatory trait buckets, order and inherited stack DP                                |
| EX5-009 | Indramon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; Q3531-Q3536 public breeding play/movement/restriction proof, optionality and legal inherited stack pass; 9 focused tests green                      |
| EX5-010 | Sandiramon                           | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; Q3537-Q3542 breeding/name/restriction proofs, public deletion boundary, optional refusal and inherited stack pass; 14 focused tests green           |
| EX5-011 | Pajiramon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; Q3543-Q3548 breeding/name/restriction proofs, conditional deletion memory, optional refusal and inherited stack pass; 10 focused tests green        |
| EX5-012 | Flaremon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; split intrinsic play/into reductions fixes Q3549; exact traits/source counts, deletion boundaries and inherited DP pass; 14 tests green             |
| EX5-013 | Zhuqiaomon                           | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; Q3550 inclusive Deva/6000-DP cost, Counter, shared OPT/reset, optional refusal and highest-DP deletion pass; 9 tests green                          |
| EX5-014 | Apollomon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; public Q3551 multi-check timing, scaling, DP boundary, legal color routes and next-turn OPT reset pass; 9 tests green                               |
| EX5-015 | Gabumon (X Antibody)                 | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; Q3552-Q3554 reveal semantics, public On Play/alternate evolution, conditional trash and battle replacement pass; 7 tests green                      |
| EX5-016 | Lunamon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/rulings mapped; 12 focused tests green; Q3555-Q3559, optionality, legal routes and public timing proven                                                  |
| EX5-017 | Lekismon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Re-reviewed; Q3560/Q3561 mandatory reveal buckets, public On Play/When Digivolving, order, inherited DP and legal stacks pass; 8 tests green                     |
| EX5-018 | Garurumon (X Antibody)               | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/rulings mapped; 7 focused tests green; draw/trash/memory, battle replacement and real OPT reset proven                                                   |
| EX5-019 | Antylamon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/rulings mapped; 10 focused tests green; Q3563-Q3568, restrictions and inherited OPT proven                                                               |
| EX5-020 | Crescemon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/rulings mapped; 8 focused tests green; Q3569 destination reduction and both evolution routes proven                                                      |
| EX5-021 | Majiramon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/rulings mapped; 10 focused tests green; Q3570-Q3576 and Q5503-Q5506 proven                                                                               |
| EX5-022 | Mihiramon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/rulings mapped; 12 focused tests green; Q3577-Q3582, play restrictions, watchers and inherited OPT proven                                                |
| EX5-023 | WereGarurumon (X Antibody)           | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/rulings mapped; 9 focused tests green; Q3583, public evolution, refusal and inherited OPT proven                                                         |
| EX5-024 | Azulongmon                           | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog and full IR mapped; 5 focused tests green; public On Play/evolution/deletion and exact boundaries proven                                                 |
| EX5-025 | Dianamon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3584-Q3587 mapped; 5 focused tests green; public evolution, source trash, live restriction and release boundaries proven                                |
| EX5-026 | MetalGarurumon (X Antibody)          | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3588-Q3590 mapped; 8 focused tests green; conditional aura, Blocker and trash-return deletion proven                                                    |
| EX5-027 | Liollmon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3591 mapped; 8 focused tests green; security reveal/recovery/shuffle, evolution routes and inherited deletion proven                                    |
| EX5-028 | Kudamon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3592 mapped; 6 focused tests green; threshold play and inherited OPT/reset proven                                                                       |
| EX5-029 | Reppamon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3593 mapped; 5 focused tests green; security cost and next evolution reduction proven                                                                   |
| EX5-030 | Liamon                               | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3594 mapped; 8 focused tests green; normal/alternate evolution, attack limits and inherited deletion proven                                             |
| EX5-031 | Chirinmon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3595-Q3596 mapped; 5 focused tests green; public security cost, legal evolution and deletion-recovery boundaries proven                                 |
| EX5-032 | LoaderLeomon                         | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 6 focused tests green; public DP, inherited Blocker and Fortitude source boundary proven                                                 |
| EX5-033 | Mitamamon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3597-Q3599 mapped; 5 focused tests green; shared OPT/reset, dynamic threshold, Barrier and play/Rush proven                                             |
| EX5-034 | BanchoLeomon                         | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3600 mapped; 6 focused tests green; threshold play, suspend and optional package proven                                                                 |
| EX5-035 | Hawkmon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 5 focused tests green; Fortitude reveal/evolution and inherited DP proven                                                                |
| EX5-036 | Aquilamon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 5 focused tests green; public Fortitude replay, evolution and inherited DP proven                                                        |
| EX5-037 | Vajramon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3601-Q3607/Q5507 mapped; 9 focused tests green with public legal Piercing lapse proof                                                                   |
| EX5-038 | Vikaralamon                          | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3608-Q3613 mapped; 8 focused tests green; breeding restrictions, watcher OPT and inherited Piercing proven                                              |
| EX5-039 | Garudamon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3614 mapped; 5 focused tests green with public current-DP threshold proof                                                                               |
| EX5-040 | Kumbhiramon                          | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3615-Q3620 mapped; 8 focused tests green; breeding, watcher OPT and inherited Piercing proven                                                           |
| EX5-041 | Ebonwumon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 7 focused tests green; scaled suspend/lock, Blast and deletion proven                                                                    |
| EX5-042 | Merukimon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 5 focused tests green; Fortitude reveal/play and Rush boundaries proven                                                                  |
| EX5-043 | Leopardmon (X Antibody)              | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3621-Q3622 mapped; 7 focused tests green; shared OPT, play reduction and bounce scaling proven                                                          |
| EX5-044 | Elecmon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 7 focused tests green; reveal, evolution routes and inherited De-Digivolve proven                                                        |
| EX5-045 | Chuumon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 7 focused tests green; public opponent-turn play, Sukamon reveal/refusal and inherited boundaries proven                                 |
| EX5-046 | Targetmon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3623-Q3624 mapped; 5 focused tests green; Blocker, public effects and evolution boundaries proven                                                       |
| EX5-047 | Leomon                               | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 6 focused tests green; public attack evolution, optionality, De-Digivolve stack ordering and evolution boundaries proven                 |
| EX5-048 | Etemon                               | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3625 mapped; 9 focused tests green; public forced-attack timing, inherited reveal and alternate evolution paths proven                                  |
| EX5-049 | GrapLeomon                           | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; 7 focused tests green; public On Play, evolution, Fortitude and target boundaries proven                                                 |
| EX5-050 | Sinduramon                           | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3626-Q3631 mapped; focused suite green; breeding, restrictions and inherited Blocker proven                                                             |
| EX5-051 | Caturamon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3632-Q3637 mapped; focused suite green; breeding suppression, movement lock and inherited Blocker proven                                                |
| EX5-052 | Makuramon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3638-Q3643 mapped; 7 focused tests green; public persistent Option, deletion watcher and evolution boundaries proven                                    |
| EX5-053 | Baihumon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3644-Q3645 mapped; 5 focused tests green; security play OPT, deletion superlative and evolution boundaries proven                                       |
| EX5-054 | MetalEtemon                          | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3646-Q3647 mapped; 9 focused tests green; public evolution, security cost, attack switch and inherited deletion proven                                  |
| EX5-055 | HeavyLeomon                          | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3648 mapped; 7 focused tests green; public Fortitude replay, one-shot On Deletion and evolution boundaries proven                                       |
| EX5-056 | Syakomon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3649 mapped; 6 focused tests green; public by-effect provenance, control baseline and Once Per Turn boundary proven                                     |
| EX5-057 | Labramon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3650 mapped; 6 focused tests green; public effect-play provenance, real next-turn OPT reset and evolution boundaries proven                             |
| EX5-058 | Octomon                              | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3651-Q3654/Q3834/Q6034 mapped; 10 focused tests green; public evolution, by-effect OPT/reset and Crimson Blaze boundaries proven                        |
| EX5-059 | Dobermon (X Antibody)                | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3655-Q3656 mapped; 6 focused tests green; public evolution, own/granted On Play reactivation and inherited watcher proven                               |
| EX5-060 | Dragomon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3657-Q3659/Q4663-Q4676/Q5227-Q5228 mapped; 10 focused tests green; public play/evolution, Fortitude and Piercing paths proven                           |
| EX5-061 | Cerberusmon (X Antibody)             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3660 mapped; 8 focused tests green; public own/granted On Play reactivation, revival and deletion watcher proven                                        |
| EX5-062 | Anubismon                            | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3661-Q3665 mapped; 9 focused tests green; public evolution/Main, same-card trash/play, refusal and effect-play boundary proven                          |
| EX5-063 | Leviamon                             | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3666-Q3667/Q4735/Q6035-Q6039 mapped; 8 focused tests green; conditional deletion, legal evolution and controller-relative watcher proven                |
| EX5-064 | Koh & Sayo                           | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3668/Q4931/Q5212/Q5393 mapped; 10 focused tests green; public turn loop, placement, refusal and legal breeding rotation proven                          |
| EX5-065 | Sayo & Koh                           | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3669-Q3670 mapped; focused suite green; public Security route and conditional placement proven                                                          |
| EX5-066 | Phoebus Blow                         | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3671 mapped; 7 focused tests green; public Main/Security, source trash and attack restriction paths proven                                              |
| EX5-067 | Good Night Moon                      | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3672-Q3673 mapped; 7 focused tests green; public Main/Security, no-target and Night Claw Tamer paths proven                                             |
| EX5-068 | Flashy Boss Punch                    | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/full IR mapped; focused suite green; Security resolved through a public attack without injected timing                                                   |
| EX5-069 | Biting Crush                         | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3674-Q3678/Q4735 mapped; 5 focused tests green; public Main placement, bound cost and exact-name Delay boundaries proven                                |
| EX5-070 | X Antibody Proto Form                | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3679-Q3682/Q4260 mapped; 8 focused tests green; public placement and inherited replacement boundaries proven                                            |
| EX5-071 | Loyalty Deeper than the Sea          | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3683-Q3684 mapped; 6 focused tests green; public placement/hand decision and Delay endpoints proven                                                     |
| EX5-072 | Holy Beasts Great Cardinal Positions | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3685 mapped; 8 focused tests green; public Main/Security routes and Four Sovereigns placement boundaries proven                                         |
| EX5-073 | GraceNovamon                         | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3686-Q3689 mapped; 10 focused tests green; public DNA, deletion replacement and attack boundaries proven                                                |
| EX5-074 | Fanglongmon                          | 2             | 2        | 2                | 2          | 2     | 10/10 | Catalog/Q3690-Q3691 mapped; 6 focused tests green; public On Play/attack, one-card boundary and immunity proven                                                  |

### EX5-001 — Sunmon

#### Printed contract and sources

The catalog entry for EX5-001 (Sunmon) states:

> [Your Turn] [Once Per Turn] When an effect places the top card of this Digimon in its digivolution cards, this Digimon may digivolve into a Digimon card in your hand with the digivolution cost reduced by 1.

Local KB evidence:

- Q3526: the trigger covers an effect placing a digivolution card or the host's top card into this host's digivolution cards, such as EX5-007 Coronamon's inherited effect; ordinary digivolution is excluded.
- Q5393: when EX5-064 Koh & Sayo promotes the only Sunmon stack card out of the stack and then effect-digivolves that host, Sunmon cannot activate retroactively.

#### Clause-to-proof mapping

| Clause | Proof | IR mapping |
| --- | --- | --- |
| Your Turn inherited effect | Structural assertion in `EX5-001.test.ts` | `trigger: "YourTurn"`, `isInherited: true` |
| Once Per Turn | Structural assertion in `EX5-001.test.ts` | `frequency: "OncePerTurn"` |
| Effect-only placement | Public EX5-007 placement test; ordinary public digivolution negative | `SubTrigger(event: "onAddDigivolutionCards", sourceFilter: { isSelfRef: true, byEffect: true })` |
| This Digimon may digivolve from hand | Public EX5-007 placement test and optional-decline test | `Digivolve(target.isSelf, from: ["hand"], optional: true)` |
| Cost reduced by 1 and still paid | Public test leaves memory at 1 after EX5-007 gains 2 and BT1-014 costs 2 | `payCost: true`, `reduceCost: 1` |
| Receiver must be this host | Cross-host negative and public placement fixture | `sourceFilter.isSelfRef: true` |
| Q3526 | EX5-007's inherited top-card rotation is exercised through `activateEffect` | `onAddDigivolutionCards` effect provenance gate |
| Q5393 | Public EX5-064 route rotates EX5-007 away, promotes Sunmon, then completes the legal level-3 evolution without consuming a later compatible card | `EX5-064` public play, stack/zones, memory, and hand assertions |

#### Changes

- Added `sourceFilter.byEffect: true` so ordinary digivolution-card additions cannot trigger Sunmon.
- Added `payCost: true`; before this fix the effect-driven digivolution was free despite `reduceCost: 1`.
- Replaced synthetic `fireSubTrigger` tests with public intents and settled observable state assertions.
- Added positive, optional-decline, ordinary-digivolution negative, cross-host negative, and passing Q5393 coverage.
- The module registers only through `registerIrCard("EX5-001", compiled)`.

#### Verification

Focused command (serial):

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-001.test.ts --maxWorkers=1 --no-file-parallelism
```

Result after the fixes: `1 passed` test file; `6 passed` tests.

Scoped gates:

- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-001.ts apps/api/src/cards/EX5/EX5-001.test.ts docs/audits/EX5-reaudit/EX5-001.md` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-001.ts apps/api/src/cards/EX5/EX5-001.test.ts docs/audits/EX5-reaudit/EX5-001.md` — passed.
- `git diff --check -- apps/api/src/cards/EX5/EX5-001.ts apps/api/src/cards/EX5/EX5-001.test.ts docs/audits/EX5-reaudit/EX5-001.md` — passed.
- Workspace typecheck and broad suites were not run by this card lane, per the worker brief and RAM guard.

#### Q5393 mechanism conclusion

The EX5-064 public route uses legal level-3 `BT1-013` after rotating the level-3 host away and promoting level-2 Sunmon. The engine projects the promoted base for evolution legality, moves `EX5-007` to the bottom of the stack, and completes the reduced-cost evolution. The later compatible level-4 `BT1-014` remains in hand, proving Sunmon did not react retroactively after it left the top of the stack. The focused engine mechanism regression and EX5-064 suite provide additional coverage; no engine gap remains for this card.

The test suite does not claim a public same-turn/next-turn reset proof for the once-per-turn ledger; the structural `frequency: "OncePerTurn"` assertion passes, and the once-per-turn limitation is documented rather than replaced with an artificial reset fixture.

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog / rules | 2/2 |
| IR trace | 2/2 |
| Behavioural proof | 2/2 |
| Peer / stack proof | 2/2 |
| Delivery gates (coordinator-owned) | 0/2 |
| **Worker total** | **8/10** |


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-002 — Moonmon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-002` is a blue level-2 Digi-Egg with the inherited clause:

> [Your Turn] [Once Per Turn] When you play a Tamer with the [Night Claw]/[Light Fang] trait, this Digimon may digivolve into a Digimon card in your hand.

The clause does not say “without paying the cost”, so the effect-driven evolution pays the destination card's normal digivolution cost and still observes its printed evolution requirements.

Knowledge-base query: `node tools/kb/query.mjs card EX5-002` returned `(no knowledge-base entries)`. There are no EX5-002 Q&A IDs to cover. The rules query `node tools/kb/query.mjs rules "Night Claw"` returned no matching rule chunks.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-002.ts` registers only `registerIrCard("EX5-002", compiled)`.

The inherited `YourTurn` effect is `frequency: "OncePerTurn"` and installs a `whenPlayed` subtrigger restricted to an own Tamer whose exact trait is `Night Claw` or `Light Fang`. Its self-targeted `Digivolve` takes a Digimon from the controller's hand, is optional, and now explicitly sets `payCost: true`.

The audit fixed the previous silent free-evolution behavior by adding `payCost: true`. No engine, shared, catalog, or knowledge-base files were changed, and no engine seam remains open for this card.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-002.test.ts` proves:

| Clause | Public behavioral proof |
| --- | --- |
| Night Claw trigger | Playing `EX5-065` evolves the real stack from `BT1-029 + EX5-002` into `BT1-032`. Memory decreases by the Tamer play cost (3) and evolution cost (2). |
| Light Fang trigger | Playing `EX5-064` follows the same path and pays 4 + 2 memory. |
| Final zones and stack | `EX5-002` and the prior top remain in the stack, the evolution leaves hand, the normal evolution draw of inert main-deck Digimon `BT1-009` is observed, and no decision remains pending. |
| Optionality | Declining the effect leaves the host and evolution card unchanged; only the Tamer play cost is paid. |
| Exact filters and legality | An unrelated `BT1-087` Tamer does not trigger; an incompatible red level-4 `BT1-014` is not offered from a blue level-3 base. |
| Turn ownership | A matching Tamer played during the opponent's real production turn does not trigger Moonmon. |
| Peer isolation | With an `EX5-001`-bearing peer stack beside Moonmon, only the Moonmon-bearing stack evolves; the peer stack and its hand card remain unchanged. |

The stack fixture uses a legal main-deck Digimon as the host, uses inert main-deck Digimon `BT1-009` for the evolution draw, and places the Digi-Egg only under the host; no Digi-Egg is placed in security or a deck.

The once-per-turn identity is asserted in the IR. A same-source second trigger after a successful evolution cannot be observed through a legal stack because Moonmon is no longer the top card and therefore no longer grants its inherited effect; this is a fixture limitation, not an implementation gap.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-002.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 8 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-002.ts apps/api/src/cards/EX5/EX5-002.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-002.ts apps/api/src/cards/EX5/EX5-002.test.ts` — **passed**.
- `git diff --check` — **passed**.
- Workspace typecheck and broad suites were not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog text and card identity verified; KB accurately reports no Q&A. |
| IR trace | 2/2 | Exact controller, kind, trait, turn, frequency, self-target, hand source, optionality, and normal cost are encoded. |
| Behavioral proof | 2/2 | Both traits, paid costs, stack/zones, draw, optional refusal, negative filters, requirements, and opponent-turn boundary pass through public intents. |
| Peer/stack proof | 2/2 | Legal and illegal stack transitions plus a comparative `EX5-001` peer stack prove source isolation; the once-per-turn limitation is explicitly documented rather than replaced with an impossible reset fixture. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-003 — Nyaromon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-003` is a green level-2 Digi-Egg with the inherited clause:

> [All Turns] While this Digimon is suspended, it gets +1000 DP.

Knowledge-base query: `node tools/kb/query.mjs card EX5-003` returned `(no knowledge-base entries)`. There are no EX5-003 Q&A IDs to cover. The rules query `node tools/kb/query.mjs rules "While this Digimon is suspended"` returned the comprehensive-rules processing-condition material, including §15-6's suspended-state example.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-003.ts` registers only `registerIrCard("EX5-003", compiled)`.

The module encodes an inherited `AllTurns` effect with a self-only target, `modifyDP` amount `1000`, and the processing condition `selfIsSuspended`. No implementation change was required; the existing IR matches the catalog clause exactly.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-003.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog definition, color, kind, level, DP, and exact inherited text are asserted alongside the IR shape. |
| +1000 DP while suspended | A suspended `BT1-009` host carrying `EX5-003` changes from 3000 to 4000 DP. |
| All Turns | A second player’s suspended host carrying `EX5-003` also receives +1000 DP while the first player’s turn is active. |
| Condition removal/reapplication | Public attack intents suspend each host, and the real `runOneTurn` turn loop's ActivePhase unsuspends the owning host on its next turn; the aura withdraws at 3000 DP and reapplies at 4000 DP. The test explicitly hands off `state.turnSeat` because `runOneTurn` is a one-turn seam and does not advance the seat itself. |
| Self-only targeting | A suspended peer `BT1-009` without `EX5-003` remains at 3000 DP. |
| Evolution-stack continuity | A legal red level-3 `BT1-009` evolves into red level-4 `BT1-014` for 2 memory; the stack remains `[EX5-003, BT1-009]`, the normal evolution draw is inert `BT1-009`, and the evolved host receives 4000/5000 DP unsuspended/suspended. |

The fixtures place `EX5-003` only under battle-area hosts. No Digi-Egg is placed in a deck or security; the deck draw uses inert main-deck Digimon `BT1-009`.

The peer stack and legal evolution route provide comparative and source-stack proof. No once-per-turn, optional, security, or engine seam applies to this card.

#### Verification

- `node tools/kb/query.mjs card EX5-003` — **no knowledge-base entries**.
- `node tools/kb/query.mjs rules "While this Digimon is suspended"` — **matched comprehensive §15-6 processing-condition material**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-003.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 3 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-003.ts apps/api/src/cards/EX5/EX5-003.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-003.ts apps/api/src/cards/EX5/EX5-003.test.ts` — **passed**.
- `git diff --check` — **passed**.
- Workspace typecheck and broad suites were not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog fields, printed clause, comprehensive processing-condition rule, and no-Q&A result verified. |
| IR trace | 2/2 | Inherited all-turns self aura, exact +1000 amount, and suspended condition are encoded. |
| Behavioral proof | 2/2 | Suspended/unsuspended boundaries, both turn owners, exact DP endpoints, and pending-free resolution pass. |
| Peer/stack proof | 2/2 | Non-source peer isolation and a legal evolution stack with source identity, cost, draw, and post-evolution aura pass. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-004 — Frimon

#### Printed contract and sources

The catalog entry for EX5-004 (Frimon) states:

> [When Attacking] [Once Per Turn] If this Digimon has [Leomon] in its name, ＜Draw 1＞ (Draw 1 card from your deck).

Catalog facts verified in `packages/shared/src/cards/data/cards.json`:

- Green level-2 Digi-Egg, play cost `-1`, 0 DP.
- Form `In-Training`, type `Lesser`.
- The only printed clause is the inherited When Attacking condition and draw.

The local knowledge-base query `node tools/kb/query.mjs card EX5-004` returned no knowledge-base entries. No EX5-004 Q&A IDs are listed for this card, so there are no additional ruling clauses to cover.

#### Clause-to-proof mapping

| Clause | Public proof | IR mapping |
| --- | --- | --- |
| Inherited When Attacking effect | A legal stack with Frimon under green Lv.3 `BT1-066` and green Lv.4 `BT4-055` Leomon attacks through a public attack intent | `trigger: "WhenAttacking"`, `isInherited: true` |
| Once Per Turn | The same Leomon stack attacks, is unsuspended by public On Play `BT1-036`, then attacks again in the same turn without a second draw; after the real opponent turn and own unsuspend phase, its next attack draws again | `frequency: "OncePerTurn"` |
| Exact `[Leomon] in its name` condition | A parallel legal stack ending in non-Leomon `BT1-074` Togemon attacks without drawing | `condition: { kind: "selfHasNameContaining", names: ["Leomon"] }` |
| Draw 1 from own deck | The first and next-turn attacks move the named deck cards into the controller's hand; the same-turn card remains in the deck | `Draw`, `controller: "mine"`, `amount: 1` |

#### Implementation and behavioral evidence

`apps/api/src/cards/EX5/EX5-004.ts` already had the faithful compiled IR and registers only through `registerIrCard("EX5-004", compiled)`. No card implementation or engine change was needed.

The colocated tests now use only public intents and settled observable state:

- Catalog and IR assertions verify identity, Digi-Egg metadata, inherited timing, frequency, condition, controller, and amount.
- The positive stack uses the legal evolution path Frimon (green Lv.2) → `BT1-066` (green Lv.3) → `BT4-055` Leomon (green Lv.4). It asserts both source cards remain in the stack, the Leomon stack draws `BT1-010`, the attacker suspends, and no decision remains pending.
- The comparative stack uses the same legal source path but ends in non-Leomon `BT1-074` Togemon. Its attack does not draw `BT1-011`, which remains in the deck.
- The once-per-turn proof uses public `BT1-036` Garurumon play to unsuspend the attacked Leomon. The second attack in the same turn does not draw `BT1-011`; after passing through the opponent's real turn and the owner's next unsuspend phase, the next attack draws `BT1-012`.
- Every security and deck fixture uses main-deck Digimon. No Digi-Egg is placed in security or a deck.

No engine gap remains for EX5-004.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-004.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 3 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-004.ts apps/api/src/cards/EX5/EX5-004.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-004.ts apps/api/src/cards/EX5/EX5-004.test.ts docs/audits/EX5-reaudit/EX5-004.md` — passed.
- `git diff --check -- apps/api/src/cards/EX5/EX5-004.ts apps/api/src/cards/EX5/EX5-004.test.ts docs/audits/EX5-reaudit/EX5-004.md` — passed.
- Workspace typecheck and broad suites were not run by this card lane, per the worker brief and RAM guard.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog metadata and the complete inherited clause are asserted; the local KB has no EX5-004 entries. |
| IR trace | 2/2 | Trigger, inheritance, frequency, exact name condition, own controller, and draw amount are encoded and structurally asserted. |
| Behavioral proof | 2/2 | Positive draw, exact near-miss negative, same-turn refusal, next-own-turn reset, final zones, stack identity, and pending-state checks pass through public intents. |
| Peer / stack proof | 2/2 | Both positive and negative cases use legal green evolution stacks with Frimon as the inherited source and compare Leomon against a non-Leomon peer. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-005 — Tokomon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-005` is a black level-2 Digi-Egg with the inherited clause:

> [On Deletion] If it's your opponent's turn, ＜Draw 1＞ (Draw 1 card from your deck).

Knowledge-base query: `node tools/kb/query.mjs card EX5-005` returned `(no knowledge-base entries)`. There are no EX5-005 Q&A IDs to cover. The rules query `node tools/kb/query.mjs rules "If it's your opponent's turn"` returned comprehensive §15-16-8 timing material defining [Your Turn] and [Opponent's Turn].

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-005.ts` registers only `registerIrCard("EX5-005", compiled)`.

The existing module encodes an inherited `OnDeletion` effect that draws exactly one card for the owner, conditioned on `isOpponentsTurn`. No implementation change was required; the IR matches the catalog clause exactly.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-005.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog definition, black color, Digi-Egg kind, level, DP, and exact inherited text are asserted alongside the IR shape. |
| Opponent-turn deletion draw | A public opponent attack deletes the suspended 3000-DP host carrying `EX5-005`; its face-up source cards reach trash and the owner's exact inert deck card reaches hand. |
| Your-turn boundary | A public attack by the host into a suspended 4000-DP opponent deletes the host during its own turn; the owner's hand remains empty while the source stack reaches trash. |
| Evolution-stack continuity | A legal red level-3 `BT1-009` evolves into red level-4 `BT1-014` for 2 memory, draws the inert `BT1-010`, preserves stack order `[EX5-005, BT1-009]`, and then triggers the inherited draw when the evolved host is deleted during the opponent's public attack. |
| Evolution legality boundary | A public digivolution from a level-3 `BT1-009` into another level-3 `BT1-013` is rejected without changing the host stack, hand, memory, or pending state. |
| Resolution safety | Each public battle path settles fully, asserts exact endpoints, has no pending decision, and reports no active attack. |

The fixtures use only inert main-deck Digimon `BT1-009` through `BT1-014` for deck/security cards; no Digi-Egg is placed in a deck or security. No injected deletion verb or injected timing is used for behavioral credit.

#### Verification

- `node tools/kb/query.mjs card EX5-005` — **no knowledge-base entries**.
- `node tools/kb/query.mjs rules "If it's your opponent's turn"` — **matched comprehensive §15-16-8 turn-timing material**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-005.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 4 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-005.ts apps/api/src/cards/EX5/EX5-005.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-005.ts apps/api/src/cards/EX5/EX5-005.test.ts` — **passed**.
- `git diff --check` — **passed**.
- Workspace typecheck and broad suites were not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog fields, printed clause, comprehensive turn-timing rule, and no-Q&A result verified. |
| IR trace | 2/2 | Inherited deletion trigger, exact one-card draw, owner controller, and opponent-turn condition are encoded. |
| Behavioral proof | 2/2 | Public battle deletion proves the positive and own-turn negative boundaries with exact hand/trash endpoints and settled state. |
| Peer/stack proof | 2/2 | A legal evolution stack preserves the inherited source and proves the clause after evolution during a public opponent battle. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-006 — Xiaomon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-006` is a purple level-2 Digi-Egg with the inherited clause:

> [Your Turn] [Once Per Turn] When an effect plays one of your Digimon, ＜Draw 1＞ (Draw 1 card from your deck).

Knowledge-base query: `node tools/kb/query.mjs card EX5-006` returned `(no knowledge-base entries)`. There are no EX5-006 Q&A IDs to cover. The rules query for the effect-play trigger matched comprehensive trigger-state material (§15-8-3-8 and §15-8-3-9-3); the `Once Per Turn` query matched the glossary and comprehensive §15-14-1 definition.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-006.ts` registers only `registerIrCard("EX5-006", compiled)`.

The existing module encodes an inherited `YourTurn` effect with `OncePerTurn` frequency, a `whenPlayed` sub-trigger restricted to your Digimon played by effect, and an exact one-card owner draw. No implementation change was required; the IR matches the catalog clause exactly.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-006.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog definition, purple color, Digi-Egg kind, level, DP, and exact inherited text are asserted alongside the IR shape. |
| Effect-play trigger | Publicly playing `EX5-058` causes its On Play effect to create an own Fujitsumon Digimon token; the first token consumes exactly the named deck card into hand. |
| Effect-only boundary | A manually played `BT1-010` enters the battle area while the watcher card remains in the deck and the hand remains empty. |
| Once Per Turn | A second public effect-played token in the same turn does not draw a second card; after a real opponent loop and next own turn, a third token draws again. |
| Evolution-stack continuity | A legal red level-3 `BT1-009` evolves into red level-4 `BT1-014` for 2 memory, draws the inert `BT1-010`, preserves stack `[EX5-006, BT1-009]`, and still draws when the evolved host's effect-played token is created. |
| Evolution legality boundary | A public level-3 `BT1-009` → level-3 `BT1-013` route is rejected without changing the host stack, memory, or pending state. |
| Resolution safety | All public paths settle fully and assert no pending decision. |

The fixtures use only inert main-deck Digimon `BT1-009` through `BT1-014` for deck cards; no Digi-Egg is placed in a deck or security. The effect-play proof uses the production `EX5-058` token effect and no injected `playInstances`, timing, or verb seam.

#### Verification

- `node tools/kb/query.mjs card EX5-006` — **no knowledge-base entries**.
- `node tools/kb/query.mjs rules "When an effect plays one of your Digimon"` — **matched comprehensive trigger-state material**.
- `node tools/kb/query.mjs rules "Once Per Turn"` — **matched glossary and comprehensive §15-14-1 frequency material**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-006.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 5 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-006.ts apps/api/src/cards/EX5/EX5-006.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-006.ts apps/api/src/cards/EX5/EX5-006.test.ts` — **passed**.
- `git diff --check` — **passed**.
- Workspace typecheck and broad suites were not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog fields, printed clause, comprehensive trigger/frequency rules, and no-Q&A result verified. |
| IR trace | 2/2 | Inherited YourTurn timing, OncePerTurn frequency, effect-play Digimon filter, and exact one-card draw are encoded. |
| Behavioral proof | 2/2 | Public effect-play positive path, manual-play negative, same-turn refusal, next-own-turn reset, exact deck/hand endpoints, and settled decisions pass. |
| Peer/stack proof | 2/2 | Legal evolution preserves the inherited source and trigger; an invalid source level is rejected without mutation. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-007 — Coronamon

#### Printed contract and ruling sources

The catalog entry for EX5-007 (Coronamon) states:

> [Start of Your Main Phase] If you have a Tamer with the [Light Fang]/[Night Claw] trait, gain 1 memory.
>
> Inherited: [Main] [Once Per Turn] By placing the top card of this Digimon with the [Light Fang]/[Night Claw] trait as this Digimon's bottom digivolution card, gain 2 memory.

Catalog facts verified in `packages/shared/src/cards/data/cards.json`:

- Red level-3 Digimon, play cost 3, 1000 DP, form Rookie, types Beast and Light Fang.
- Printed evolution routes are red Lv.2 for 0 memory or blue Lv.2 for 0 memory.
- The Start of Your Main Phase clause is a normal effect; the rotating Main clause is inherited and once per turn.

The local knowledge base returns all three required rulings:

- Q3526: effect placement of a digivolution card or the host's top card into this host's stack triggers effects that care about effect placement, unlike ordinary digivolution.
- Q3527: the top card is moved to the bottom of that Digimon's stack and the prior topmost digivolution card is promoted.
- Q3528: the once-per-turn activation record remains even when the source card stops being a digivolution card, preventing infinite memory.

#### Clause-to-proof mapping

| Clause / ruling | Public proof | IR mapping |
| --- | --- | --- |
| Start of Your Main Phase, own Light Fang/Night Claw Tamer | A real turn loop with own EX5-064 adds 1 memory; an opponent-only EX5-064 does not | `trigger: "StartOfYourMainPhase"`, `GainMemory(1)`, own Tamer trait filter in `zone: "battleArea"` |
| Q3527 top-to-bottom rotation and +2 memory | Public `activateEffect` on a legal EX5-008 over EX5-007 stack promotes EX5-007 and leaves EX5-008 as the bottom stack card | Inherited `Main` effect, `GainMemory(2)`, `place` cost with `position: "bottom"` and `host: "self"` |
| Q3526 effect-placement event | Public EX5-007 activation on EX5-008 over Sunmon/EX5-007 causes the Sunmon effect-placement route and legal BT1-014 evolution; final stack and hand are asserted | The place primitive emits the placement event; EX5-001 observes it through the public route |
| Q3528 once-per-turn prevention and reset | Public two-copy rotation allows each physical EX5-007 one use, blocks cycling back to the already-used source in the same turn, and resets the source ledger on the next own turn | `frequency: "OncePerTurn"` with per-source-instance accounting |
| Exact trait boundary | A legal EX5-007 under non-Light-Fang BT1-014 cannot rotate or gain memory; stack and memory remain unchanged | Cost target requires a self Digimon with exact Light Fang/Night Claw trait |

#### Implementation and behavioral evidence

`apps/api/src/cards/EX5/EX5-007.ts` remains an IR-only module and registers exclusively through `registerIrCard("EX5-007", compiled)`. The audit added the required `zone: "battleArea"` boundary to the Tamer count filter so a matching Tamer is counted only in the battle area, not breeding.

The colocated tests use public intents, real turn loops, and settled observable state:

- Catalog and IR assertions verify all metadata, both clauses, controller, exact trait tokens, optional placement cost, bottom position, and once-per-turn frequency.
- The Q3527 test uses the legal red Lv.3 `EX5-007` → red Lv.4 `EX5-008` stack, activates the visible Main effect, gains exactly 2 memory, promotes EX5-007, and leaves EX5-008 as the bottom stack card.
- The Q3526 test uses the legal stack Sunmon → Coronamon → Firamon, publicly activates Coronamon, observes Sunmon's effect-placement route through its legal reduced-cost evolution into BT1-014, and asserts the final stack, memory, deck draw, hand, and idle state.
- The Q3528 test starts with `top=originalTop`, `stack=[sourceA,sourceB]`; sourceB activates first, sourceA independently activates once, cycling back to spent sourceB is blocked in the same turn, and sourceB activates again after the next own-turn reset, leaving `top=originalTop`, `stack=[sourceA,sourceB]`.
- The start-phase test proves own-Tamer controller scope and rejects an opponent-only matching Tamer.
- The trait-negative test leaves a non-Light-Fang host unchanged after the public activation attempt.
- No Digi-Egg is placed in security or a deck; all deck fixtures are main-deck Digimon.

#### Q3528 physical-copy semantics

The Q3528 record follows the physical source card that activated the inherited
effect. Two EX5-007 copies under one host have independent Once Per Turn
budgets: sourceB's first activation remains spent after sourceB is promoted,
while sourceA may make its own first activation. Once both copies have been
used, cycling back to sourceB in the same turn is blocked. The existing engine
ledger's `(source.instanceId, effectKey)` identity is therefore correct; no
engine change is needed.

#### Verification

- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-007.test.ts src/engine/q3528OncePerTurnIdentity.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 2 files, 7 tests** (6 card tests and 1 engine mechanism regression).
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-007.ts apps/api/src/cards/EX5/EX5-007.test.ts` — passed.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-007.ts apps/api/src/cards/EX5/EX5-007.test.ts docs/audits/EX5-reaudit/EX5-007.md` — passed.
- `git diff --check -- apps/api/src/cards/EX5/EX5-007.ts apps/api/src/cards/EX5/EX5-007.test.ts docs/audits/EX5-reaudit/EX5-007.md` — passed.
- Workspace typecheck and broad suites were not run by this card lane, per the worker brief and RAM guard.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog metadata and Q3526/Q3527/Q3528 rulings are identified and mapped. |
| IR trace | 2/2 | Both clauses, controller/zone scope, exact traits, bottom placement, +1/+2 amounts, inheritance, and frequency are encoded. |
| Behavioral proof | 2/2 | Public positive, negative, Q3526, Q3527, two-copy Q3528 rotation, same-turn source reuse block, and next-turn reset are covered through observable intents/state. |
| Peer / stack proof | 2/2 | Legal evolution stack, Sunmon peer trigger, exact top-to-bottom identity, and non-trait host boundary are asserted. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-008 — Firamon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-008` is a red level-4 Digimon with the effect:

> [On Play] [When Digivolving] Reveal the top 3 cards of your deck. Add 1 card with the [Light Fang] trait and 1 card with the [Night Claw]/[Galaxy] trait among them to the hand. Return the rest to the bottom of the deck.

Its inherited clause is:

> [Your Turn] This Digimon gets +2000 DP.

Knowledge-base query: `node tools/kb/query.mjs card EX5-008` returned two Q&A entries. Q3529 confirms that if only one applicable trait group is revealed, that one card may still be added. Q3530 confirms that when both groups are available, as many applicable cards as possible must be added; the player cannot choose to add only one. No additional rule chunk matched the trait names themselves.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-008.ts` registers only `registerIrCard("EX5-008", compiled)`.

The existing module has separate `OnPlay` and `WhenDigivolving` `RevealAdd` effects, each revealing three, adding one exact `Light Fang` trait card and one exact `Night Claw`/`Galaxy` trait card, and bottoming the remainder. Its inherited `YourTurn` modifier is self-only, +2000 DP, permanent for the active duration. No implementation change was required.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-008.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog identity, red color, level, play cost, DP, exact traits, both printed texts, both trigger records, exact trait-match filters, reveal count, and deck-bottom disposition are asserted. |
| On Play | A public play of Firamon resolves the reveal and adds a Light Fang `EX5-007` plus a Galaxy `EX5-073`; the inert `BT1-009` remainder is returned to the deck bottom. |
| Q3529 | A public On Play reveal with only `EX5-007` matching one group adds that card and leaves the two inert fillers in their original bottom order. |
| Q3530 | The public On Play path with both groups available adds both required cards; no optional refusal is modeled because the ruling makes both additions mandatory when available. |
| When Digivolving | A public `BT1-009` → `EX5-008` digivolution costs 2 memory, resolves the same reveal groups with Night Claw `EX5-016` and Galaxy `EX5-073`, and bottoms the inert remainder. |
| Inherited +2000 DP | The legal stack then evolves `EX5-008` into `BT1-020`; the inherited source remains `[BT1-009, EX5-008]`, giving the level-5 top 8000 DP on the owner’s turn and 6000 DP on the opponent’s turn through real turn loops. |
| Evolution boundary | A public level-4 `BT1-014` → level-4 `EX5-008` route is rejected without changing the host stack, memory, or pending state. |
| Resolution safety | All public paths settle with no pending decision. |

The fixtures contain no Digi-Egg in a deck or security. Neutral remainder cards use inert main-deck Digimon from `BT1-009` through `BT1-014`; trait candidates are the required Light Fang/Night Claw/Galaxy cards. No injected timing or verb seam is used for behavior credit.

#### Verification

- `node tools/kb/query.mjs card EX5-008` — **Q3529 and Q3530 returned and covered above**.
- `node tools/kb/query.mjs rules "Light Fang"`, `"Night Claw"`, `"Galaxy"` — **no standalone rule chunks matched; catalog trait filters and Q&A are the applicable sources**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-008.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 5 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-008.ts apps/api/src/cards/EX5/EX5-008.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-008.ts apps/api/src/cards/EX5/EX5-008.test.ts` — **passed**.
- `git diff --check` — **passed**.
- Workspace typecheck and broad suites were not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Catalog contract, Q3529/Q3530, and exact trait-bucket interpretation verified. |
| IR trace | 2/2 | On Play and When Digivolving reveal effects, exact filters/counts/remainder, and inherited DP modifier match the printed text. |
| Behavioral proof | 2/2 | Public On Play and When Digivolving paths prove both buckets, sole-match behavior, mandatory additions, bottom order, costs, and settled endpoints. |
| Peer/stack proof | 2/2 | Mixed Light Fang/Night Claw/Galaxy/nonmatching pool, legal multi-step evolution stack, turn-duration proof, and invalid source negative pass. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-009 — Indramon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-009` is a red level-5 Digimon with 7000 DP, play cost 7, and the `[Holy Beast]/[Deva]` types. Its printed effects are:

> [On Play] ＜Draw 1＞ (Draw 1 card from your deck). Then, you may play 1 [Deva] trait Digimon card without the same name as the cards in your battle area or trash from your hand to an empty space in your breeding area without paying the cost.
>
> [On Deletion] ＜Draw 1＞ (Draw 1 card from your deck).

Its inherited clause is:

> [Your Turn] While this Digimon has the [Four Sovereigns]/[God Beast] trait, it gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card).

The card knowledge-base query returned six Q&A entries, Q3531 through Q3536. Q3531 defines the same-name scope as Digimon/Tamers in the battle area, effect-placed Option cards, and cards in trash. Q3532 excludes digivolution cards under Digimon and cards under Tamers. Q3533 and Q3535 suppress On Play and when-played references for the breeding-area play. Q3534 retains summoning sickness after a same-turn move from breeding to battle. Q3536 says an active effect-play restriction prevents the play in either area. Relevant rules queries returned the Breeding Area, Breeding Phase, Card Playing Rules, and same-turn attack restriction chunks; no separate card Q&A is missing from the KB output.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-009.ts` registers only `registerIrCard("EX5-009", compiled)`.

The existing compiled IR has a mandatory draw followed by an optional `PlayWithoutCost` from hand, restricted to one own `[Deva]` Digimon, `breeding: true`, and `notSameNameAs: ["battleArea", "trash"]`. It has the independent mandatory On Deletion draw. Its inherited Your Turn aura grants Security Attack +1 only while the top Digimon has the Four Sovereigns or God Beast trait. No module change was required.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-009.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog identity, color, level, cost, DP, types, exact printed texts, trigger records, filters, optionality, breeding endpoint, and inherited keyword are asserted. |
| Q3531 | Public Indramon play draws once and refuses a same-name Deva represented in either the battle area or trash. A structural Option placement fixture is also present for the printed Option scope; the catalog has no same-name Deva Digimon/Option pair for a direct positive collision case. |
| Q3532 | A candidate whose name appears only under a Digimon and under a Tamer is publicly played into breeding; the under-cards do not block it. |
| Q3533/Q3535 | A public effect play of `EX5-051` into breeding proves that its On Play and the `EX5-006` when-effect-played watcher do not fire; the exact draw and breeding endpoints remain observable. |
| Q3534 | Public Indramon play followed by public `P-130` play moves the candidate from breeding to battle, then a public attack intent is rejected for same-turn summoning sickness. |
| Q3536 | A public effect-play restriction from opponent `BT9-047` leaves the candidate in hand and prevents the breeding play while still resolving Indramon's mandatory draw. |
| Optional branch | `autoDeclineOptional` declines only the printed optional Deva play after the mandatory draw, leaving the candidate in hand with no pending decision. |
| Inherited effect and stack | A legal public `EX5-009` → `EX5-013` evolution costs four memory and exposes inherited Security Attack +1 on the Four Sovereigns host. An invalid level-4 source is rejected without changing stack or memory. |
| Resolution safety | Each public flow asserts no pending decision; no behavior credit depends on injected timing or direct production verbs. The only verb call is the explicitly structural Option fixture. |

Fixtures use no Digi-Egg in a deck or security. Neutral cards use inert main-deck Digimon (`BT1-009` through `BT1-014`); trait cards are used only where their printed traits are required.

#### Verification

- `node tools/kb/query.mjs card EX5-009` — **six Q&A entries returned: Q3531–Q3536, all mapped above**.
- `node tools/kb/query.mjs rules "breeding area"` — **relevant Breeding Area and Breeding Phase rules returned**.
- `node tools/kb/query.mjs rules "can't attack the turn they came into play"` — **Card Playing Rules and same-turn attack restriction returned**.
- `node tools/kb/query.mjs rules "can't be played by effects"` — **no exact phrase-specific result; Q3536 is the applicable ruling**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-009.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 9 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-009.ts apps/api/src/cards/EX5/EX5-009.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-009.ts apps/api/src/cards/EX5/EX5-009.test.ts` — **passed** after scoped mechanical formatting of the test file.
- `git diff --check` — **passed**.
- Workspace typecheck and broad suites are intentionally not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract and all six KB Q&A rulings are recorded; relevant breeding and same-turn rules queried. |
| IR trace | 2/2 | Draws, unique Deva filter, battle/trash same-name scope, breeding endpoint, and inherited Security Attack aura match the printed text. |
| Behavioral proof | 2/2 | Public play, restriction, optional decline, breeding suppression, same-turn move/attack rejection, legal evolution, and invalid-source endpoints are covered. |
| Peer/stack proof | 2/2 | Mixed battle/trash/under-card fixtures, effect-play peer/restriction cases, and legal/illegal evolution stack behavior are included. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 (verification commands pending RAM release).**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-010 — Sandiramon

#### Printed contract and rulings

The catalog identifies EX5-010 as the red level-5, 7000 DP Ultimate Deva
Sandiramon. Its clauses are:

- `[On Play]` draw 1, then optionally play one Deva Digimon from hand without
  paying its cost into an empty breeding area, excluding names represented by
  cards in the battle area or trash.
- `[On Deletion]` delete one opposing Digimon with 5000 DP or less.
- Inherited `[Your Turn]`: while the host has the Four Sovereigns or God Beast
  trait, grant Security Attack +1.

The local KB entries Q3537–Q3542 were read in full:

- Q3537 includes all Digimon/Tamers in the battle area, effect-placed Option
  cards in the battle area, and trash in the same-name comparison.
- Q3538 excludes digivolution cards under Digimon and cards under Tamers.
- Q3539 and Q3541 say breeding-area effect plays trigger neither the played
  card's On Play nor ordinary when-played effects.
- Q3540 preserves the same-turn no-attack rule when the breeding card later
  moves to the battle area.
- Q3542 prohibits the play when an effect-play restriction is active.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-010.ts` is a compiled IR-only module registered
exclusively with `registerIrCard("EX5-010", compiled)`. The IR maps the first
clause to `Draw` followed by optional `PlayWithoutCost` from hand with the Deva
trait filter, `breeding: true`, `payCost: false`, and
`notSameNameAs: ["battleArea", "trash"]`. The deletion clause is an opponent
Digimon `dp <= 5000` target. The inherited clause is a `YourTurn` `Aura` that
grants `SecurityAttack +1` only while the live host has either exact trait.

#### Behavioral proof

`apps/api/src/cards/EX5/EX5-010.test.ts` uses public play, deletion,
digivolve, movement, and observable-state paths:

- Catalog metadata and full IR coverage are checked.
- The mandatory draw and optional unique Deva play are proven, including
  duplicate Sandiramon rejection. A separate public decline case uses
  `autoDeclineOptional`: the mandatory draw remains in hand, the Deva remains
  in hand, and breeding stays empty.
- Q3537 is covered by same-name candidates represented in the battle area and
  trash; Q3538 is covered by same-name cards under both a Digimon and a Tamer,
  which do not block a unique Deva.
- Effect-placed Option-area scope is exercised with a public Option placement
  fixture and a unique Deva. The catalog has no Option card sharing a Deva
  Digimon name, so the exact same-name Option exclusion is also asserted in
  the IR mapping rather than fabricated with an illegal card.
- Q3539/Q3541 prove the breeding candidate enters without its own On Play or
  the inherited EX5-006 when-played watcher firing.
- Q3540 proves a candidate moved from breeding to the battle area by P-130
  cannot attack during the turn it was played.
- Q3542 proves Pomumon's active effect-play restriction leaves the candidate
  in hand while Sandiramon's mandatory draw still resolves.
- A public opponent attack deletes a suspended Sandiramon and then resolves
  its On Deletion effect, deleting an opposing Digimon at exactly 5000 DP
  while preserving the 5001 DP target.
- A legal EX5-010 → EX5-013 evolution exposes inherited Security Attack +1;
  an illegal BT1-014 → EX5-013 source is rejected without changing memory or
  the stack. A plain non-qualifying host receives no inherited keyword.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-010.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests       14 passed (14)
```

Scoped checks also passed:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-010.ts apps/api/src/cards/EX5/EX5-010.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-010.ts apps/api/src/cards/EX5/EX5-010.test.ts docs/audits/EX5-reaudit/EX5-010.md
git diff --check -- apps/api/src/cards/EX5/EX5-010.ts apps/api/src/cards/EX5/EX5-010.test.ts docs/audits/EX5-reaudit/EX5-010.md
```

No engine, shared, catalog, ledger, broad suite, or workspace typecheck
changes were made.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and all Q3537–Q3542 rulings are mapped. |
| IR trace | 2/2 | Draw, optional breeding play, Deva/name scope, deletion boundary, and inherited trait gate are encoded. |
| Behavioral proof | 2/2 | 14 public/observable tests cover every printed clause, all six Q&A items, optional decline, deletion boundaries, and legal/illegal stacks. |
| Peer / stack proof | 2/2 | Deva peers, Option-area fixture, breeding watcher, P-130 movement, and legal/illegal EX5-013 evolution are covered. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-011 — Pajiramon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-011` is a red level-5 Digimon with 7000 DP, play cost 7, and the `[Holy Beast]/[Deva]` types. Its printed effects are:

> [On Play] ＜Draw 1＞ (Draw 1 card from your deck). Then, you may play 1 [Deva] trait Digimon card without the same name as the cards in your battle area or trash from your hand to an empty space in your breeding area without paying the cost.
>
> [On Deletion] If your opponent has a Tamer, gain 1 memory.

Its inherited clause is:

> [Your Turn] While this Digimon has the [Four Sovereigns]/[God Beast] trait, it gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card).

The card knowledge-base query returned all six required Q&A entries, Q3543 through Q3548. Q3543 defines the same-name scope as Digimon/Tamers in the battle area, effect-placed Option cards, and cards in trash. Q3544 excludes digivolution cards under Digimon and cards under Tamers. Q3545 and Q3547 suppress On Play and when-played references for the breeding-area play. Q3546 retains summoning sickness after a same-turn move from breeding to battle. Q3548 says an active effect-play restriction prevents the play in either area. Relevant rules queries returned the Breeding Area, Breeding Phase, Card Playing Rules, On Play timing, and same-turn attack restriction chunks.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-011.ts` registers only `registerIrCard("EX5-011", compiled)`.

The existing compiled IR has a mandatory On Play draw followed by an optional `PlayWithoutCost` from hand, restricted to one own `[Deva]` Digimon, `breeding: true`, and `notSameNameAs: ["battleArea", "trash"]`. Its On Deletion action gains one memory only when the opponent has a Tamer. Its inherited Your Turn aura grants Security Attack +1 only while the top Digimon has the Four Sovereigns or God Beast trait. No module change was required.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-011.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog identity, color, level, cost, DP, types, exact printed texts, trigger records, filters, optionality, breeding endpoint, deletion condition, and inherited keyword are asserted. |
| Q3543 | Public Pajiramon play draws once and refuses a same-name Deva represented in either the battle area or trash. An effect-placed Option structural fixture represents the printed Option scope; no same-name Deva Digimon/Option pair exists in the catalog for a direct collision case. |
| Q3544 | A candidate whose name appears only under a Digimon and under a Tamer is publicly played into breeding; the under-cards do not block it. |
| Q3545/Q3547 | A public effect play of peer `EX5-009` into breeding proves that its On Play and the `EX5-006` when-effect-played watcher do not fire; the exact draw and breeding endpoints remain observable. |
| Q3546 | Public Pajiramon play followed by public `P-130` play moves the candidate from breeding to battle, then a public attack intent is rejected for same-turn summoning sickness. |
| Q3548 | A public effect-play restriction from opponent `BT9-047` leaves the candidate in hand and prevents the breeding play while still resolving Pajiramon's mandatory draw. |
| Optional branch | `autoDeclineOptional` declines only the printed optional Deva play after the mandatory draw, leaving the candidate in hand with no pending decision. |
| On Deletion | Public `playCard` of `BT2-018` deletes a 4000-DP Pajiramon. The test proves the conditional gain is exactly one memory with an opponent Tamer and zero without one; only the Main-phase opening is a labeled structural setup so the turn-loop pass-memory race cannot obscure the resolved effect. |
| Inherited effect and stack | A legal public `EX5-011` → `EX5-013` evolution costs four memory and exposes inherited Security Attack +1 on the Four Sovereigns host. An invalid level-4 source is rejected without changing stack or memory. |
| Resolution safety | Each public flow asserts no pending decision; no behavior credit depends on injected timing or direct deletion. The only verb call is the explicitly structural Option fixture. |

Fixtures use no Digi-Egg in a deck or security. Neutral cards use inert main-deck Digimon (`BT1-009` through `BT1-014`); trait cards are used only where their printed traits are required.

#### Verification

- `node tools/kb/query.mjs card EX5-011` — **six Q&A entries returned: Q3543–Q3548, all mapped above**.
- `node tools/kb/query.mjs rules "breeding area"` — **relevant Breeding Area and Breeding Phase rules returned**.
- `node tools/kb/query.mjs rules "can't attack the turn they came into play"` — **Card Playing Rules and same-turn attack restriction returned**.
- `node tools/kb/query.mjs rules "effect play"` — **relevant Breeding Area, On Play, and play-cost rules returned; Q3548 is the applicable restriction ruling**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-011.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 10 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-011.ts apps/api/src/cards/EX5/EX5-011.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-011.ts apps/api/src/cards/EX5/EX5-011.test.ts` — **passed**.
- `git diff --check` — **passed**.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract and all six KB Q&A rulings are recorded; relevant breeding, play, and same-turn rules queried. |
| IR trace | 2/2 | Draw, unique Deva filter, battle/trash name scope, breeding endpoint, conditional memory gain, and inherited Security Attack aura match the printed text. |
| Behavioral proof | 2/2 | Public play, restriction, optional decline, breeding suppression, same-turn move/attack rejection, conditional deletion, legal evolution, and invalid-source endpoints are covered. |
| Peer/stack proof | 2/2 | Mixed battle/trash/under-card fixtures, peer effect-play suppression, restriction cases, and legal/illegal evolution stack behavior are included. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-012 — Flaremon

#### Printed contract and Q3549

EX5-012 is a red level-5, 7000 DP Ultimate Vaccine Beastkin/Light Fang
Flaremon. Its printed contract is:

- When this card would be played or digivolved into, if its controller has a
  Digimon with at least three digivolution cards and the Light Fang, Night
  Claw, or Galaxy trait, reduce that play or digivolution cost by 2.
- On Play and When Digivolving: delete one opposing Digimon with 5000 DP or
  less.
- Inherited Your Turn: this Digimon gets +2000 DP.

Q3549 was read in full. The reduction does not apply when digivolving from
Flaremon into another card; it applies only when Flaremon is the card being
played or digivolved into.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-012.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-012", compiled)`. The condition requires
the controller's own Digimon, an exact Light Fang/Night Claw/Galaxy trait, and
`digivolutionCardsAtLeast: 3`. The play and digivolve replacements are kept in
separate Static entries. This preserves the existing intrinsic
into-this-card collector for the `wouldDigivolve` reduction and prevents the
source Flaremon's replacement from discounting a later evolution (Q3549).

#### Behavioral proof

`apps/api/src/cards/EX5/EX5-012.test.ts` covers:

- Catalog metadata, both printed evolution costs, complete IR coverage, and
  structural clause mapping.
- Public play-cost reduction for Light Fang, Night Claw, and Galaxy sources
  with exactly three cards; no reduction for two cards, a non-matching trait,
  or an opponent's qualifying stack.
- Public red and blue level-4 evolution routes into Flaremon at the reduced
  cost, including exact resulting stack order and memory.
- Q3549's public negative path: a three-card Light Fang Flaremon source
  digivolves into EX5-013 at its full printed cost, with no reduction.
- Public illegal level-source rejection without memory payment or hand/stack
  movement.
- Public On Play and When Digivolving deletion boundaries: exactly 5000 DP is
  deleted and 5001 DP remains.
- Inherited +2000 DP on the controller's turn only, including the opponent's
  turn reset and a non-matching host check.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-012.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests       14 passed (14)

pnpm exec oxlint apps/api/src/cards/EX5/EX5-012.ts apps/api/src/cards/EX5/EX5-012.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-012.ts apps/api/src/cards/EX5/EX5-012.test.ts docs/audits/EX5-reaudit/EX5-012.md
git diff --check -- apps/api/src/cards/EX5/EX5-012.ts apps/api/src/cards/EX5/EX5-012.test.ts docs/audits/EX5-reaudit/EX5-012.md
```

No engine, shared, catalog, ledger, RUN, notes, broad suite, or workspace
typecheck changes were made.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3549 are mapped. |
| IR trace | 2/2 | Split play/into reductions, exact trait/count/controller gate, deletion clauses, and inherited DP are encoded. |
| Behavioral proof | 2/2 | 14 public/observable tests cover all clauses, boundaries, costs, negative paths, and Q3549. |
| Peer / stack proof | 2/2 | Light Fang/Night Claw/Galaxy sources, mixed red/blue routes, full stack identity, and illegal source are covered. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-013 — Zhuqiaomon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-013` is a red/purple level-6 Digimon with 12000 DP, play cost 7, and the `[Holy Bird]/[Four Sovereigns]` types. It evolves from a red or purple level-5 Digimon for 4 memory. Its printed effects are:

> [Hand] [Counter] ＜Blast Digivolve＞ (Your Digimon may digivolve into this card without paying the cost).
>
> [When Digivolving] [When Attacking] [Once Per Turn] By deleting 1 Digimon with the [Deva] trait or 6000 DP or less, this Digimon gains ＜Security Attack +1＞ (This Digimon checks 1 additional security card) for the turn.
>
> [On Deletion] Delete 1 of your opponent's Digimon with the highest DP.

The card knowledge-base query returned Q3550: the deletion cost can target an opponent's Digimon when it has the `[Deva]` trait or has 6000 DP or less. Rules queries returned the inclusive DP interpretation, Blast Digivolve's no-cost hand evolution, Once Per Turn activation semantics, and highest-DP targeting references.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-013.ts` registers only `registerIrCard("EX5-013", compiled)`.

The existing compiled IR has a hand Counter Blast Digivolve keyword, separate When Digivolving and When Attacking actions sharing `frequency: "OncePerTurn"` and `sharedUseKey: "ir-shared-0"`, an optional `deleteOwn` cost whose target filter is the inclusive OR of exact `[Deva]` trait or DP <=6000 with no controller restriction, and a for-the-turn Security Attack +1. Its On Deletion action targets one opposing Digimon by highest DP. No module change was required.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-013.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog identity, colors, level, play cost, DP, evolution costs, types, exact printed text, Counter keyword, shared OPT identity, inclusive OR filter, optionality, duration, and highest-DP deletion are asserted. |
| Q3550 Deva branch | A public legal red evolution deletes an opposing 12000-DP `EX5-009` solely because it has the Deva trait, then exposes Security Attack +1. |
| Q3550 DP branch and boundary | Public legal evolutions delete a non-Deva at exactly 6000 DP and refuse a non-Deva at 6001 DP. |
| When Digivolving / shared OPT | The public evolution pays 4 memory, preserves the source stack, and consumes the shared Once Per Turn identity. A same-turn public attack cannot pay the cost again; the existing Security Attack modifier remains for the turn. |
| When Attacking and reset | A public attack deletes an eligible target, checks the correct extra security, and a second public attack on the next own turn deletes a fresh eligible target after the real opponent turn reset. |
| Optionality | `autoDeclineOptional` refuses the attack cost; the target remains, the normal security check occurs, and no new Security Attack is granted. |
| On Deletion | A public `BT2-018` play deletes a 4000-DP Zhuqiaomon and its On Deletion effect publicly deletes the opponent's highest-DP Digimon while preserving the lower-DP peer and Volcanicdramon. The Main-phase opening is labeled structural setup only. |
| Blast Digivolve | A public Counter window opened by an opponent attack accepts Zhuqiaomon from hand, evolves it without paying memory, resolves the Deva branch, and preserves the source stack. |
| Evolution boundary | A public level-4 source is rejected without changing host stack or memory. |
| Resolution safety | Public paths settle with no pending decision. No injected timing or direct deletion verb is used for behavior credit. |

The evolution-stack fixtures use existing EX5 Deva peers and inert main-deck Digimon (`BT1-009` through `BT1-014`). No Digi-Egg appears in a deck or security.

#### Verification

- `node tools/kb/query.mjs card EX5-013` — **Q3550 returned and covered above**.
- `node tools/kb/query.mjs rules "6000 DP or less"` — **inclusive DP/rule references returned**.
- `node tools/kb/query.mjs rules "Blast Digivolve"` — **comprehensive Blast Digivolve rules returned**.
- `node tools/kb/query.mjs rules "Once Per Turn"` — **Once Per Turn activation and trigger rules returned**.
- `node tools/kb/query.mjs rules "highest DP"` — **highest-DP targeting references returned**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-013.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 9 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-013.ts apps/api/src/cards/EX5/EX5-013.test.ts` — **passed with no diagnostics**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-013.ts apps/api/src/cards/EX5/EX5-013.test.ts` — **passed**.
- `git diff --check` — **passed**.
- Workspace typecheck and broad suites are intentionally not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract, Q3550, and relevant DP/Blast/OPT/highest-DP rules are recorded. |
| IR trace | 2/2 | Counter, shared once-per-turn triggers, inclusive OR cost, for-the-turn keyword, and highest-DP deletion match the printed text. |
| Behavioral proof | 2/2 | Public normal/Counter evolution, both OR branches and boundaries, attacks, refusal, reset, deletion, and exact endpoints pass. |
| Peer/stack proof | 2/2 | EX5 Deva peer targeting, multi-step turn evolution/attack stacks, Counter stack, and invalid source negative are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-014 — Apollomon

#### Printed contract and Q3551

EX5-014 is the red level-6, 12000 DP Mega Vaccine Shaman/Olympos XII/Light
Fang Apollomon. Its clauses are:

- When Digivolving, gain Blitz.
- During your turn, gain Security Attack +1 for every three digivolution cards.
- During your turn, once per turn, when a card is removed from the opponent's
  security stack, delete one opposing Digimon with DP less than or equal to
  this Digimon's DP.

Q3551 was read in full. A first security removal with no legal target still
activates and consumes the Once Per Turn effect, so a security Digimon played
before a later check cannot be deleted by the later removal in the same turn.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-014.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-014", compiled)`. The IR maps Blitz, the
three-card Security Attack scaling, and the `whenSecurityRemoved` opponent
source gate with a relative-to-source DP limit and Once Per Turn frequency.

#### Behavioral proof

`apps/api/src/cards/EX5/EX5-014.test.ts` covers:

- Catalog metadata, complete IR coverage, Blitz, scaling, relative DP target,
  opponent source, and Once Per Turn structure.
- Public Security Attack behavior from a three-card stack, including a real
  attack and completed security checks.
- Public red and blue legal evolution routes with exact memory and stack
  endpoints, plus an illegal level-source rejection that leaves memory and
  hand unchanged.
- Public security-removal deletion at the exact 12000-DP boundary while a
  12001-DP Digimon survives.
- Q3551 through a real multi-check attack: the first check removes security
  with no opposing Digimon, BT3-036 Ankylomon is then played from security,
  and the second check does not delete the newly played Digimon because the
  first no-target activation consumed the Once Per Turn use.
- Same-turn suppression across two security checks and reset on the next own
  turn through the real turn loop; the surviving target is deleted only on the
  next own turn.

#### Verification

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-014.test.ts --maxWorkers=1 --no-file-parallelism
Test Files  1 passed (1)
Tests       9 passed (9)

pnpm exec oxlint apps/api/src/cards/EX5/EX5-014.ts apps/api/src/cards/EX5/EX5-014.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-014.ts apps/api/src/cards/EX5/EX5-014.test.ts docs/audits/EX5-reaudit/EX5-014.md
git diff --check -- apps/api/src/cards/EX5/EX5-014.ts apps/api/src/cards/EX5/EX5-014.test.ts docs/audits/EX5-reaudit/EX5-014.md
```

No engine, shared, catalog, ledger, RUN, notes, broad suite, or workspace
typecheck changes were made.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3551 are mapped. |
| IR trace | 2/2 | Blitz, three-card scaling, opponent security-removal trigger, relative DP boundary, and Once Per Turn are encoded. |
| Behavioral proof | 2/2 | 9 public/observable tests cover all clauses, exact boundaries, Q3551, same-turn suppression, and next-turn reset. |
| Peer / stack proof | 2/2 | Red/blue legal stacks, illegal source, BT3-036 security peer, and real security attack paths are covered. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-015 — Gabumon (X Antibody)

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-015` is a blue/purple level-3 Digimon with 2000 DP, play cost 3, and the `[Beast]/[X Antibody]` types. It evolves from a blue or purple level-2 Digimon for 1 memory. Its printed effects are:

> Digivolve: 0 from [Gabumon] or [Tsunomon]
>
> [On Play] [When Digivolving] Reveal the top 4 cards of your deck. Add 2 cards with [Garurumon]/[X Antibody] in their names among them to the hand. Place the rest at the bottom of the deck. If you added cards, trash 1 card in your hand.

Its inherited clause is:

> [All Turns] [Once Per Turn] When this Digimon with [Garurumon]/[Omnimon] in its name would be deleted in battle, by returning 2 non-Digi-Egg cards from your trash to the bottom of the deck, prevent that deletion.

The card knowledge-base query returned Q3552-Q3554. Q3552 confirms that with one matching card among four, that card is added and the rest are bottom-decked. Q3553 confirms that when both a Garurumon and an X Antibody-name card match, as many matching cards as possible must be added. Q3554 confirms that two Garurumon matches may be added when two Garurumon and one X Antibody-name card are revealed. The banlist query shows EX5-015 restricted to one copy effective 2024-03-01; all fixtures use at most one physical EX5-015.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-015.ts` registers only `registerIrCard("EX5-015", compiled)`.

The existing compiled IR has two identical RevealAdd actions (On Play and When Digivolving), each revealing four, adding up to two cards whose names contain `Garurumon` or `X Antibody`, placing the remainder at deck bottom, then conditionally trashing one hand card when cards were added. Its inherited All Turns battle-deletion replacement requires two own non-Digi-Egg trash cards, returns them to deck bottom, prevents deletion, and is Once Per Turn. The alternate Digivolution requirements are the printed 0-cost Gabumon and Tsunomon routes. No module change was required.

#### Behavioral evidence

`apps/api/src/cards/EX5/EX5-015.test.ts` proves:

| Clause | Public/observable behavioral proof |
| --- | --- |
| Catalog and IR identity | Catalog identity, colors, level, play/evolution costs, DP, types, exact effect fragments, complete coverage, both triggers, name filter, deck-bottom remainder, conditional trash, alternate costs, and inherited replacement are asserted. |
| Q3552 | A public On Play with exactly one Garurumon match adds that card, bottom-decks all three nonmatches in original order, and resolves the conditional hand-trash endpoint. |
| Q3553 | A mixed four-card reveal with one Garurumon, one X Antibody-name card, and two fillers adds both matching cards, leaves both fillers in original remainder order, and trashes one hand card. |
| Q3554 | A mixed four-card reveal with two Garurumon cards, one X Antibody-name card, and one filler adds the two Garurumon cards (as many as possible), leaves the X Antibody-name card and filler in original remainder order, and trashes one hand card. |
| When Digivolving | A public legal 0-cost evolution from `BT1-029 Gabumon` resolves the same four-card reveal, mandatory digivolution draw, stack endpoint, hand addition, conditional hand-trash, and ordered deck remainder. |
| Inherited replacement | A public battle attack against a suspended matching `[Garurumon]` host returns exactly two non-Digi-Egg trash cards to deck bottom and prevents deletion. A second public attack in the same turn deletes the host, proving the Once Per Turn boundary and exact endpoints. |
| Evolution routes | Public legal `BT1-029 Gabumon` → EX5-015 alternate evolution costs 0 memory; a level-3 non-Gabumon source is publicly rejected without changing memory or stack. The normal blue/purple level-2 routes remain asserted in the compiled requirement/catalog trace. |
| Fixture legality and safety | No Digi-Egg appears in a deck or security fixture. Public paths settle with no pending decisions; no direct deletion or effect verbs are used for behavior credit. |

#### Verification

- `node tools/kb/query.mjs card EX5-015` — **Q3552-Q3554 returned and mapped above**.
- `node tools/kb/query.mjs banlist EX5-015` — **restricted to one copy effective 2024-03-01; fixtures honor the limit**.
- `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-015.test.ts --maxWorkers=1 --no-file-parallelism` — **passed: 1 file, 7 tests**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-015.ts apps/api/src/cards/EX5/EX5-015.test.ts` — **passed**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-015.ts apps/api/src/cards/EX5/EX5-015.test.ts` — **passed**.
- `git diff --check -- apps/api/src/cards/EX5/EX5-015.ts apps/api/src/cards/EX5/EX5-015.test.ts docs/audits/EX5-reaudit/EX5-015.md` — **passed**.
- Workspace typecheck and broad suites were intentionally not run; the coordinator owns those RAM-sensitive checks.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract, Q3552-Q3554, and the one-copy banlist restriction are recorded. |
| IR trace | 2/2 | Both public triggers, matching-name bucket, ordering, conditional trash, alternate routes, and inherited Once Per Turn replacement match the printed text. |
| Behavioral proof | 2/2 | On Play, reveal rulings, ordered remainder, public When Digivolving reveal/draw/trash endpoints, and public battle replacement all pass. |
| Peer/stack proof | 2/2 | Mixed Garurumon/X Antibody reveals, legal breeding and Gabumon alternate routes, invalid source, inherited host, and same-turn Once Per Turn boundary are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-016 — Lunamon

#### Card and printed clauses

Catalog evidence (`packages/shared/src/cards/data/cards.json`) identifies EX5-016 as a blue level-3 Digimon (play cost 3, 1000 DP, Data, Mammal/Night Claw) with zero-cost evolution from a level-2 blue or red card.

The printed clauses are:

1. `[Start of Your Main Phase] By returning 1 of your Digimon to the hand, gain 2 memory.`
2. Inherited `[Main] [Once Per Turn] By placing the top card of this Digimon with the [Night Claw]/[Light Fang] trait as this Digimon's bottom digivolution card, gain 2 memory.`

The direct module registers only through `registerIrCard("EX5-016", compiled)`.

#### Rules and Q&A evidence

The local KB query for EX5-016 returned Q3555–Q3559:

- Q3555: the top card of the host stack is detached and placed at the bottom, which can promote the former top evolution card.
- Q3556: the once-per-turn activation record belongs to the physical copy and survives stack rotation; rotating copies cannot create infinite memory.
- Q3557: the Lunamon itself is a legal return target.
- Q3558: Mother D-Reaper satisfies the return-to-hand condition but is routed to the bottom of the Digi-Egg deck and is not added to hand.
- Q3559: a token satisfies the return-to-hand condition but is removed from the game and is not added to hand.

Relevant comprehensive-rule evidence is §3-1-3-9 (Digi-Egg cards sent to a private non-deck area go to the bottom of the Digi-Egg deck), §4-7-3/§4-7-7 (stack order and bottom cards), §4-21-5 (tokens leaving the field are removed instead of entering the destination), §15-7 (optional `by` processing), and §15-5-3 (effects trigger when a card is placed in the relevant area).

#### Implementation trace

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Start of Main return +2 memory | `StartOfYourMainPhase` → `GainMemory` with a one-Digimon `return` cost | public Start-of-Main timing path, optional refusal, self-return (Q3557), Mother D-Reaper (Q3558), token (Q3559) |
| Inherited stack rotation +2 memory | inherited `Main` → `GainMemory` with the specialized `placeOwnTopAtStackBottom` cost, self reference, battle-area Digimon filter, exact Night Claw/Light Fang trait match, and `OncePerTurn` | public `activateEffect` on Night Claw and Light Fang hosts (Q3555), two physical copies and next-turn reset (Q3556), non-trait host rejection |
| Evolution requirements | catalog standard route: blue or red level 2, cost 0 | public evolution from EX5-001 and EX5-002; level-3 negative source rejected |

The `By ...` conditions are explicitly `optional: true` with `abortOnDecline: true`. The inherited target is `isSelfRef: true`, so the payment cannot select another Digimon as the source of the top-card rotation.

#### Files changed

- `apps/api/src/cards/EX5/EX5-016.ts`
- `apps/api/src/cards/EX5/EX5-016.test.ts`
- `docs/audits/EX5-reaudit/EX5-016.md`

No engine, shared, catalog, ledger, RUN, or review-note files were changed. No Git commands that write repository state were run.

#### Verification status

Per the lane brief, Vitest, typecheck, and broad suites were intentionally not run in this lane. The coordinator must run the queued serial focused test and set-level gates before awarding delivery credit.

Cheap static checks passed: `git diff --check -- apps/api/src/cards/EX5/EX5-016.ts apps/api/src/cards/EX5/EX5-016.test.ts docs/audits/EX5-reaudit/EX5-016.md` and `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-016.ts apps/api/src/cards/EX5/EX5-016.test.ts docs/audits/EX5-reaudit/EX5-016.md`. The formatter reported all checked source files as correctly formatted. This worker score still excludes delivery gates.

#### Worker score (maximum 8/10)

- Catalog/rules: 2/2 — catalog fields, all five Q&As, and applicable comprehensive-rule boundaries are recorded.
- IR trace: 2/2 — both printed clauses map to executable IR with correct optionality, self identity, stack-bottom destination, trait matching, and frequency.
- Behavioral proof: 2/2 — focused tests cover positive/negative paths, exact zones, optional refusal, stack endpoints, memory, token/Mother routing, and OPT reset.
- Peer/stack proof: 2/2 — both trait alternatives, two physical Lunamon copies, legal red/blue level-2 routes, and an illegal level-3 source are covered through public intents.
- Delivery gates: 0/2 — intentionally coordinator-owned and not run by this lane.

**Worker total: 8/10 pending coordinator verification.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-017 — Lekismon

#### Printed contract and Q3560–Q3561

EX5-017 is the blue level-4, 4000 DP Champion Data Beastkin/Night Claw
Lekismon. Its clauses are:

- On Play and When Digivolving, reveal the top three cards of the deck.
- Add one Night Claw card and one Light Fang/Galaxy card among them to the
  hand, adding as many applicable cards as possible; return the rest to the
  bottom of the deck.
- Inherited Opponent's Turn: this Digimon gets +2000 DP.

Q3560 confirms that one available matching bucket is still added when the
other bucket has no target. Q3561 confirms that when both buckets have targets,
the player cannot decline one: the mandatory effect adds as many applicable
cards as possible.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-017.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-017", compiled)`. Both On Play and When
Digivolving use mandatory `RevealAdd` actions with `revealCount: 3`, one count-1
Night Claw slot, one count-1 Light Fang/Galaxy slot, and `rest: "deckBottom"`.
The inherited clause is an OpponentsTurn self +2000 DP modifier.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-017.test.ts` covers:

- Catalog metadata, complete IR coverage, both reveal triggers, both trait
  buckets, and inherited timing.
- Public On Play with both buckets available, asserting both cards enter hand,
  the non-selected reveal returns to the deck bottom, and no decision remains.
  The public endpoint records the engine's add-slot order (`Night Claw`, then
  `Light Fang/Galaxy`); the accepted EX5-008 peer uses matching deck and slot
  order, while the When Digivolving proof independently checks its observed
  endpoint.
- Public On Play with only a Galaxy match, proving Q3560's available-bucket
  behavior and exact hand/deck endpoints.
- Public When Digivolving with both buckets available, exact memory payment,
  source-stack identity, hand contents, and deck-bottom remainder.
- Legal red and blue level-3 evolution routes, including a mixed Light
  Fang/Night Claw peer stack, plus an illegal level-4 source that leaves memory,
  stack, and hand unchanged.
- Inherited +2000 DP during the opponent's turn and its removal on the
  controller's turn.

#### Verification status

The focused card test passed serially after correcting the two public hand-order
assertions to the observed engine endpoints: On Play follows the declared
Night Claw then Light Fang/Galaxy add slots, while When Digivolving exposes
`EX5-007` then `EX5-016` for this fixture. No typecheck or broad suite was run:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-017.test.ts --maxWorkers=1 --no-file-parallelism
# Test Files  1 passed (1)
# Tests       8 passed (8)
```

Scoped checks also passed:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-017.ts apps/api/src/cards/EX5/EX5-017.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-017.ts apps/api/src/cards/EX5/EX5-017.test.ts docs/audits/EX5-reaudit/EX5-017.md
git diff --check -- apps/api/src/cards/EX5/EX5-017.ts apps/api/src/cards/EX5/EX5-017.test.ts docs/audits/EX5-reaudit/EX5-017.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3560–Q3561 are mapped. |
| IR trace | 2/2 | Mandatory reveal, both exact trait buckets, deck-bottom remainder, and inherited timing are encoded. |
| Behavioral proof | 2/2 | Eight public/observable tests pass for both triggers, mandatory add-as-many behavior, exact hand/deck endpoints, and negatives. |
| Peer / stack proof | 2/2 | Galaxy, Light Fang, Night Claw, mixed stacks, legal red/blue routes, and illegal source are covered. |
| Delivery gates | 0/2 | Coordinator-owned set gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-018 — Garurumon (X Antibody)

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-018` is a blue/purple level-4 Digimon with 6000 DP, play cost 6, and the `[Beast]/[X Antibody]` types. It evolves from a blue or purple level-3 Digimon for 3 memory. Its printed effect is:

> [When Digivolving] ＜Draw 2＞ (Draw 2 cards from your deck). Then, trash 2 cards in your hand. If [Garurumon] or [X Antibody] is in this Digimon's digivolution cards, gain 1 memory.

Its inherited clause is:

> [All Turns] [Once Per Turn] When this Digimon with [Garurumon]/[Omnimon] in its name would be deleted in battle, by returning 2 non-Digi-Egg cards from your trash to the bottom of the deck, prevent that deletion.

The card knowledge-base query returned Q3562 (2024-03-28): paying the two-card replacement cost cannot be followed by allowing the battle deletion. The banlist output also restricts EX5-018 to one copy effective 2024-03-01; fixtures use only one physical EX5-018.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-018.ts` registers only `registerIrCard("EX5-018", compiled)`.

The existing compiled IR has a mandatory When Digivolving Draw 2, mandatory Trash 2, and conditional GainMemory whose stack filter uses the exact `Garurumon` name or exact `X Antibody` trait. Its inherited All Turns replacement is Once Per Turn, applies to battle deletion of a Digimon whose current name contains Garurumon or Omnimon, requires exactly two own non-Digi-Egg trash cards returned to deck bottom, and uses `outcome: "preventDeletion"`. The local correction changes the X Antibody branch from `nameExact` to the printed trait match, so an X Antibody source such as EX5-015 correctly grants the memory.

#### Behavioral evidence prepared

`apps/api/src/cards/EX5/EX5-018.test.ts` contains public-path proof for:

| Clause | Public/observable proof prepared |
| --- | --- |
| Catalog and IR identity | Catalog colors, level, costs, DP, types, exact effect fragments, complete coverage, Draw 2, Trash 2, exact stack-name filter, inherited source-name filter, replacement cost, battle cause, and Once Per Turn are asserted. |
| When Digivolving positive | A public legal stack evolves `BT1-029 Gabumon → EX5-015 → EX5-018`; the EX5-018 evolution pays 3 memory, draws two, trashes two selected hand cards, gains one memory from the X Antibody trait source, and preserves stack identity. |
| Stack-name negative | A public direct evolution from `BT1-029 Gabumon` has no Garurumon/X Antibody source beneath EX5-018, so it pays 3 memory and does not gain the conditional memory. |
| Battle replacement | A public attack against a legal `BT1-029 → EX5-018 → BT1-040 WereGarurumon` stack returns exactly two non-Digi-Egg trash cards to deck bottom and leaves the host in play. |
| Q3562 payment boundary | With only one eligible non-Digi-Egg trash card, the public battle deletion removes the host and leaves that card in trash; the test does not bless a paid-cost-then-delete result. |
| Once Per Turn | Two public attacks in one turn prove the first replacement and second deletion. A separate real turn-loop case passes the owner’s turn, publicly suspends the reset host by attacking the opponent, and proves replacement is available again on the next opponent turn. |
| Fixtures and resolution safety | No Digi-Egg appears in deck or security. Inert main-deck Digimon are BT1-009 through BT1-014. Public intents, `ready()`, `settle()`, and the real turn loop are used; no direct delete verb or injected timing is used for behavior credit. |

#### Verification

- `node tools/kb/query.mjs card EX5-018` — **Q3562 returned; banlist restriction and ruling recorded above**.
- `pnpm exec oxfmt apps/api/src/cards/EX5/EX5-018.test.ts` — **passed (mechanical formatting only)**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-018.ts apps/api/src/cards/EX5/EX5-018.test.ts` — **passed with no diagnostics**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-018.ts apps/api/src/cards/EX5/EX5-018.test.ts` — **passed**.
- `git diff --check -- apps/api/src/cards/EX5/EX5-018.ts apps/api/src/cards/EX5/EX5-018.test.ts docs/audits/EX5-reaudit/EX5-018.md` — **passed**.
- Focused Vitest is intentionally **not run yet** per the coordinator's accelerated-lane RAM/queue gate; serial command queued for coordinator execution: `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-018.test.ts --maxWorkers=1 --no-file-parallelism`.
- Workspace typecheck and broad suites were intentionally not run.

#### Score (worker maximum 8/10; pending focused execution)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract, Q3562, and one-copy banlist restriction are recorded. |
| IR trace | 2/2 | Draw/trash/gain condition, inherited source-name boundary, exact two-card non-Digi-Egg cost, battle-only replacement, prevention outcome, and Once Per Turn match the printed text. |
| Behavioral proof | 2/2* | Public evolution, exact stack/memory/hand endpoints, Q3562 insufficient-cost deletion, and public replacement/reset tests are authored; *focused execution remains pending by coordinator instruction*. |
| Peer/stack proof | 2/2* | Legal three-step Gabumon/X/level-5 Garurumon stack, exact source-name comparison, and legal mixed battle replacement stack are authored; *focused execution remains pending*. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 (provisional pending serial Vitest).**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-019 — Antylamon

#### Printed contract and Q3563–Q3568

EX5-019 is the blue level-5, 7000 DP Ultimate Data Holy Beast/Deva
Antylamon. Its clauses are:

- On Play, draw 1, then optionally play one Deva trait Digimon from hand
  without paying its cost into an empty breeding area, excluding names already
  represented in the controller's battle area or trash.
- When Attacking, trash the bottom digivolution card of one opponent Digimon.
- Inherited When Attacking, once per turn, gain 1 memory if the Digimon has
  Four Sovereigns or God Beast.

The local knowledge base returns Q3563–Q3568. Q3563 includes names among all
own Digimon/Tamers and effect-placed Options in the battle area plus the trash;
Q3564 excludes cards under Digimon and under Tamers. Q3565 and Q3567 suppress
On Play and when-played references for a Digimon played directly into breeding.
Q3566 preserves the same-turn no-attack restriction after movement from
breeding. Q3568 says an active effect-play restriction prevents this play.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-019.ts` is already compiled IR-only and registers
exclusively with `registerIrCard("EX5-019", compiled)`. The IR maps the draw
and optional `PlayWithoutCost` action, `notSameNameAs: ["battleArea", "trash"]`,
the opponent-stack `TrashDigivolution` action, and the inherited
`OncePerTurn` conditional memory gain. No production card change was needed.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-019.test.ts` now covers:

- Catalog identity, exact printed text, full IR coverage, filters, optionality,
  breeding destination, attack trashing, inherited condition, and frequency.
- Q3563 with a same-name Deva in the battle area and in trash, while the
  mandatory draw still reaches hand. The engine's public same-name scope is
  exercised for the available Digimon/trash cases; the catalog has no Option
  card sharing an Antylamon/Deva name, so the Option-name part has no direct
  positive collision fixture.
- Q3564 with the candidate name represented only under a Digimon and a Tamer;
  the candidate is still publicly played into breeding.
- Q3565/Q3567 with a Deva peer that has On Play and a when-played watcher;
  neither effect-triggered event fires for the breeding-area play.
- Q3566 with public `P-130` movement followed by a public attack intent, which
  is rejected in the same turn.
- Q3568 with opponent `BT9-047`, proving the restriction blocks the breeding
  play while the mandatory draw resolves.
- Optional decline after draw, public attack trashing of the opponent's bottom
  stack card, and a public inherited attack sequence that gains memory once
  and refuses a second same-turn gain.
- The catalog's empty evolution-cost list is asserted explicitly; EX5-019 has
  no legal evolution route, so the inherited Four Sovereigns stack is the
  applicable peer/stack proof rather than an invented evolution fixture.

#### Verification status

Per the accelerated card-lane instruction, Vitest, typecheck, and broad suites
were intentionally not run. The coordinator must schedule the focused serial
test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-019.test.ts --maxWorkers=1 --no-file-parallelism
```

Cheap scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-019.ts apps/api/src/cards/EX5/EX5-019.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-019.ts apps/api/src/cards/EX5/EX5-019.test.ts docs/audits/EX5-reaudit/EX5-019.md
git diff --check -- apps/api/src/cards/EX5/EX5-019.ts apps/api/src/cards/EX5/EX5-019.test.ts docs/audits/EX5-reaudit/EX5-019.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; any focused failure should be evaluated against
the public endpoints above before acceptance.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and all six Q3563–Q3568 rulings are mapped. |
| IR trace | 2/2 | Draw, optional unique Deva breeding play, attack trash, and inherited once-per-turn memory are encoded. |
| Behavioral proof | 2/2 | Public proofs cover every printed clause, exact zones, restrictions, optionality, suppression, movement, and same-turn reset boundary; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Deva/when-played/restriction peers, mixed name-scope zones, under-card exclusions, and inherited Four Sovereigns stack are covered; no evolution route exists in the catalog. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-020 — Crescemon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-020` is a blue level-5 Digimon with 7000 DP, play cost 7, and the `[Wizard]/[Night Claw]` types. It evolves from a blue or red level-4 Digimon for 3 memory. Its printed effects are:

> When this card would be played or digivolved into, if you have a Digimon with 3 or more digivolution cards and the [Night Claw]/[Light Fang]/[Galaxy] trait, reduce the play or digivolution cost by 2.
>
> [On Play] [When Digivolving] 1 of your opponent's Digimon can't suspend until the end of your opponent's turn.

Its inherited clause is:

> [Opponent's Turn] This Digimon gets +2000 DP.

The card knowledge-base query returned Q3569 (2024-03-28): the reduction is a destination effect. A Crescemon with three or more digivolution cards and an allowed trait does not reduce the cost when that Crescemon is the source digivolving into another card. The support condition requires an own Digimon with at least three digivolution cards and exactly one of the Night Claw, Light Fang, or Galaxy traits.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-020.ts` registers only `registerIrCard("EX5-020", compiled)`.

The existing compiled IR has a self-scoped `wouldBePlayed` reduction and a separate `wouldDigivolve` destination reduction, each reducing two only when `youHave` finds an own Digimon with `digivolutionCardsAtLeast: 3` and the exact allowed trait filter. On Play and When Digivolving each restrict one opposing Digimon from suspending until the end of the opponent's turn. Its inherited Opponent's Turn aura grants +2000 DP. No module change was required.

#### Behavioral evidence prepared

`apps/api/src/cards/EX5/EX5-020.test.ts` contains public-path proof for:

| Clause | Public/observable proof prepared |
| --- | --- |
| Catalog and IR identity | Catalog colors, level, costs, DP, types, exact effect text, complete coverage, both replacement events, exact support filter, both restriction triggers, duration, and inherited DP aura are asserted. |
| Public On Play | A legal three-source Night Claw support stack reduces play from 7 to 5 memory and restricts exactly one opponent Digimon; the peer remains unrestricted. |
| Q3569 destination-not-source | A public evolution from a stacked Crescemon into blue level-6 BT1-044 pays the full 1-memory destination evolution cost (memory 4→3). The Crescemon source's own three-plus-card Night Claw stack does not reduce this destination's cost. |
| Public When Digivolving | Both blue (`EX5-017`) and red (`EX5-008`) level-4 routes evolve into Crescemon at the reduced one-memory cost while resolving the printed restriction target through a public intent. |
| Trait and count boundaries | Public play cases cover Night Claw, Light Fang, and Galaxy with exactly three sources; a two-source stack, nonmatching stack, and opponent-only support do not reduce the cost. |
| Evolution legality | A level-3 source is publicly rejected without charging memory or moving Crescemon. Public blue and red level-4 routes preserve source-stack identity. |
| Inherited behavior | A real turn loop observes the host's baseline DP on its own turn, +2000 DP during the opponent's turn, and baseline restoration on the next own turn. |
| Fixtures and resolution safety | No Digi-Egg appears in a deck or security. Inert fixtures use BT1-009 through BT1-014. Public intents, `ready()`, `settle()`, and the real turn loop are used; no direct timing or behavior verbs are used. |

#### Verification

- `node tools/kb/query.mjs card EX5-020` — **Q3569 returned and mapped above**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-020.ts apps/api/src/cards/EX5/EX5-020.test.ts` — **passed with no diagnostics**.
- `pnpm exec oxfmt apps/api/src/cards/EX5/EX5-020.test.ts` — **passed (mechanical formatting only)**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-020.ts apps/api/src/cards/EX5/EX5-020.test.ts` — **passed**.
- `git diff --check -- apps/api/src/cards/EX5/EX5-020.ts apps/api/src/cards/EX5/EX5-020.test.ts docs/audits/EX5-reaudit/EX5-020.md` — **passed**.
- Focused Vitest is intentionally **not run** per coordinator instruction. Queue command: `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-020.test.ts --maxWorkers=1 --no-file-parallelism`.
- Workspace typecheck and broad suites were intentionally not run.

#### Score (worker maximum 8/10; provisional pending focused execution)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract and Q3569 destination-not-source ruling are recorded. |
| IR trace | 2/2 | Play/digivolve reductions, exact trait/count condition, target restriction, duration, and inherited aura match the printed text. |
| Behavioral proof | 2/2* | Public play/evolution costs, target restriction, Q3569 full-cost source route, negative boundaries, and turn duration are authored; *focused execution is pending*. |
| Peer/stack proof | 2/2* | Night Claw, Light Fang, Galaxy, nonmatching/opponent stacks, both legal color routes, illegal source, and inherited stack are authored; *focused execution is pending*. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 (provisional pending serial Vitest).**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-021 — Majiramon

#### Printed contract and Q3570–Q3576/Q5503–Q5506

EX5-021 is the blue level-5, 7000 DP Ultimate Data Holy Dragon/Deva
Majiramon. Its clauses are:

- On Play, draw 1, then optionally play one Deva trait Digimon from hand
  without paying its cost into an empty breeding area, excluding names already
  represented in the controller's battle area or trash.
- During your turn, when you use an Option card with a use cost of 1 or more,
  gain 1 memory.
- Inherited When Attacking, once per turn, gain 1 memory if the Digimon has
  Four Sovereigns or God Beast.

The local knowledge base returns Q3570–Q3576 and Q5503–Q5506. Q3570 includes
all own Digimon/Tamers and effect-placed Options in the battle area plus trash;
Q3571 excludes cards under Digimon and under Tamers. Q3572 and Q3574 suppress
On Play and when-played references for a Digimon played directly into
breeding. Q3573 preserves the same-turn no-attack restriction after movement
from breeding. Q3575 blocks the play under a "can't be played by effects"
restriction. Q3576 places the Option-use trigger after the used Option's Main
effect. Q5503 excludes Options activated by security/Delay rather than use;
Q5504 reads the effective use cost after a cost reduction to zero; Q5505 reads
the original use cost when only the amount paid is reduced; and Q5506 still
triggers when an Option with original use cost 1 or more is used for free.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-021.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-021", compiled)`. The IR maps the draw
and optional unique Deva breeding play, the `whenOptionUsed` sub-trigger with
`triggerOptionCostAtLeast: 1`, and the inherited `OncePerTurn` conditional
memory gain. No production card change was needed.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-021.test.ts` covers:

- Catalog identity, exact printed text, full IR coverage, filters, optionality,
  breeding destination, Option threshold, and inherited condition/frequency.
- Q3570 with a same-name Deva in battle area and trash, while the mandatory
  draw still resolves.
- Q3571 with the candidate name represented only under a Digimon and a Tamer;
  the candidate is still publicly played into breeding.
- Q3572/Q3574 with a Deva peer that has On Play and a when-played watcher;
  neither event fires for the breeding-area play.
- Q3573 with public `P-130` movement followed by a public attack intent, which
  is rejected in the same turn.
- Q3575 with opponent `BT9-047`, proving the restriction blocks the breeding
  play while the mandatory draw resolves.
- Optional refusal after the mandatory draw.
- Q3576 through a paid public `BT1-097` use, asserting the Option Main draw
  completes before the Majiramon memory gain. A public zero-cost `BT1-090`
  use proves the threshold excludes cost 0. The IR threshold and engine's
  `whenOptionUsed` cost provenance cover the Q5504–Q5506 reduction/free-use
  distinctions; those specialized cost-rewriter paths are shared-engine
  behavior, not EX5-021-specific card branching.
- Inherited memory through a public attack sequence using public `BT1-112` to
  unsuspend the host between two attacks; the first attack gains memory and
  the second same-turn attack does not.
- The catalog's empty evolution-cost list is asserted explicitly; EX5-021 has
  no legal evolution route, so the inherited Four Sovereigns stack is the
  applicable peer/stack proof.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-021.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-021.ts apps/api/src/cards/EX5/EX5-021.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-021.ts apps/api/src/cards/EX5/EX5-021.test.ts docs/audits/EX5-reaudit/EX5-021.md
git diff --check -- apps/api/src/cards/EX5/EX5-021.ts apps/api/src/cards/EX5/EX5-021.test.ts docs/audits/EX5-reaudit/EX5-021.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and all eleven Q3570–Q3576/Q5503–Q5506 rulings are mapped. |
| IR trace | 2/2 | Draw, optional unique Deva breeding play, Option threshold, attack inherited gain, and once-per-turn identity are encoded. |
| Behavioral proof | 2/2 | Public proofs cover printed clauses, exact zones, restrictions, optionality, Option ordering/threshold, public unsuspend, and same-turn OPT; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Deva/when-played/restriction peers, mixed name-scope zones, under-card exclusions, and inherited Four Sovereigns stack are covered; no evolution route exists in the catalog. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-022 — Mihiramon

#### Printed contract and Q3577–Q3582

EX5-022 is the blue level-5, 7000 DP Ultimate Data Holy Beast/Deva
Mihiramon. Its clauses are:

- On Play, draw 1, then optionally play one Deva-trait Digimon from hand
  without paying its cost into an empty breeding area. The candidate cannot
  share a name with cards in the controller's battle area or trash.
- During your turn, once per turn, when one of your Digimon is played, trash
  the top digivolution card of one opponent's Digimon.
- Inherited When Attacking, once per turn, gain 1 memory if this Digimon has
  the Four Sovereigns or God Beast trait.

The local knowledge base returns Q3577–Q3582:

- Q3577: the name exclusion covers all cards in the controller's battle area,
  effect-placed Options, and trash.
- Q3578: names under Digimon or Tamers are not part of that exclusion.
- Q3579: a Digimon played directly into breeding by this effect does not
  activate its On Play effects.
- Q3580: moving that Digimon from breeding to the battle area in the same turn
  does not allow it to attack.
- Q3581: a Digimon played into breeding by an effect does not activate
  when-your-Digimon-is-played effects.
- Q3582: an effect-play restriction prevents the breeding play, while the
  mandatory Draw 1 still resolves.

The relevant comprehensive-rule boundaries are the breeding-area play and
movement procedures, the same-turn no-attack rule for a Digimon that entered
play, effect-play restriction processing, top digivolution-card order, and
once-per-turn identity/reset processing.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-022.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-022", compiled)`. The IR maps:

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| On Play Draw 1 + optional unique Deva breeding play | `OnPlay` → `Draw` then optional `PlayWithoutCost` with `breeding: true`, `payCost: false`, `notSameNameAs: ["battleArea", "trash"]` | Q3577/Q3578 name scope, Q3579/Q3580 breeding endpoints, Q3582 restriction, and optional refusal |
| Your Turn once-per-turn top-source trash | `YourTurn` → `SubTrigger(whenPlayed)` with own Digimon source filter and opponent Digimon `TrashDigivolution` from top | public manual plays, exact remaining stack/trash, and same-turn refusal |
| Inherited attack memory | inherited `WhenAttacking` → conditional `GainMemory(1)`, `OncePerTurn`, exact Four Sovereigns/God Beast trait filter | public attacks with BT6-029 and EX5-033, same-turn refusal, next-own-turn reset, and non-trait negative |

#### Behavioral proof prepared

`EX5-022.test.ts` covers:

- Catalog identity, no evolution costs, all printed clauses, full IR
  coverage, optionality, exact Deva/name filters, source/destination, and
  both once-per-turn declarations.
- Q3577 with same-name Deva cards in battle area and trash, plus structural
  coverage of an effect-placed Option permanent in the name-scope setup.
- Q3578 with the candidate name present only under a Digimon and a Tamer.
- Q3579/Q3581 with a Deva candidate played directly into breeding; the
  candidate's On Play and an inherited when-played watcher both remain
  inactive.
- Q3580 through public P-130 movement followed by a public attack intent,
  which is rejected during the same turn.
- Q3582 with BT9-047, proving the effect-play restriction blocks only the
  breeding play and not Mihiramon's mandatory draw.
- Optional refusal after the mandatory draw.
- The Your Turn watcher through two public manual Digimon plays, asserting
  exactly one opposing top source is trashed and the same-turn trigger is
  refused on the second play.
- The inherited attack clause through public attacks and public BT1-112
  unsuspension for both a Four Sovereigns host and a God Beast host. A legal
  green Tamer source makes the 3-cost Option play legal; the first attack
  gains memory and the second same-turn attack does not. The reset and
  non-trait checks use the real turn loop and public attack intents, with
  suspended low-DP targets so every battle declaration is legal.
- A real turn-loop next-own-turn reset and a non-trait negative path.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-022.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-022.ts apps/api/src/cards/EX5/EX5-022.test.ts docs/audits/EX5-reaudit/EX5-022.md
git diff --check -- apps/api/src/cards/EX5/EX5-022.ts apps/api/src/cards/EX5/EX5-022.test.ts docs/audits/EX5-reaudit/EX5-022.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and all six Q3577–Q3582 rulings are mapped. |
| IR trace | 2/2 | Draw/unique breeding play, top-source trash watcher, inherited conditional memory, and both OPT records are encoded. |
| Behavioral proof | 2/2 | Public proofs cover exact zones, stack endpoints, memory, attack rejection, restriction, optionality, watcher suppression, and no pending decisions; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Deva peers, same-name zone scope, under-card exclusions, effect-play restriction, Four Sovereigns/God Beast hosts, top-source order, and turn reset are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-023 — WereGarurumon (X Antibody)

#### Printed contract and Q3583

EX5-023 is the blue/purple level-5, 8000 DP Ultimate Vaccine Beastkin/X
Antibody WereGarurumon (X Antibody). Its clauses are:

- When Digivolving, by trashing 2 cards from hand, unsuspend this Digimon.
  Then, if WereGarurumon or X Antibody is in its digivolution cards, you may
  return one Digimon with Garurumon or X Antibody in its name from trash to
  hand.
- Inherited When Attacking, once per turn, if this Digimon has Garurumon or
  Omnimon in its name, by trashing 1 card from hand, unsuspend this Digimon.

Q3583 confirms that declining or being unable to perform the mandatory
"trashing 2" cost aborts the subsequent Then return.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-023.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-023", compiled)`. The When Digivolving
action is a mandatory `Unsuspend` with a two-card hand-trash cost and
`abortOnDecline: true`, followed by the optional conditional return. The
inherited action is a once-per-turn conditional self-unsuspend with a one-card
hand-trash cost and the printed name boundary. No production card change was
needed.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-023.test.ts` now covers:

- Catalog identity, both blue/purple level-4 evolution costs, full IR coverage,
  mandatory cost, abort semantics, exact stack-name condition, inherited
  name condition, and once-per-turn frequency.
- Q3583 through a public digivolution with only one available hand card while
  the harness explicitly declines optional decisions; the mandatory two-card
  cost is unavailable, the new card remains suspended, the candidate trash
  card remains in trash, and no Then return decision is opened.
- A separate public response declines the optional Then return after the
  mandatory two-card cost is paid, proving the cost cards are trashed while the
  eligible return target remains in trash.
- Public blue and purple level-4 evolution routes, exact four-memory payment,
  two hand cards trashed, unsuspend endpoint, and matching Garurumon/X
  Antibody return. The purple route uses an exact WereGarurumon stack card,
  offers two legal trash targets, and answers the public selection with the
  named target, leaving the other matching card in trash.
- Public negative exact-stack proof where neither WereGarurumon nor X
  Antibody is present, leaving the trash target in trash.
- Public inherited attacks proving one hand-trash/unsuspend activation and a
  same-turn second attack that cannot pay the once-per-turn cost again.
- Public negative inherited-name proof with a non-Garurumon/Omnimon host.
- Public illegal level-3 evolution rejection with memory, stack, and pending
  decision unchanged.

#### Verification status

Per the accelerated card-lane instruction, Vitest, typecheck, and broad suites
were intentionally not run. The coordinator must schedule the focused serial
test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-023.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks run for the card and test are:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-023.ts apps/api/src/cards/EX5/EX5-023.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-023.ts apps/api/src/cards/EX5/EX5-023.test.ts docs/audits/EX5-reaudit/EX5-023.md
git diff --check -- apps/api/src/cards/EX5/EX5-023.ts apps/api/src/cards/EX5/EX5-023.test.ts docs/audits/EX5-reaudit/EX5-023.md
```

The scoped `oxlint`, `oxfmt --check`, and `git diff --check` commands passed.

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Exact catalog contract and Q3583 are mapped. |
| IR trace | 2/2 | Mandatory two-card cost, abort-on-failure Then boundary, conditional return, inherited cost, name filters, and OPT are encoded. |
| Behavioral proof | 2/2 | Public Q3583, both evolution colors, exact endpoints, inherited OPT, negative name/source paths, and pending-state checks are prepared; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Blue/purple legal stacks, exact WereGarurumon/X Antibody source distinctions, matching/nonmatching inherited hosts, and illegal level boundary are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-024 — Azulongmon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-024` is a blue/yellow level-6 Digimon with 12000 DP, play cost 7, and the `[Holy Dragon]/[Four Great Dragons]/[Four Sovereigns]` traits. It evolves from a blue or yellow level-5 Digimon for 4 memory. Its printed effects are:

> [Hand] [Counter] ＜Blast Digivolve＞ (Your Digimon may digivolve into this card without paying the cost.)
>
> [On Play] [When Digivolving] Return 1 of your opponent's level 5 or lower Digimon to the hand. Then, unsuspend 1 of your Digimon with the [Deva]/[Four Great Dragons]/[Four Sovereigns] trait.
>
> [On Deletion] Delete 1 of your opponent's Digimon with the highest level.

The local knowledge-base query returned no card Q&A for EX5-024. No ruling is claimed beyond the catalog text.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-024.ts` already registers only `registerIrCard("EX5-024", compiled)`.

The existing compiled IR maps the hand Counter Blast Digivolve keyword, both On Play and When Digivolving action sequences, and the On Deletion highest-level target. The return filter is opponent Digimon at level ≤5; the unsuspend filter is one own Digimon with the exact Deva/Four Great Dragons/Four Sovereigns trait bucket; deletion selects one opponent Digimon at the highest level. No module change was required.

#### Behavioral evidence prepared

`apps/api/src/cards/EX5/EX5-024.test.ts` contains public-path proof for:

| Clause | Public/observable proof |
| --- | --- |
| Catalog and IR identity | Catalog colors, level, costs, DP, traits, complete coverage, hand origin, Blast Digivolve keyword, action filters, count, and highest-level deletion are asserted. |
| On Play | Public play from hand pays 7 memory, returns the opposing level-5 Majiramon to hand while leaving opposing level-6 Titamon in play, unsuspends one own Deva, and leaves a nonmatching peer suspended. |
| When Digivolving | Public blue level-5-to-level-6 evolution pays 4 memory, preserves the source in the stack, returns only the opposing level-5 Digimon, and unsuspends the evolved destination. |
| On Deletion | A public battle deletes Azulongmon and its resolved On Deletion effect deletes the opposing highest-level Digimon (level 6), leaving the level-5 peer. |
| Evolution boundary | A public level-3 source is rejected without charging memory or moving Azulongmon. |
| Fixtures and resolution safety | Fixtures use inert main-deck Digimon and contain no Digi-Egg in deck or security. Assertions settle asynchronous resolution and require no pending decision. |

#### Verification

- `node tools/kb/query.mjs card EX5-024` — **no knowledge-base entries returned**; documented accurately above.
- `pnpm exec oxfmt apps/api/src/cards/EX5/EX5-024.test.ts` — **passed (mechanical formatting only)**.
- Focused Vitest — **not run yet per coordinator scheduling/RAM gate**. Queue command: `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-024.test.ts --maxWorkers=1 --no-file-parallelism`.
- Workspace typecheck and broad suites — **not run**, coordinator-owned.

#### Score (worker maximum 8/10; focused execution pending)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract recorded; KB result is explicitly no card Q&A. |
| IR trace | 2/2 | All printed keyword, timing, target, count, level boundary, trait bucket, and highest-level clauses map to IR. |
| Behavioral proof | 2/2* | Public play, evolution, battle deletion, exact endpoints, costs, and illegal-source boundary are authored; *focused execution is pending*. |
| Peer/stack proof | 2/2* | Legal blue level-5 stack, source-stack assertion, matching/nonmatching trait peers, and level-5/level-6 comparison are authored; *focused execution is pending*. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are not awarded to a card lane. |

**Worker score: 8/10 (provisional pending serial Vitest).**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-025 — Dianamon

#### Printed contract and Q3584–Q3587

EX5-025 is a blue level-6, 12-cost, 12000 DP Mega with the Shaman/Olympos
XII/Night Claw traits. Its printed contract is:

- Blocker.
- `[When Digivolving] [When Attacking] [Once Per Turn]`, for each of this
  Digimon's digivolution cards, trash one digivolution card from one opponent's
  Digimon. Then, until the end of the opponent's turn, opponent Digimon with no
  digivolution cards can't suspend.
- `[All Turns] [Once Per Turn]` when an opponent's Digimon's digivolution card
  is trashed, unsuspend this Digimon.

The KB answers Q3584–Q3587 establish that the two front timing windows share
one Once Per Turn use; the suspend lock applies to suspension by effects from
either controller; it is a live set that catches later source-less entrants;
and an affected Digimon is released as soon as it gains a digivolution card.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-025.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-025", compiled)`. The front action uses
one `TrashDigivolution` per own source card across opponent stacks, followed by
a live `Restrict` on opponent Digimon whose stacks are empty. The Digivolving
and Attacking effects share `frequency: "OncePerTurn"` and
`sharedUseKey: "ir-shared-0"`. The All Turns watcher listens only to opponent
digivolution-card trash and unsuspends self once per turn. Coverage is full and
the residual list is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-025.test.ts` now uses public intents for the card's
behavioral paths:

- Public blue level-5 evolution trashes exactly one opposing source per own
  source card, locks both the emptied stack and an already source-less
  opponent, and observes the All Turns unsuspend.
- A later public attack in the same turn proves the shared Once Per Turn key
  prevents a second front-window trash.
- A public suspension effect attempts to suspend a locked opponent Digimon and
  leaves it unsuspended (Q3585).
- A real opponent turn publicly plays a later source-less Digimon and observes
  the live lock (Q3586), then publicly evolves an affected Digimon and proves
  the lock disappears. The restored Digimon publicly attacks a suspended
  opposing Digimon and reaches the completed battle endpoint (Q3587), avoiding
  a player-security win flow.
- Catalog/IR assertions cover Blocker, both evolution/attack routes, exact
  scaling, restriction duration/live predicate, All Turns event source, and
  once-per-turn metadata. An illegal level-3 evolution is rejected without
  mutation.

#### Verification status

Per the accelerated card-lane instruction, Vitest and typecheck were not run;
the coordinator owns the serial focused execution. No broad suite was run.
The scoped `oxlint`, `oxfmt --check`, and `git diff --check` commands passed.

No engine gap is claimed. No shared, catalog, ledger, RUN, notes, or other card
files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and all four KB rulings are mapped. |
| IR trace | 2/2 | Blocker, shared front OPT, per-source trash scaling, live no-source lock, duration, and All Turns unsuspend are encoded. |
| Behavioral proof | 2/2 | Public evolution, attack, suspension, live entrant, source restoration, and illegal-route endpoints are prepared; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Multi-source opponent stack, source-less peer, later entrant, and public evolution/attack stack routes are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-026 — MetalGarurumon (X Antibody)

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-026` is a blue/purple level-6 Digimon with 12000 DP, play cost 12, and the `[Cyborg]/[X Antibody]` traits. It evolves from a blue or purple level-5 Digimon for 4 memory. Its printed effects are:

> ＜Blocker＞
>
> [When Digivolving] If [MetalGarurumon] or [X Antibody] is in this Digimon's digivolution cards, until the end of your opponent's turn, all of their Digimon gain "[When Attacking] Lose 4 memory".
>
> [When Attacking] By returning 1 Digimon card from your trash to the bottom of the deck, delete 1 of your opponent's Digimon with the same level as that card.

The local knowledge base returns:

- Q3588: the returned card's level may differ from every opposing Digimon; it can still be returned to the deck bottom.
- Q3589: a no-level returned Digimon cannot select an opposing no-level Digimon through a level-referencing effect.
- Q3590: the When Digivolving grant applies to all of the opponent's Digimon, including later battle-area entrants.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-026.ts` registers only `registerIrCard("EX5-026", compiled)`.

The IR already covered Blocker, the opponent-wide timed aura, and the When Attacking return/delete sequence. The audit correction changes the second stack condition from an exact card-name match to the exact `[X Antibody]` trait match required by the printed text; the `[MetalGarurumon]` branch remains an exact name match. The aura retains `includeLaterEntrants: true`, expires at `untilOpponentTurnEnd`, and grants the opponent's Digimon the explicit When Attacking memory-loss action. The attack cost returns one own trash Digimon to deck bottom, stores its level, and targets one opposing Digimon at that level.

#### Behavioral evidence prepared

`apps/api/src/cards/EX5/EX5-026.test.ts` contains public-path proof for:

| Clause | Public/observable proof |
| --- | --- |
| Catalog and IR identity | Catalog colors, level, costs, DP, forms, attributes, traits, complete coverage, Blocker keyword, aura condition/duration, later-entrant flag, return cost, stored level, and same-level deletion filter are asserted. |
| Legal evolution and conditional aura | A public blue/purple EX5-023 (X Antibody) source evolves into EX5-026 for exactly 4 memory. During the real turn loop, an opponent's later-played BT14-058 gains Rush through its own public On Play path and attacks; the aura makes the opponent lose 4 memory. |
| Negative stack boundary | A legal level-five EX5-021 source without MetalGarurumon name or X Antibody trait evolves at the same cost, but an opponent attack does not lose memory. |
| Blocker | A public attack opens the block window; a `declareBlock` intent suspends EX5-026 and redirects the battle, deleting the weaker attacker. |
| When Attacking | A public attack returns one trash Digimon to deck bottom and deletes exactly one opposing Digimon with the returned card's level, leaving a different-level peer. |
| Q3588 | A returned level-5 card is accepted and returned even when the only opponent is level 6; no target is deleted. |
| Q3589 | A returned no-level Digimon card is accepted, but an opposing no-level Digimon is not selected by the level-equality target. |
| Evolution boundaries and peer route | A public purple level-five BT11-071 route succeeds for 4 memory, while a level-three BT1-009 source is rejected without charging memory or moving EX5-026. |
| Fixtures and resolution safety | No Digi-Egg appears in deck or security. Public intents, real turn loops, `settle()`, and exact endpoint assertions are authored; no direct timing or behavior verbs are used. |

#### Verification

- `node tools/kb/query.mjs card EX5-026` — **Q3588, Q3589, and Q3590 returned and mapped above**.
- `pnpm exec oxfmt apps/api/src/cards/EX5/EX5-026.test.ts` — **passed (mechanical formatting only)**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-026.ts apps/api/src/cards/EX5/EX5-026.test.ts` — **passed**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-026.ts apps/api/src/cards/EX5/EX5-026.test.ts` — **passed with no diagnostics**.
- `git diff --check -- apps/api/src/cards/EX5/EX5-026.ts apps/api/src/cards/EX5/EX5-026.test.ts docs/audits/EX5-reaudit/EX5-026.md` — **passed**.
- Focused Vitest — **not run per coordinator instruction**. Queue command: `pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-026.test.ts --maxWorkers=1 --no-file-parallelism`.
- Workspace typecheck and broad suites — **not run**, coordinator-owned.

#### Score (worker maximum 8/10; focused execution pending)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract and all three indexed rulings are recorded. |
| IR trace | 2/2 | Corrected X Antibody trait condition; every keyword, duration, later-entrant, cost, level-binding, and target clause maps to IR. |
| Behavioral proof | 2/2* | Public aura, later entrant, Blocker, attack cost/deletion, negative stack, Q3588, Q3589, and evolution-boundary cases are authored; *focused execution is pending*. |
| Peer/stack proof | 2/2* | Blue/purple legal source routes, matching X Antibody and nonmatching Deva stacks, exact-level peer, and no-level peer are authored; *focused execution is pending*. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are not awarded to a card lane. |

**Worker score: 8/10 (provisional pending serial Vitest).**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-027 — Liollmon

#### Printed contract and Q3591

EX5-027 is the yellow/green level-3, 1000 DP Rookie Vaccine Holy Beast
Liollmon. Its catalog contract includes yellow or green level-2 evolution for
1 and the alternate `[Digivolve][Frimon]: Cost 0` route.

Its clauses are:

- On Play, optionally add one card with `[Leomon]` in its name from the
  controller's security stack to hand. If a card was added, recover 1 from the
  deck, then shuffle the security stack.
- Inherited On Deletion: one opponent's Digimon gets -2000 DP until the end of
  their turn.

The local KB returns Q3591: when the On Play effect adds the Leomon-name card
from security, the added card must be revealed to the opponent before it is
added to hand.

The implementation uses the production security-search reveal path, exposing
the selected card before moving it to hand; the resulting hand instance retains
the revealed/face-up state. Recovery is gated by `ifThisEffectActed`, so a
declined or unsuccessful search does not add a deck card. The final shuffle
re-hides the security stack.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-027.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-027", compiled)`. The module now also
publishes the printed alternate evolution requirement.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Optional security search | `OnPlay` → optional `Search` in `security`, exact `Leomon` name filter, `to: hand` | Q3591 revealed/face-up selected hand instance, unchanged security count, and face-down post-shuffle state |
| Conditional Recovery +1 | `SecurityManipulation(addTop, source: deck)` with `ifThisEffectActed` | positive deck-top endpoint and negative/no-card/declined paths |
| Security shuffle | final `SecurityManipulation(shuffle)` | exact security card set and all cards hidden after resolution |
| Inherited deletion DP | inherited `OnDeletion` → opponent Digimon `ModifyDP -2000`, `untilOpponentTurnEnd` | public opposing attack deletes the host and modifies the selected opponent Digimon |
| Evolution | `digivolutionRequirement: [{ names: ["Frimon"], cost: 0, isAlternate: true }]` plus catalog yellow/green level-2 routes | public normal yellow route, public zero-cost Frimon route, and illegal alternate source |

#### Behavioral proof prepared

`EX5-027.test.ts` covers:

- Catalog identity, colors, stats, forms, attributes, traits, normal evolution
  costs, printed text, full IR coverage, security action order, conditional
  Recovery, shuffle, inherited duration, and alternate Frimon evolution.
- Q3591 with a Leomon card in security, asserting its revealed/face-up hand
  instance, security card set/count, recovered deck card, and face-down
  security state after shuffle.
- No matching Leomon and optional refusal, proving security/deck endpoints,
  order-independent security multisets after the mandatory shuffle, and no
  false Recovery.
- Inherited On Deletion through a public opposing attack, with exact host
  departure and selected opponent DP endpoint.
- Public normal yellow level-2 evolution, public zero-cost Frimon alternate
  evolution (including the rule-mandated draw 1 endpoint), and an illegal
  alternate source that remains unchanged.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-027.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-027.ts apps/api/src/cards/EX5/EX5-027.test.ts docs/audits/EX5-reaudit/EX5-027.md
git diff --check -- apps/api/src/cards/EX5/EX5-027.ts apps/api/src/cards/EX5/EX5-027.test.ts docs/audits/EX5-reaudit/EX5-027.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3591 are documented, including public reveal and the Frimon alternate route. |
| IR trace | 2/2 | Security search, conditional Recovery, shuffle, inherited deletion DP, and alternate evolution are mapped. |
| Behavioral proof | 2/2 | Security/hand/deck endpoints, reveal event, shuffle visibility, optional refusal, public deletion, and evolution outcomes are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Leomon/non-Leomon security peers, exact inherited source stack, public opponent deletion, normal/alternate evolution, and illegal source are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-028 — Kudamon

#### Printed contract

Catalog source: `packages/shared/src/cards/data/cards.json`.

`EX5-028` is a yellow level-3 Digimon with 2000 DP, play cost 4, the Rookie form, Vaccine attribute, and Holy Beast type. It evolves from a yellow level-2 Digimon for 0 memory. Its printed effects are:

> [On Play] If there're 6 or fewer total cards in both players' security stacks, you may play 1 yellow Tamer card from your hand without paying the cost.
>
> Inherited: [When Attacking] [Once Per Turn] If there're 6 or fewer total cards in both players' security stacks, 1 of your opponent's Digimon gets -2000 DP for the turn.

The local knowledge base returns Q3592 (2024-03-28): “total cards in both players' security stacks” is the sum of both players' security counts, not the count in either stack independently.

#### IR trace and changes

`apps/api/src/cards/EX5/EX5-028.ts` already registers only `registerIrCard("EX5-028", compiled)` and required no module change.

The existing compiled IR maps the optional On Play free-play action to exactly one own yellow Tamer under a `totalSecurityCount <= 6` condition. The inherited When Attacking action is explicitly Once Per Turn, targets one opponent Digimon, applies -2000 DP for the turn, and uses the same combined-security condition.

#### Behavioral evidence prepared

`apps/api/src/cards/EX5/EX5-028.test.ts` contains public-path proof for:

| Clause | Public/observable proof |
| --- | --- |
| Catalog and IR identity | Catalog colors, level, cost, DP, evolution, form, attribute, type, exact text, complete coverage, optional On Play action, inherited Once Per Turn action, duration, target, and condition are asserted. |
| Q3592 / On Play positive | With 3 security cards for each player (combined total exactly 6), a public Kudamon play pays 4 memory and publicly plays BT1-087 T.K. for free. |
| Optionality and boundary | At the same qualifying total, an auto-declined optional effect leaves the Tamer in hand. At total 7 (4 + 3), accepting optional resolution still leaves it in hand. |
| Inherited positive and Once Per Turn reset | A legal stack carrying the yellow Digi-Egg is exercised through public intents. A legal green Tamer is played, then BT1-112 Dimension Scissor grants the host its public battle-unsuspend effect. The first host attack reduces the selected opponent Digimon from 5000 to 3000 and deletes a weaker suspended opponent; the host unsuspends publicly. A second same-turn attack records no second EX5-028 trigger, and the next own turn resets the cap and applies -2000 again. |
| Strict inherited boundary | At total 7, a public attack leaves the opponent Digimon at 5000 DP. |
| Legal evolution stack | Public `hatchEgg`, zero-memory yellow evolution, turn progression, and `moveFromBreeding` prove the legal level-2-to-level-3 route and preserved stack. |
| Fixtures and resolution safety | Main decks and security use inert non-Digi-Egg cards; the only Digi-Egg is in the breeding egg deck. Assertions settle asynchronous resolution and require no pending decision. |

#### Verification

- `node tools/kb/query.mjs card EX5-028` — **Q3592 returned and mapped above**.
- `pnpm exec oxfmt apps/api/src/cards/EX5/EX5-028.test.ts` — **passed (mechanical formatting only)**.
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-028.ts apps/api/src/cards/EX5/EX5-028.test.ts` — **passed**.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-028.ts apps/api/src/cards/EX5/EX5-028.test.ts` — **passed with no diagnostics**.
- `git diff --check -- apps/api/src/cards/EX5/EX5-028.ts apps/api/src/cards/EX5/EX5-028.test.ts docs/audits/EX5-reaudit/EX5-028.md` — **passed**.
- Focused Vitest — **passed: 6 tests / 6 tests** with `pnpm exec vitest run src/cards/EX5/EX5-028.test.ts --maxWorkers=1 --no-file-parallelism`.
- Workspace typecheck and broad suites — **not run**, coordinator-owned.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog/rules | 2/2 | Exact catalog contract and Q3592 combined-security ruling are recorded. |
| IR trace | 2/2 | Optionality, yellow Tamer filter, combined-security threshold, inherited timing, Once Per Turn, target, amount, and duration map to IR. |
| Behavioral proof | 2/2 | Public On Play, optional refusal, 7-card negative, inherited attack, same-turn cap, reset, and exact endpoints pass focused execution. |
| Peer/stack proof | 2/2 | Public yellow Digi-Egg-to-Kudamon evolution and legal stack transition pass focused execution. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-029 — Reppamon

#### Printed contract and Q3593

EX5-029 is a yellow level-4, 4-cost, 4000 DP Champion with the Holy Beast
trait. Its clauses are:

- `[When Attacking]` by trashing the top card of your security stack, reduce
  the cost of your next digivolution this turn by 2.
- Inherited `[When Attacking] [Once Per Turn]`, if the total number of cards in
  both players' security stacks is 6 or fewer, give one opponent Digimon -2000
  DP for the turn.

Q3593 explicitly counts both players' security stacks, not only the attacking
player's stack.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-029.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-029", compiled)`. The non-inherited
When Attacking action uses a mandatory top-security trash cost and a
next-digivolve-this-turn -2 cost modifier. The inherited action is a
once-per-turn opponent-Digimon -2000 DP modifier gated by the combined
security-count condition. Coverage is full and the residual list is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-029.test.ts` covers:

- Catalog identity, yellow level/evolution data, exact printed clauses, IR
  coverage, top-security cost, next-evolution duration, inherited OPT, and the
  combined-security condition.
- A public attack against a non-empty opponent security stack that trashes the
  exact top security instance, followed by a legal public yellow
  level-3-to-level-4 evolution (`BT1-050` into `BT1-051`) whose printed cost of
  2 is reduced to 0.
- Public inherited attacks at the Q3593 boundary (3 + 3 security cards) and
  just above it (4 + 3), proving the condition reads both stacks.
- The negative no-attack route, which pays the normal evolution cost and does
  not receive a stale reduction.

#### Verification status

Per the no-test card-lane instruction, Vitest, typecheck, and broad suites were
not run. The coordinator owns focused serial execution. No engine gap is
claimed and no internal timing seam is used in the behavioral tests.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3593 are mapped. |
| IR trace | 2/2 | Security cost, next-evolution reduction, inherited OPT, DP amount, and combined threshold are encoded. |
| Behavioral proof | 2/2 | Public attack/evolution endpoints, exact security identity, threshold boundary, and negative route are prepared; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Legal yellow evolution and inherited stack host are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-030 — Liamon

#### Printed contract and Q3594

EX5-030 is the yellow/green level-4, 5000 DP Champion Vaccine Holy Beast
Liamon. Its catalog contract includes yellow or green level-3 evolution for 3
and alternate `[Digivolve][Liollmon]: Cost 2` or
`[Digivolve][Elecmon]: Cost 2` routes.

Its clauses are:

- When Attacking, this Digimon may digivolve into a Digimon card with
  `[Leomon]` in its name from hand, reducing that card's digivolution cost by
  1.
- Rule: this card's name is treated as having `[Leomon]`.
- Inherited On Deletion: one opponent's Digimon gets -2000 DP until the end of
  their turn.

The local KB returns Q3594: the attack-digivolve effect does not ignore the
candidate card's normal digivolution requirements. The candidate must both
have `[Leomon]` in its name and be an applicable legal evolution.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-030.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-030", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Optional attack digivolve | `WhenAttacking` → optional self `Digivolve`, hand source, exact `Leomon` name filter, `payCost: true`, `reduceCost: 1` | public attack upgrades Liamon into EX5-049 and charges 3 instead of 4 |
| Optional boundary | no printed Once Per Turn clause or IR frequency | public refusal leaves the host, hand, memory, and decision state unchanged |
| Q3594 requirements | candidate uses the normal Digivolve legality path in addition to the `Leomon` name filter | public attack cannot use blue BT1-035 despite its Leomon name |
| Rule name grant | `Rule` → self `GrantStatic` name `Leomon` | legal public attack evolution into GrapLeomon requires the granted identity |
| Alternate evolution | two compiled requirements for Liollmon and Elecmon at cost 2 | public direct evolution covers normal EX5-028 cost 3 and both alternate sources at cost 2 |
| Inherited deletion DP | inherited `OnDeletion` → opponent Digimon `ModifyDP -2000`, `untilOpponentTurnEnd` | public opposing attack deletes the suspended host and leaves the selected opponent at 3000 DP |

#### Behavioral proof prepared

`EX5-030.test.ts` covers:

- Catalog identity, colors, stats, forms, attributes, traits, normal and
  alternate evolution costs, printed clauses, full IR coverage, no OPT
  frequency, exact effect filters, payment, reduction, and inherited duration.
- A public player attack that legally digivolves Liamon into EX5-049, moves the
  selected card from hand, resolves the stack endpoint, and charges the exact
  reduced cost.
- Public optional refusal, with no evolution, no memory payment, and no stale
  decision.
- Q3594's negative path: BT1-035 has `[Leomon]` in its name but its blue level-3
  requirement is not applicable to Liamon, so it remains in hand.
- Public normal yellow evolution from EX5-028 and both printed alternate
  sources, Liollmon and Elecmon, including exact memory costs, source stacks,
  and the mandatory evolution draw endpoint.
- Inherited deletion through a public opposing attack against a suspended host,
  including host removal and exact opponent DP.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-030.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-030.ts apps/api/src/cards/EX5/EX5-030.test.ts docs/audits/EX5-reaudit/EX5-030.md
git diff --check -- apps/api/src/cards/EX5/EX5-030.ts apps/api/src/cards/EX5/EX5-030.test.ts docs/audits/EX5-reaudit/EX5-030.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3594 are documented, including normal requirements and both alternate routes. |
| IR trace | 2/2 | Attack digivolve, Leomon identity grant, alternate requirements, inherited deletion DP, and no-OPT shape are mapped. |
| Behavioral proof | 2/2 | Public legal/refusal/negative attack paths, exact costs/endpoints, normal and alternate evolution, and public deletion are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Leomon-name legal and illegal peers, normal/alternate sources, exact inherited stack, and public opposing deletion are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-031 — Chirinmon

#### Printed contract and Q3595–Q3596

EX5-031 is a yellow level-5, 7-cost, 7000 DP Ultimate with the Holy Beast
trait. Its printed clauses are:

- `[When Digivolving]` By trashing the top card of your security stack,
  unsuspend this Digimon.
- Inherited `[When Attacking] [Once Per Turn]`, if the total number of cards
  in both players' security stacks is 6 or fewer, you may place one yellow
  card from your hand on top of your security stack.

Q3595 confirms that the mandatory security cost may be paid even when the
Digimon is already unsuspended. Q3596 confirms that the threshold sums both
players' security stacks (for example, 3 + 2 = 5).

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-031.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-031", compiled)`. The When Digivolving
effect has a mandatory top-security trash cost and self-unsuspend action. The
inherited effect is an optional, once-per-turn hand-to-security-top placement
gated by the combined-security-count condition. Coverage is full and the
residual list is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-031.test.ts` uses public intents and covers:

- Catalog identity, printed text, exact evolution cost, IR coverage, mandatory
  security cost, self-unsuspend, inherited optionality, and Q3595/Q3596.
- Public digivolution with a security card while the source is already
  unsuspended, proving the card is still trashed and the result remains
  unsuspended in a complete board state with a legal opposing Digimon.
- The no-security negative path, proving the Digimon remains suspended after
  the public evolution.
- A public attack at the combined threshold (3 + 2) that places the selected
  yellow hand card at the top of security, plus a 4 + 3 above-threshold route
  that leaves the hand card in hand.

#### Verification status

Per the accelerated card-lane instruction, Vitest and typecheck were not run;
the coordinator owns focused serial execution. No broad suite was run. The
scoped `oxlint`, `oxfmt`, `oxfmt --check`, and `git diff --check` checks passed
after the explicit security-response fixture correction.
No engine gap is claimed and no shared, catalog, ledger, RUN, notes, or other
card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Printed clauses and Q3595–Q3596 are mapped. |
| IR trace | 2/2 | Mandatory security cost, unsuspend, inherited optional placement, combined threshold, and OPT are encoded. |
| Behavioral proof | 2/2 | Public positive, unavailable-cost, threshold, and above-threshold endpoints are prepared; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Legal yellow level-4 source and security boundary routes are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-032 — LoaderLeomon

#### Printed contract and knowledge-base status

EX5-032 is a yellow/green level-5, 7-cost, 7000 DP Ultimate with the Machine
trait. Its printed clauses are:

- `<Fortitude>`.
- `[On Play]` and `[When Digivolving]`: one opposing Digimon gets -3000 DP
  until the end of its controller's turn.
- Inherited `[Opponent's Turn]`: while this Digimon has [Leomon] in its name,
  it gains `<Blocker>`.
- Alternate digivolution: from a level-4 Digimon with [Leomon] in its name,
  for 3 memory.

The card knowledge-base query returned no Q&A for EX5-032. No Q&A is therefore
claimed or attributed here.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-032.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-032", compiled)`. The module encodes the
Fortitude keyword, both -3000 DP triggers with `untilOpponentTurnEnd`, the
inherited opponent-turn Leomon-name condition and Blocker aura, and the exact
alternate level-4 Leomon evolution recipe. Coverage is full with an empty
residual list.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-032.test.ts` uses public intents and legal fixtures
to cover:

- Catalog identity, exact costs/stats, all printed clauses, IR coverage, and
  the alternate evolution requirement.
- Public On Play selection of one opposing Digimon, an unaffected peer, exact
  play cost, and the -3000 DP duration through the opponent's turn and reset
  on the next own turn.
- Public When Digivolving from EX5-030 (whose Rule effect supplies the
  Leomon-name condition), the exact 3-memory alternate cost, stack endpoint,
  target reduction, and unaffected peer.
- Inherited Blocker on a Leomon-name host during a real opponent attack and
  Blocker absence on a non-Leomon host.
- Public battle deletion proving Fortitude replays the same top-card instance
  only when the stack has a digivolution card, while the no-source control
  remains deleted.
- Rejection of the alternate route from a non-Leomon level-3 source.

#### Verification status

Per the accelerated card-lane instruction, Vitest and typecheck were not run;
the coordinator owns focused serial execution. No broad suite was run. The
scoped static checks for this card are coordinator-pending. No engine gap is
claimed. No shared, catalog, ledger, RUN, notes, or other card files were
changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | All printed clauses, exact stats, and the alternate evolution route are mapped; KB returned no Q&A. |
| IR trace | 2/2 | Fortitude, both duration-limited reductions, inherited conditional Blocker, and full coverage are encoded. |
| Behavioral proof | 2/2 | Public play, evolution, timing, inherited Blocker, and Fortitude positive/negative endpoints are prepared. |
| Peer / stack proof | 2/2 | Legal EX5-030 Leomon source, non-Leomon rejection, Leomon-name host, and source/no-source Fortitude cases are prepared. |
| Delivery gates | 0/2 | Coordinator-owned focused execution and collection gates are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-033 — Mitamamon

#### Printed contract and Q3597–Q3599

EX5-033 is the yellow level-6, 11000 DP Mega Vaccine God Beast Mitamamon. Its
catalog contract includes yellow level-5 evolution for 3.

Its clauses are:

- When Digivolving or When Attacking, once per turn, trash the top card of the
  controller's security stack to optionally play one yellow level-4-or-lower
  card from hand without paying its play cost. Any Digimon played this way
  gains Rush for the turn.
- All Turns: all of the controller's yellow Digimon gain Barrier.
- Opponent's Turn: all opponent Digimon whose level is greater than or equal to
  the total number of cards in both security stacks gain Security Attack -2.

The local KB returns:

- Q3597: the Security Attack -2 aura applies to every opposing Digimon whose
  level is at least the combined security total.
- Q3598: the threshold counts both players' security stacks.
- Q3599: the threshold is live; after security decreases, lower-level opposing
  Digimon can newly qualify.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-033.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-033", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Shared optional play package | `WhenDigivolving` and `WhenAttacking`, each `OncePerTurn` with `sharedUseKey: "ir-shared-0"` | public digivolution trashes security, plays a yellow level-4, and grants Rush; a same-turn public attack cannot reuse the package; the owner's next turn can use it again |
| Security cost | `PlayWithoutCost` with top own-security trash cost | exact security/trash endpoints are asserted after public digivolution |
| Level/color play filter | controller mine, Yellow, level <= 4, from hand, no play cost | public BT1-045 fixture is played and removed from hand |
| Rush binding | `GainKeyword` bound to `playedByThisEffect`, `forTheTurn` | played public Digimon has Rush while the source remains separate |
| Barrier | All Turns yellow-Digimon Aura | own yellow Mitamamon and BT1-045 have Barrier; own red and opposing yellow do not |
| Dynamic Security Attack -2 | Opponent-turn `GainKeyword`, opponent Digimon, `gte` dynamic combined-security count, live target filter, through opponent-turn end | Q3597/Q3598 initial total 4 selects level 4 but not level 3; Q3599 trashing one security dynamically qualifies level 3 |

#### Behavioral proof prepared

`EX5-033.test.ts` covers:

- Catalog identity, colors, stats, evolution cost, printed clauses, full IR
  coverage, exact action filters, security cost, play binding, Rush, Barrier,
  dynamic threshold, and shared Once Per Turn metadata.
- Public digivolution with exact top-security trash, yellow level-4 play,
  hand/trash/security endpoints, and Rush.
- Public same-turn attack proving the digivolution and attack clauses share one
  Once Per Turn use, followed by a real owner-turn reset that permits the
  attack clause again and plays the second candidate.
- The reset loop supplies both players with enough deck cards for the normal
  draw/turn lifecycle instead of relying on an underspecified empty deck.
- Q3597–Q3599 with combined security total 4, a qualifying level-4, a level-3
  near miss, and live requalification after one security card is trashed.
- Barrier recipient boundaries across own yellow, own red, and opposing yellow
  Digimon.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-033.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-033.ts apps/api/src/cards/EX5/EX5-033.test.ts docs/audits/EX5-reaudit/EX5-033.md
git diff --check -- apps/api/src/cards/EX5/EX5-033.ts apps/api/src/cards/EX5/EX5-033.test.ts docs/audits/EX5-reaudit/EX5-033.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3597–Q3599 are documented, including combined and live security threshold semantics. |
| IR trace | 2/2 | Security cost, bound play/Rush, shared Once Per Turn, Barrier, and dynamic Security Attack -2 are mapped. |
| Behavioral proof | 2/2 | Public play/attack/reset endpoints, exact security movement, Rush, Barrier boundaries, and dynamic threshold are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Yellow level-4 candidate, rejected color/level peers, same-turn shared trigger, cross-turn reset, and threshold boundary peers are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-034 — BanchoLeomon

#### Printed contract and Q3600

EX5-034 is a yellow/green level-6, 12-cost, 12000 DP Mega with the
Beastkin/Boss traits. Its printed clauses are:

- When this card would be played from hand, if both security stacks contain 6
  or fewer cards total, reduce its play cost by 5.
- On Play and When Digivolving, suspend one opponent Digimon.
- All Turns, once per turn, when a Digimon becomes suspended, you may have one
  opponent Digimon get -4000 DP and gain Security Attack -1 until the end of
  their turn.

Q3600 confirms that the security threshold is the sum of both players' stacks.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-034.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-034", compiled)`. The BeforePayCost
condition reduces play cost by 5 at the combined threshold. On Play and When
Digivolving each suspend one opposing Digimon. The All Turns watcher is once
per turn and binds one optional target before applying both the -4000 DP and
Security Attack -1 package through the same selection reference. Coverage is
full and residual is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-034.test.ts` covers:

- Catalog identity, exact level/cost/colors/traits and all printed clauses;
  IR metadata for cost reduction, both suspension routes, optional binding,
  DP reduction, and Security Attack -1.
- Public hand play at 3 + 3 security, asserting seven memory paid and the
  suspended target receives both parts of the package.
- Public play above the threshold, asserting the normal 12-cost payment.
- Public optional refusal, asserting the target remains at printed DP and
  receives no Security Attack modifier.
- Public evolution into EX5-034, asserting the When Digivolving suspension
  and the same All Turns package.

#### Verification status

Per the accelerated card-lane instruction, Vitest and typecheck were not run;
the coordinator owns focused serial execution. No broad suite was run. Scoped
static checks remain coordinator-pending for this newly prepared card. No
engine gap is claimed and no shared, catalog, ledger, RUN, notes, or other
card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full printed contract and Q3600 are mapped. |
| IR trace | 2/2 | Threshold reduction, both suspension routes, shared target binding, DP, keyword, duration, and OPT are encoded. |
| Behavioral proof | 2/2 | Public positive, negative, refusal, and evolution routes are prepared; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Legal yellow/green Mega evolution and combined-security boundary fixtures are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-035 — Hawkmon

#### Printed contract and rules knowledge

EX5-035 is the green level-3, 2000 DP Rookie Free Avian Hawkmon. Its catalog
contract includes green level-2 evolution for 0.

Its clauses are:

- On Play, reveal the top 3 cards of the deck, add every revealed Digimon with
  Fortitude to hand, and place the rest at the bottom of the deck.
- Inherited All Turns: while this Digimon is suspended, it gains +1000 DP.

The local rules knowledge base has no dedicated EX5-035 ruling entry. The
implementation therefore follows the printed zone/filter boundaries directly:
the search is limited to the three revealed cards, requires both Digimon kind
and Fortitude keyword, adds all matches, and bottoms every non-match.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-035.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-035", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| On Play reveal | `RevealAdd`, `revealCount: 3` | public play resolves the exact three-card endpoint |
| Fortitude filter | controller-default mine, `kind: Digimon`, `keywords: [Fortitude]`, `count: all`, to hand | two EX5-032 matches are added; non-Fortitude BT1-009 stays out of hand |
| Non-match zone | `rest: deckBottom` | public deck endpoint contains the unmatched card at the bottom |
| Inherited DP | All Turns self Aura, +1000 DP while `selfIsSuspended` | public attack suspends the host and raises DP; production unsuspend removes the modifier |
| OPT / timing | no `frequency` is present; On Play and inherited All Turns are not once-per-turn clauses | static proof confirms no accidental OPT restriction |
| Evolution route | catalog green level-2 cost 0 | public breeding evolution from green BT1-007 succeeds; yellow BT1-005 is rejected |

#### Behavioral proof prepared

`EX5-035.test.ts` covers:

- Catalog identity, colors, stats, form, attribute, type, evolution cost,
  printed clauses, full IR coverage, exact reveal/filter/bottom actions, and
  absence of an unprinted OPT frequency.
- Public On Play with three revealed cards, adding every Fortitude Digimon and
  preserving the non-match at the deck endpoint.
- A no-match public On Play negative path proving that non-Fortitude Digimon
  are not added and the complete revealed group returns to the deck.
- Public legal green level-2 evolution and an illegal yellow level-2 peer.
- Inherited +1000 DP through a public attack suspension and a production
  unsuspend, including the exact 5000-to-6000-to-5000 DP endpoints.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-035.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-035.ts apps/api/src/cards/EX5/EX5-035.test.ts docs/audits/EX5-reaudit/EX5-035.md
git diff --check -- apps/api/src/cards/EX5/EX5-035.ts apps/api/src/cards/EX5/EX5-035.test.ts docs/audits/EX5-reaudit/EX5-035.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract is documented; no dedicated EX5-035 KB ruling exists. |
| IR trace | 2/2 | Three-card reveal, Fortitude Digimon filter, deck-bottom remainder, inherited conditional DP, and no-OPT shape are mapped. |
| Behavioral proof | 2/2 | Public positive/negative On Play, evolution legality, suspension DP, and unsuspend reset endpoints are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Fortitude/non-Fortitude reveal peers, green/yellow evolution peers, and suspended/unsuspended inherited states are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-036 — Aquilamon

#### Printed contract and rules

EX5-036 is a green level-4, 4-cost, 4000 DP Champion with the Free and Giant
Bird traits. Its printed contract is:

- `<Fortitude>`: when this Digimon with digivolution cards is deleted, play
  this card without paying its cost.
- Inherited `[All Turns]`: while this Digimon is suspended, it gets +1000 DP.

The local KB has no card-specific Q&A for EX5-036; the audit therefore follows
the catalog wording and the shared Fortitude rules seam.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-036.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-036", compiled)`. The Static effect
exposes Fortitude, while the inherited All Turns Aura adds +1000 DP only while
the host is suspended. Coverage is full and residual is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-036.test.ts` uses public intents and covers:

- Catalog identity, green level-4 evolution data, Free/Giant Bird traits,
  exact printed clauses, Fortitude keyword metadata, and inherited Aura
  predicate/amount.
- Public battle deletion of an Aquilamon with a legal green source, proving
  the same card replays for free with no digivolution cards and the source is
  trashed.
- Public battle deletion without a source, proving no Fortitude replay.
- Public attack suspension of a host carrying EX5-036, proving the inherited
  +1000 DP appears only after suspension.
- A legal public green level-3 → level-4 evolution and a wrong-color negative
  evolution that leaves memory, stack, and hand unchanged.

#### Verification status

Per the card-lane instruction, Vitest and typecheck were not run while another
lane owned the test token. No broad suite was run. Scoped static checks are
pending this preparation. No engine gap is claimed and no shared, catalog,
ledger, RUN, notes, or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full catalog contract and shared Fortitude rule are mapped. |
| IR trace | 2/2 | Fortitude keyword, inherited suspension predicate, and +1000 amount are encoded. |
| Behavioral proof | 2/2 | Public battle replay, no-source negative, suspended aura, and evolution legality routes are prepared. |
| Peer / stack proof | 2/2 | Legal green source stack and source-less peer are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-037 — Vajramon

#### Printed contract and Q3601–Q3607/Q5507

EX5-037 is the green level-5, 7000 DP Ultimate Vaccine Holy Beast/Deva
Vajramon. It has no normal digivolution cost in the catalog.

Its clauses are:

- On Play, draw 1. Then, optionally play one Deva-trait Digimon from hand
  without paying its cost into an empty breeding area, provided its name is
  different from every card in the controller's battle area and trash.
- On your turn, when you use an Option card with cost 1 or more, gain 1
  memory.
- Inherited Your Turn Once Per Turn: while the host has Four Sovereigns or God
  Beast, it gains Piercing.

The local KB returns:

- Q3601: same-name comparison includes Digimon/Tamers in battle area, Option
  cards placed by effects, and cards in trash.
- Q3602: digivolution cards under a Digimon and cards under a Tamer are not
  included in that comparison.
- Q3603: a Digimon played into breeding by this effect does not activate its
  On Play effects.
- Q3604: if that Digimon moves to the battle area during the same turn, it
  still cannot attack.
- Q3605: play watchers do not reference a Digimon played into breeding by this
  effect.
- Q3606: an active “can't be played by effects” restriction prevents the play,
  while the mandatory draw still resolves.
- Q3607: the Option trigger may activate after the used Option's Main effect
  resolves.
- Q5507: an Option activated by a method other than using the card, such as a
  Security effect, does not trigger this memory effect.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-037.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-037", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Draw and optional Deva play | On Play `Draw 1` followed by optional `PlayWithoutCost` to `breeding` | public On Play moves the selected Deva to breeding and leaves the draw in hand |
| Same-name comparison | `notSameNameAs: ["battleArea", "trash"]` | same-name top cards in battle/trash reject; source cards under Digimon and cards under Tamer do not reject |
| Breeding lifecycle | `breeding: true`, effect-play route | Q3603/Q3605 suppress candidate On Play/watchers; Q3604 public movement still cannot attack that turn |
| Effect-play restriction | production play path honors active restriction | Pomumon blocks the breeding play while Vajramon's mandatory draw remains |
| Paid Option trigger | Your Turn `SubTrigger whenOptionUsed` with cost >= 1, GainMemory +1 | public cost-one Option ends net-even after its printed cost; zero-cost and Security activation do not trigger |
| Inherited Piercing | Your Turn `frequency: OncePerTurn` Aura while live Four Sovereigns/God Beast trait | qualifying hosts have Piercing, nonmatching top cards do not, and the aura lapses after public stack replacement |

#### Behavioral proof prepared

`EX5-037.test.ts` covers:

- Catalog identity, colors, stats, forms, attributes, traits, no normal evo
  cost, exact IR actions, breeding destination, same-name zones, Option
  trigger threshold, inherited trait condition, and Once Per Turn metadata.
- Public On Play draw and unique Deva breeding placement.
- Q3601/Q3602 battle-area/trash comparisons and ignored digivolution/Tamer
  source cards.
- Q3603/Q3605 suppression of the breeding candidate's On Play and play watcher
  effects, plus Q3604 public breeding-to-battle movement and attack lock.
- Q3606 active effect-play restriction with draw preserved.
- Public paid Option memory gain, zero-cost negative boundary, and Security
  activation negative boundary for Q5507. The Security case uses the real
  turn loop and an opponent attack to reveal BT1-097 face-down, resolve its
  Draw 2, and keep Vajramon's memory unchanged.
- Inherited Piercing on Four Sovereigns/God Beast hosts and live lapse after a
  legal public Lv6-to-Lv7 digivolution replaces the qualifying top card. The
  public route asserts the exact 6-to-2 memory payment and resulting
  `[EX5-037, EX5-013]` stack beneath BT5-086.

#### Verification status

Focused serial Vitest passed for EX5-037; typecheck and broad suites remain
coordinator-owned:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-037.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-037.ts apps/api/src/cards/EX5/EX5-037.test.ts docs/audits/EX5-reaudit/EX5-037.md
git diff --check -- apps/api/src/cards/EX5/EX5-037.ts apps/api/src/cards/EX5/EX5-037.test.ts docs/audits/EX5-reaudit/EX5-037.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3601–Q3607/Q5507 boundaries are documented. |
| IR trace | 2/2 | Draw/breeding play, name zones, effect-play restriction path, Option SubTrigger, and inherited Once Per Turn Aura are mapped. |
| Behavioral proof | 2/2 | Public positive/negative breeding, restriction, movement/attack, Option, Security, and Piercing endpoints are asserted and pass focused execution. |
| Peer / stack proof | 2/2 | Same-name and source-zone peers, breeding lifecycle, cost boundaries, and legal qualifying/nonqualifying inherited stacks pass focused execution. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-038 — Vikaralamon

#### Printed contract and Q3608–Q3613

EX5-038 is a green level-5, 7-cost, 7000 DP Ultimate with the Holy
Beast/Deva traits. Its printed contract is:

- `[On Play]` Draw 1, then you may play one Deva-trait Digimon from hand into
  an empty breeding area without paying its cost, excluding names appearing in
  your battle area or trash.
- `[Your Turn] [Once Per Turn]` when one of your Digimon deletes an opponent's
  Digimon in battle and survives, unsuspend this Digimon.
- Inherited `[Your Turn] [Once Per Turn]`, while this Digimon has Four
  Sovereigns or God Beast, it gains Piercing.

The KB answers Q3608–Q3613 establish that name exclusion reads battle-area and
trash cards but not digivolution cards, breeding plays do not activate the
played card's On Play or other play watchers, a moved breeding Digimon cannot
attack that turn, and an active effect-play restriction prevents the play.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-038.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-038", compiled)`. The On Play effect
draws and optionally plays one own Deva from hand into breeding with the
battle-area/trash name exclusion. The Your Turn watcher is once per turn and
unsuspends self after the own-Digimon battle-deletion event. The inherited
Your Turn aura grants Piercing only while the host has Four Sovereigns or God
Beast. Coverage is full and residual is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-038.test.ts` uses public intents and covers:

- Catalog identity, exact printed text, IR draw/breeding/name-scope mapping,
  deletion watcher, OPT metadata, and inherited trait-gated Piercing.
- Public draw plus free Deva placement in breeding.
- Q3608 battle-area/trash exclusions and Q3609 exclusion of a matching card
  under a legal EX5-041 stack.
- Q3610 suppression of a candidate's On Play effect and Q3612 suppression of
  an opposing play watcher for the breeding placement.
- Q3611 public Lui movement followed by a rejected same-turn attack.
- Q3613 public effect-play restriction: the mandatory draw remains while the
  Deva stays in hand.
- The watcher fixture accounts for the observed post-play memory endpoint of 2
  from the exact printed EX5-038 play cost and opposing BT10-076 watcher flow;
  it does not weaken the printed free-breeding-play assertion.
- Public battle deletion unsuspends Vikaralamon once, then a second deletion
  in the same turn leaves it suspended, proving the OPT behavior.
- Public inherited Piercing through an explicitly turn-seat-0 legal EX5-041
  Four Sovereigns host with EX5-038 underneath, plus a non-Four-Sovereigns
  negative control.

EX5-038 has no evolution cost; the public route is normal play and the legal
  stacked peer is used only where the inherited clause requires a host/source
  stack.

#### Verification status

Per the card-lane instruction, Vitest and typecheck were not run while another
lane owned the test token. No broad suite was run. Scoped static checks are
pending this preparation. No engine gap is claimed and no shared, catalog,
ledger, RUN, notes, or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full printed contract and Q3608–Q3613 are mapped. |
| IR trace | 2/2 | Draw, optional breeding play, name scope, battle deletion OPT, trait gate, and Piercing are encoded. |
| Behavioral proof | 2/2 | Public positive, exclusions, suppression, movement, restriction, deletion, and Piercing routes are prepared. |
| Peer / stack proof | 2/2 | Legal Deva source/name stack and Four Sovereigns host are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-039 — Garudamon

#### Printed contract and Q3614

EX5-039 is the green level-5, 7000 DP Ultimate Vaccine Birdkin Garudamon. Its
catalog contract includes green level-4 evolution for 3 and Fortitude.

Its clauses are:

- On Play and When Digivolving, suspend one opponent's Digimon with DP less
  than or equal to this Digimon's current DP.
- Inherited All Turns: while this Digimon is suspended, it gains +1000 DP.

The local KB returns Q3614: the DP comparison uses this Digimon's current DP
after any other effect has increased or reduced it. The implementation uses a
live `relativeToSource` DP predicate for both public timing routes.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-039.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-039", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Fortitude | Static keyword `Fortitude` | catalog and IR identity proof |
| On Play suspension | Opponent Digimon target, DP `lte relativeToSource`, count 1 | public play suspends the eligible 7000-DP peer and leaves the 8000-DP peer active |
| When Digivolving suspension | Same live source-relative predicate | a public host carrying EX5-012's +2000 inherited aura evolves, then the preferred 8500 DP target is selected while the 9500 DP peer is rejected (Q3614) |
| Target boundaries | `controller: opponent`, `kind: Digimon` | own low-DP Digimon is unaffected; oversized opponent remains unsuspended |
| Inherited DP | All Turns self Aura, +1000 while `selfIsSuspended` | public attack suspension gives 5000→6000 DP; production unsuspend returns 5000 |
| OPT | no frequency is printed or compiled | static proof confirms no accidental once-per-turn restriction |

#### Behavioral proof prepared

`EX5-039.test.ts` covers:

- Catalog identity, colors, stats, forms, attributes, trait, evolution cost,
  printed clauses, full coverage, exact target filters, and no OPT metadata.
- Public On Play suspension, exact eligible/oversized peer behavior, and
  opposing-controller restriction.
- Public legal When Digivolving after a production inherited DP aura, proving
  Q3614's current-DP timing and exact 8500/9500 boundary without an internal
  test-only DP mutation seam.
- Negative own-target and above-source-DP paths.
- Inherited DP through a public attack suspension and production unsuspend.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-039.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-039.ts apps/api/src/cards/EX5/EX5-039.test.ts docs/audits/EX5-reaudit/EX5-039.md
git diff --check -- apps/api/src/cards/EX5/EX5-039.ts apps/api/src/cards/EX5/EX5-039.test.ts docs/audits/EX5-reaudit/EX5-039.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3614 current-DP ruling are documented. |
| IR trace | 2/2 | Fortitude, both suspension triggers, live relative DP filter, inherited aura, and no-OPT shape are mapped. |
| Behavioral proof | 2/2 | Public play/evolution, Q3614 modified-source route via a public inherited aura, negative target boundaries, and inherited suspension endpoints are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Eligible/oversized/opponent-vs-own peers and suspended/unsuspended inherited states are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-040 — Kumbhiramon

#### Printed contract and Q3615–Q3620

EX5-040 is the green level-5, 7000 DP Ultimate Vaccine Holy Beast/Deva
Kumbhiramon. It has no normal digivolution cost in the catalog.

Its clauses are:

- On Play, draw 1. Then, optionally play one Deva-trait Digimon from hand
  without paying its cost into an empty breeding area, provided its name is
  different from every card in the controller's battle area and trash.
- All Turns Once Per Turn: when an opponent's Digimon becomes suspended, draw
  1.
- Inherited Your Turn Once Per Turn: while the host has Four Sovereigns or God
  Beast, it gains Piercing.

The local KB returns:

- Q3615: same-name comparison includes Digimon/Tamers in battle area, Option
  cards placed by effects, and cards in trash.
- Q3616: digivolution cards under a Digimon and cards under a Tamer are not
  included in that comparison.
- Q3617: a Digimon played into breeding by this effect does not activate its
  On Play effects.
- Q3618: if that Digimon moves to the battle area during the same turn, it
  still cannot attack.
- Q3619: play watchers do not reference a Digimon played into breeding by this
  effect.
- Q3620: an active “can't be played by effects” restriction prevents the play,
  while the mandatory draw still resolves.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-040.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-040", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Draw and optional Deva play | On Play `Draw 1` followed by optional `PlayWithoutCost` to `breeding` | public On Play moves the selected Deva to breeding and leaves the draw in hand |
| Same-name comparison | `notSameNameAs: ["battleArea", "trash"]` | same-name top cards in battle/trash reject; source cards under Digimon and cards under Tamer do not reject |
| Breeding lifecycle | `breeding: true`, effect-play route | Q3617/Q3619 suppress candidate On Play/watchers; Q3618 public movement still cannot attack that turn |
| Effect-play restriction | production play path honors active restriction | Pomumon blocks the breeding play while Kumbhiramon's mandatory draw remains |
| Suspension draw | All Turns `OncePerTurn` `whenSuspended` watcher scoped to opponent Digimon | public production suspension draws once, while a second same-turn opposing suspension does not draw again |
| Inherited Piercing | Your Turn `OncePerTurn` Aura while live Four Sovereigns/God Beast trait | qualifying hosts have Piercing, nonmatching top cards do not, and the aura lapses after top-card replacement |

#### Behavioral proof prepared

`EX5-040.test.ts` covers:

- Catalog identity, colors, stats, forms, attributes, traits, no normal evo
  cost, exact IR actions, breeding destination, same-name zones, both once-
  per-turn clauses, and inherited trait condition.
- Public On Play draw and unique Deva breeding placement.
- Q3615/Q3616 battle-area/trash comparisons and ignored digivolution/Tamer
  source cards.
- Q3617/Q3619 suppression of the breeding candidate's On Play and play watcher
  effects, plus Q3618 public breeding-to-battle movement and attack lock.
- Q3620 active effect-play restriction with draw preserved.
- Opponent-suspension watcher draw with same-turn Once Per Turn boundary.
- Inherited Piercing on Four Sovereigns/God Beast hosts and live lapse after a
  nonmatching top card replaces the host's top card.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-040.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-040.ts apps/api/src/cards/EX5/EX5-040.test.ts docs/audits/EX5-reaudit/EX5-040.md
git diff --check -- apps/api/src/cards/EX5/EX5-040.ts apps/api/src/cards/EX5/EX5-040.test.ts docs/audits/EX5-reaudit/EX5-040.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3615–Q3620 breeding/name-zone rulings are documented. |
| IR trace | 2/2 | Draw/breeding play, name zones, effect-play restriction path, suspension watcher, and inherited Once Per Turn Aura are mapped. |
| Behavioral proof | 2/2 | Public positive/negative breeding, restriction, movement/attack, suspension draw, and Piercing endpoints are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Same-name/source-zone peers, breeding lifecycle, suspension OPT boundary, and qualifying/nonqualifying inherited stacks are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-041 — Ebonwumon

#### Printed contract and rules

EX5-041 is a green/purple level-6, 7-cost, 12000 DP Mega with the Vaccine,
Holy Beast, and Four Sovereigns traits. Its printed contract is:

- `[Hand] [Counter] <Blast Digivolve>`.
- `[On Play] [When Digivolving]` for each of your Deva/Four Sovereigns
  Digimon, suspend one opponent Digimon. Then, during the opponent's next
  unsuspend phase, all of their Digimon can't unsuspend.
- `[On Deletion]` delete one opponent's suspended Digimon.

The local KB has no card-specific Q&A for EX5-041. The audit therefore maps
the catalog text and the shared Counter/Blast Digivolve and next-unsuspend
phase rules.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-041.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-041", compiled)`. The Counter marker
exposes Blast Digivolve. Both On Play and When Digivolving scale optional
suspension by the controller's Deva/Four Sovereigns count, then apply an
opponent-wide unsuspend restriction through the opponent's next unsuspend
phase. On Deletion deletes one suspended opposing Digimon. Coverage is full
and residual is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-041.test.ts` uses public intents and covers:

- Catalog identity, exact colors/level/cost/evolution routes/traits, Counter
  keyword, scaling filter, restriction duration, and On Deletion target.
- Public play with one Deva plus Ebonwumon itself (which has the
  `[Four Sovereigns]` trait), proving the exact two opposing suspensions and
  the all-opponent next-unsuspend restriction.
- Public legal green level-5 → level-6 digivolution with two opposing targets,
  proving scaling to two suspensions and exact memory cost.
- Public Blast Digivolve from hand during a real Counter window with no memory
  payment.
- Public phase progression proving the opponent's next unsuspend phase keeps
  targets suspended, clears the restriction, and the following phase allows
  unsuspension.
- Public battle deletion proving On Deletion removes one suspended opponent
  Digimon while leaving another opponent Digimon intact.
- Public self-trait boundary with no other Deva/Four Sovereigns, proving that
  Ebonwumon's own `[Four Sovereigns]` trait supplies one suspension while the
  restriction still covers all opposing Digimon.

EX5-041 has no printed once-per-turn clause; the Counter window and scaling
routes are therefore tested without inventing an OPT constraint.

#### Verification status

Per the card-lane instruction, Vitest and typecheck were not run while another
lane owned the test token. No broad suite was run. Scoped `oxfmt`, `oxlint`,
format verification, and `git diff --check` all passed for the permitted card
files. No engine gap is claimed and no shared, catalog,
ledger, RUN, notes, or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full catalog contract and shared Counter/phase rules are mapped. |
| IR trace | 2/2 | Blast Digivolve, trait-count scaling, suspension, duration, and On Deletion are encoded. |
| Behavioral proof | 2/2 | Public play, evolution, Counter, phase, deletion, and no-trait negative routes are prepared. |
| Peer / stack proof | 2/2 | Legal green Deva evolution source and multi-target scaling are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-042 — Merukimon

#### Printed contract and rules knowledge

EX5-042 is the green level-6, 12000 DP Mega Virus Shaman/Olympos XII Merukimon.
Its catalog contract includes green level-5 evolution for 4 and Fortitude.

Its clauses are:

- On Play and When Digivolving, reveal the top card of the deck. If it is a
  level-5-or-lower Digimon with Fortitude, play it without paying the cost;
  otherwise add the revealed card to hand.
- On your turn, all of the controller's Fortitude Digimon with no
  digivolution cards gain Rush permanently.

The local rules knowledge base has no dedicated EX5-042 ruling entry. The
implementation follows the catalog's explicit level, kind, Fortitude, zone,
and no-source boundaries.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-042.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-042", compiled)`. Since `RevealAdd`'s
`rest` destination is deck/trash-only, the implementation uses a second
catch-all `to: "hand"` add slot after the Fortitude play slot and keeps
`deckBottom` only as an unreachable safety fallback.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Fortitude | Static keyword `Fortitude` | catalog/IR identity and live keyword proof |
| On Play reveal/play | `RevealAdd`, one card, Digimon + level <= 5 + Fortitude, to play, catch-all remainder to hand | public play moves EX5-039 from deck to battle area for free |
| When Digivolving reveal/play | same exact `RevealAdd` action | public evolution resolves the same endpoint and preserves the mandatory evolution draw |
| Negative reveal boundaries | filter requires both Digimon kind and Fortitude and caps level at 5 | non-Fortitude BT10-079 and level-6 Fortitude EX5-042 return to hand |
| Rush aura | Your Turn `GainKeyword`, all own Digimon with Fortitude and no digivolution cards, permanent | source and unstacked Fortitude hosts gain Rush; stacked/non-Fortitude peers do not, and a public attack is legal |
| OPT | no frequency is printed or compiled | static proof confirms the reveal and Rush clauses are not accidentally once-per-turn |

#### Behavioral proof prepared

`EX5-042.test.ts` covers:

- Catalog identity, colors, stats, forms, attributes, traits, evolution cost,
  printed clauses, full IR coverage, exact reveal filters, and no OPT metadata.
- Public On Play and When Digivolving routes, with free Fortitude play,
  evolution draw endpoint, and zone movement.
- Negative reveal paths for a non-Fortitude Digimon and a level-6 Fortitude
  card, both reaching the catch-all hand slot instead of being played.
- Rush recipient boundaries across Merukimon, an unstacked Fortitude host, a
  Fortitude host with digivolution cards, and a non-Fortitude Digimon.
- Public attack legality for a Fortitude Digimon granted Rush.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-042.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-042.ts apps/api/src/cards/EX5/EX5-042.test.ts docs/audits/EX5-reaudit/EX5-042.md
git diff --check -- apps/api/src/cards/EX5/EX5-042.ts apps/api/src/cards/EX5/EX5-042.test.ts docs/audits/EX5-reaudit/EX5-042.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract is documented; no dedicated EX5-042 KB ruling exists. |
| IR trace | 2/2 | Fortitude, both reveal/play triggers, level/kind filter, hand remainder, Rush recipient filter, and no-OPT shape are mapped. |
| Behavioral proof | 2/2 | Public play/evolution, reveal negatives, Rush boundaries, and public attack endpoint are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Legal Fortitude, non-Fortitude, over-level, no-source, sourced, and non-Fortitude Rush peers are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-043 — Leopardmon (X Antibody)

#### Printed contract and Q3621–Q3622

EX5-043 is the green level-6, 12000 DP Mega Data Holy Warrior/Royal Knight/X
Antibody Leopardmon (X Antibody). Its catalog contract includes green level-5
evolution for 4.

Its clauses are:

- When Digivolving and Main, once per turn, optionally play one green Digimon
  from hand with its play cost reduced by 4. If a digivolution card has
  `[Leopardmon]` in its name or `[X Antibody]`, reduce it by a further 3.
- Your Turn Once Per Turn: when one of the controller's Digimon is played,
  optionally return one opponent Digimon with a base ceiling of 5000 DP to
  hand. For each other own Digimon, add 3000 to that ceiling.

The local KB returns:

- Q3621: the reductions combine to a total reduction of 7 when the stack
  condition is met.
- Q3622: multiple matching stack cards do not add multiple extra reductions;
  the further reduction is capped at 3.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-043.ts` remains compiled IR-only and registers
exclusively with `registerIrCard("EX5-043", compiled)`. It clones the catalog
compiled record, removes the stale replacement residual, and adds the supported
dynamic reduction and bounce ceiling primitives.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Main/When Digivolving play | shared `OncePerTurn` effects with `sharedUseKey: "ir-shared-0"` | public Main and public evolution routes play a green Digimon with the appropriate cost reduction; same-turn reuse is unavailable |
| Base reduction | `PlayWithoutCost.reduceCostBy: 4`, `payCost: true` | public Main route pays exactly 3 for EX5-049 (7→3) |
| Conditional reduction | `reduceCostByIf.amount: 3`, stack trait `Leopardmon` name or exact `X Antibody` name | Q3621 public route pays 0 for cost-7 EX5-049; Q3622 uses two matching stack cards and still receives only 3 extra reduction |
| Played-Digimon bounce | Your Turn Once Per Turn `whenPlayed` watcher, opponent Digimon <=5000 base ceiling, +3000 per other own Digimon | public play returns 9000 DP with two other own Digimon and leaves 12000 DP above the live ceiling |

#### Behavioral proof prepared

`EX5-043.test.ts` covers:

- Catalog identity, colors, stats, forms, attributes, traits, evolution cost,
  the exact catalog effect text (including its non-breaking space), exact
  shared OPT metadata, reduction conditions, and bounce scaling.
- Public Main play with the base -4 reduction and exact memory endpoint.
- Q3621/Q3622 public stack routes with one and multiple matching cards,
  proving the extra reduction is capped at 3.
- Public legal level-5-to-level-6 When Digivolving play and shared
  Main/When Digivolving Once Per Turn boundary with a second candidate left in
  hand.
- Negative non-green candidate handling.
- Public play watcher return with dynamic +3000-per-other-own-Digimon scaling
  and a target above the resulting ceiling left in battle area.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-043.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks prepared for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-043.ts apps/api/src/cards/EX5/EX5-043.test.ts docs/audits/EX5-reaudit/EX5-043.md
git diff --check -- apps/api/src/cards/EX5/EX5-043.ts apps/api/src/cards/EX5/EX5-043.test.ts docs/audits/EX5-reaudit/EX5-043.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. No engine gap is claimed; focused execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3621–Q3622 reduction rulings are documented. |
| IR trace | 2/2 | Shared Main/evolution OPT, base/conditional reductions, dynamic bounce ceiling, and the exact catalog effect shape are mapped. |
| Behavioral proof | 2/2 | Public Main/evolution, stack reduction, negative candidate, same-turn shared boundary, and scaled bounce endpoints are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Green/non-green peers, no-match/one/multiple stack matches, memory costs, and target ceiling boundaries are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-044 — Elecmon

#### Printed contract and rules

EX5-044 is a black/green level-3, 3-cost, 1000 DP Rookie with the Data and
Mammal traits. The catalog contract is:

- `[Digivolve][Frimon]: Cost 0`.
- `[On Play]` reveal the top 5 cards of the deck, add 1 card with `[Leomon]`
  in its name to the hand, and return the rest to the bottom of the deck.
- Inherited `[On Deletion]` `<De-Digivolve 1>` on 1 opponent Digimon.

The card KB query returned no EX5-044-specific entries, and the EX5 KB index
lists no Q&A ids for this card. Shared reveal/add, evolution, and De-Digivolve
rules are therefore covered from the catalog and existing peer behavior.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-044.ts` is compiled IR-only and registers only via
`registerIrCard("EX5-044", compiled)`. The On Play `RevealAdd` reveals five,
selects one own card matching the Leomon name filter, sends it to hand, and
bottoms the remainder. The inherited On Deletion action performs one opposing
Digimon De-Digivolve 1. The alternate evolution requirement names Frimon and
costs zero.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-044.test.ts` covers:

- Catalog identity, printed text, exact evolution costs, traits, alternate
  requirement, full IR coverage, and both effect shapes.
- Public On Play with a Leomon-name card among the top five, asserting the
  selected instance enters hand and the other four preserve deck-bottom order.
- Public negative On Play with no Leomon-name card, asserting no card enters
  hand and all five revealed cards return in order.
- Public Frimon alternate evolution for cost 0, normal green level-2 evolution
  for cost 1, and rejection of a wrong-color alternate source, with stack,
  memory, draw, and pending-decision assertions.
- Public opponent battle deletion of a host carrying EX5-044 as an inherited
  source, asserting exactly one selected opposing stack is De-Digivolved while
  a peer stack remains unchanged.

No optionality or once-per-turn clause is printed. No security or Digi-Egg
cards are used in deck/security fixtures.

#### Verification status

Vitest and typecheck were intentionally not run because the coordinator owns
the serialized test lane. No broad suite was run. Scoped `oxfmt`, `oxlint`,
format verification, and `git diff --check` all passed for the permitted card
files.
No engine gap is claimed, and no shared, catalog, ledger, RUN, notes, or other
card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog fields, full printed text, and no-card-Q&A status mapped. |
| IR trace | 2/2 | Reveal/add/bottom, Frimon alternate evolution, and inherited De-Digivolve are encoded. |
| Behavioral proof | 2/2 | Positive/negative public reveal, exact endpoints, legal/illegal evolution, and deletion paths are prepared. |
| Peer / stack proof | 2/2 | Normal and alternate evolution stacks plus a two-stack inherited deletion comparison are prepared. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-045 — Chuumon

#### Printed contract and rules

EX5-045 is a black/yellow level-3, 3-cost, 1000 DP Rookie with the Virus and
Beast traits. The catalog contract is:

- `[On Play]` if it is the opponent's turn, reveal the top 3 cards of the
  deck. You may play 1 Digimon card with `[Sukamon]` in its name among them
  without paying its cost, then trash the rest.
- Inherited `[On Deletion]`: if this Digimon had `[Sukamon]` or `[Etemon]` in
  its name, you may play 1 `[Chuumon]` from trash suspended without paying its
  cost.

The card KB query returned no EX5-045-specific entries, and the EX5 KB index
lists no Q&A ids for this card. Shared reveal/play, opponent-turn, optional,
trash, and inherited-play behavior is covered from the catalog and peer cards.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-045.ts` is compiled IR-only and registers only via
`registerIrCard("EX5-045", compiled)`. The On Play effect is gated by
`isOpponentsTurn`, reveals three, optionally plays one own Digimon matching the
Sukamon name filter without cost, and trashes the remainder. The inherited
On Deletion effect is optional, requires the host name to contain Sukamon or
Etemon, and plays one exact-name Chuumon from the owner's trash suspended and
without cost.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-045.test.ts` covers:

- Catalog identity, exact evolution routes/costs, printed text, full IR
  coverage, opponent-turn condition, optionality, rest-to-trash behavior, and
  inherited target/condition.
- Public opponent-turn positive path: BT19-077's real security effect plays
  EX5-045 from hand during an opponent attack; EX5-045 then accepts a Sukamon
  play from the top three and trashes the other two plus the security card.
- Public optional refusal: the security play is accepted, the On Play optional
  Sukamon `RevealAdd` slot is declined with an empty `selectCards` response, and all revealed cards are trashed with
  no Digimon played.
- Public own-turn negative path proving the condition suppresses both reveal
  and play and leaves the deck unchanged.
- Public yellow level-2 evolution for cost 1 and wrong-color green level-2
  rejection, with stack, memory, draw, hand, and pending-decision assertions.
- Public opponent battle deletion of an Etemon-name host carrying EX5-045 as
  an inherited source, reviving one preferred exact-name Chuumon from trash
  suspended while the deleted host and candidate zones are verified.

No once-per-turn clause is printed. No security or Digi-Egg cards are placed
in decks or security fixtures; BT19-077 is used only as the public security
route that legitimately plays Chuumon during the opponent's turn.

#### Verification status

Vitest and typecheck were intentionally not run because the coordinator owns
the serialized test lane. No broad suite was run. Scoped `oxfmt`, `oxlint`,
format verification, and `git diff --check` all passed for the permitted card
files. No engine gap is claimed, and no shared, catalog, ledger, RUN, notes, or
other card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full catalog contract and no-card-Q&A status mapped. |
| IR trace | 2/2 | Opponent-turn reveal/play/trash and conditional inherited revival are encoded. |
| Behavioral proof | 2/2 | Public positive, explicit decline, own-turn negative, evolution, and battle-deletion paths are prepared. |
| Peer / stack proof | 2/2 | Real BT19-077 security route and inherited Etemon-name stack prove cross-card/public stack behavior. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-046 — Targetmon

#### Printed contract and Q3623-Q3624

The catalog defines EX5-046 Targetmon as a black/yellow level-4, 3000 DP
Champion Puppet with play cost 3 and black/yellow level-3 evolution routes,
plus the printed Blocker keyword, the Etemon/Sukamon rule name, and these
effects:

- On Deletion, by trashing one Etemon/Sukamon-name card from hand, return this
  card to hand.
- Inherited All Turns: when this Digimon would be deleted, by deleting one
  other Sukamon-name Digimon, prevent that deletion.

The local KB returns both required rulings. Q3623 confirms that an On Deletion
effect resolves after the card first enters the trash. Q3624 confirms the
immediate-effect lock: while the first replacement is still resolving, the
same source cannot activate its `when ... would` replacement again.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-046.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-046", compiled)`. The module maps Blocker, the
Rule name grant, the mandatory hand-trash cost plus self return, and the
inherited `wouldBeDeleted` replacement with an excluding-other Sukamon target.

`apps/api/src/cards/EX5/EX5-046.test.ts` provides public observable proof:

| Clause | Evidence |
| --- | --- |
| Catalog and IR | Exact metadata, Blocker, rule names, On Deletion cost/action, replacement event, prevention, and target boundaries are asserted. |
| Blocker and Q3623 | A public player attack opens the blocker window; declaring Blocker causes battle deletion, the source is observed to have entered trash, then returns to hand after trashing the Sukamon-name cost card. Security remains unchanged. |
| Q3624 | Two legal stacks each carry EX5-046 under Sukamon-name top cards. A public battle deletion leaves the first host alive while deleting the other host; its top instance is in trash, proving the recursive immediate activation did not prevent the first replacement's result. |
| Evolution and negative route | Public yellow level-3 → EX5-046 evolution pays exactly 3 memory and preserves the source stack; a red level-3 source is rejected without changing memory, stack, or hand. |
| Fixtures and resolution | Main decks/security use inert non-Digi-Egg cards, all asynchronous paths settle, and final states have no pending decisions. |

#### Verification

- `node tools/kb/query.mjs card EX5-046` — Q3623 and Q3624 returned and
  documented above.
- Focused serial Vitest: `pnpm exec vitest run
  src/cards/EX5/EX5-046.test.ts --maxWorkers=1 --no-file-parallelism` — **5
  tests passed / 5 tests**.
- `pnpm exec oxfmt src/cards/EX5/EX5-046.ts
  src/cards/EX5/EX5-046.test.ts` — passed.
- `pnpm exec oxfmt --check src/cards/EX5/EX5-046.ts
  src/cards/EX5/EX5-046.test.ts` — passed.
- `pnpm exec oxlint src/cards/EX5/EX5-046.ts
  src/cards/EX5/EX5-046.test.ts` — passed with no diagnostics.
- `git diff --check -- apps/api/src/cards/EX5/EX5-046.ts
  apps/api/src/cards/EX5/EX5-046.test.ts
  docs/audits/EX5-reaudit/EX5-046.md` — passed.
- Workspace typecheck and broad suites were not run; they are coordinator-owned.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Exact catalog contract and both indexed rulings are covered. |
| IR trace | 2/2 | Blocker, rule name, deletion cost/return, and inherited replacement map directly to complete IR. |
| Behavioral proof | 2/2 | Public blocker, deletion return, immediate replacement lock, exact endpoints, and negative evolution route pass focused execution. |
| Peer / stack proof | 2/2 | Legal yellow evolution and paired Sukamon stacks exercise source identity and replacement boundaries. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are not awarded to a card lane. |

**Worker score: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-047 — Leomon

#### Printed contract and rules knowledge

EX5-047 is the dual-color black/green level-4, 5000 DP Champion Vaccine
Beastkin Leomon. The catalog gives it standard black or green level-3
evolution for 3 and an alternate level-2 evolution from Liollmon or Elecmon
for 2.

Its clauses are:

- When Attacking, it may digivolve into a Digimon card with `[Leomon]` in its
  name from hand with the digivolution cost reduced by 1.
- Inherited On Deletion: De-Digivolve 1 on one opponent Digimon.

The local knowledge base has no dedicated EX5-047 ruling entry. The audit
therefore treats the catalog's alternate evolution requirement, optional
attack timing, name substring matching, and public De-Digivolve endpoint as
the operative contract.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-047.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-047", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Attack evolution | `WhenAttacking` optional self `Digivolve` from hand | public attack evolves into EX5-049 GrapLeomon and removes it from hand |
| Leomon-name filter | `kind: Digimon`, `nameOrTrait` name substring `Leomon` | EX5-049 is accepted while non-Leomon EX5-050 remains in hand |
| Attack evolution endpoint | `reduceCost: 1` with the generated action's no-cost effect-play semantics | EX5-049's alternate Leomon evolution is placed through the public attack route while memory remains exactly 10 |
| Inherited De-Digivolve | On Deletion, opponent Digimon count 1, amount 1 | public battle deletion of an inherited host trashes exactly one card from a selected opposing stack |
| Evolution requirements | alternate names Liollmon/Elecmon cost 2, plus catalog black/green level-3 routes | public EX5-044 Elecmon route succeeds; yellow BT1-045 route is rejected |

#### Behavioral proof prepared

`EX5-047.test.ts` covers:

- Exact catalog identity, colors, stats, forms, attributes, traits, standard
  evolution costs, alternate requirements, full IR coverage, and both printed
  effect strings including catalog spacing.
- Public optional When Attacking evolution into a legal Leomon-name card,
  no-cost memory endpoint, hand removal, and no pending decision.
- A negative non-Leomon hand card and an explicit decline/no-match boundary.
- Public alternate Elecmon evolution for exactly two memory and an illegal
  wrong-color source that leaves the source and hand unchanged.
- Public inherited De-Digivolve after battle deletion, with preferred target
  selection and exact one-card trash endpoint.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator may schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-047.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-047.ts apps/api/src/cards/EX5/EX5-047.test.ts docs/audits/EX5-reaudit/EX5-047.md
git diff --check -- apps/api/src/cards/EX5/EX5-047.ts apps/api/src/cards/EX5/EX5-047.test.ts docs/audits/EX5-reaudit/EX5-047.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. Execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog identity, alternate evolution requirements, printed clauses, and absence of a dedicated KB ruling are documented. |
| IR trace | 2/2 | Optional attack evolution, Leomon name filter, reduction, inherited De-Digivolve, and registration are mapped. |
| Behavioral proof | 2/2 | Public attack/evolution/deletion routes, exact costs, negative name/color boundaries, and stack trash are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Leomon/non-Leomon peers, legal/illegal alternate source, optional decline, and inherited stack target are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-048 — Etemon

#### Card and rules scope

The committed catalog identifies EX5-048 as a level-5, 7000 DP black/yellow Puppet
Digimon with play cost 7 and normal black/yellow level-4 evolution cost 4. Its
alternate route is from a level-4 card with **Sukamon** in its name for cost 3.
The main effect gives one opposing Digimon -3000 DP and the temporary
`[Start of Your Main Phase] This Digimon attacks.` effect on both play and
digivolution. Its inherited effect is `[Opponent's Turn] [Once Per Turn] When an
opponent's Digimon attacks, you may reveal the top 3 cards of your deck. You may
play 1 black or yellow Digimon with play cost 3 or less among them without paying
the cost. Trash the rest.`

The card-specific knowledge base entry is Q3625. It says that if two Digimon gain
the start-of-main-phase attack effect, their triggers are simultaneous, but only
the first can actually attack because the other trigger resolves while an attack
is already in progress.

#### Implementation evidence

`apps/api/src/cards/EX5/EX5-048.ts` is IR-only and registers exactly once through
`registerIrCard("EX5-048", compiled)`. Both main triggers encode a bound opposing
target, -3000 DP through `untilOpponentTurnEnd`, then `GainEffect` from that same
selection with a self-targeted `StartOfYourMainPhase` attack. The inherited
`OpponentsTurn` watcher is marked `isInherited` and `frequency: "OncePerTurn"`;
its `whenOpponentAttacks` subtrigger performs optional top-three reveal, optional
play of one own black/yellow Digimon at play cost at most 3, and trashes the rest.

#### Behavioural evidence

`EX5-048.test.ts` covers public paths only:

- Catalog identity, all printed text, alternate evolution requirement, and the
  full/residual IR record are asserted structurally.
- A real `startTurnLoop()` proves the play effect's -3000 DP and forced attack on
  the opponent's main phase, then proves the temporary DP modifier expires at
  opponent-turn end.
- A public legal alternate evolution from BT11-040 Sukamon proves cost 3,
  source-stack identity, and the When Digivolving effect. The parameterized
  evolution test also proves the normal black/yellow route and rejects an
  alternate route from a non-Sukamon source.
- Q3625 is exercised with two physical EX5-048 copies targeting two opposing
  Digimon. The real next main phase records exactly one forced attack and consumes
  only one security card, proving simultaneous-trigger attack contention.
- A real opponent attack proves the inherited reveal/play/trash route with a
  legal yellow level-3 card and two non-qualifying revealed cards. A second public
  attack fixture declines the optional reveal and proves the deck and board remain
  unchanged.

#### Verification

Vitest was **not run** in this worker lane because the coordinator reserved the
focused test token; no EX5 test process is running in this worktree. No workspace
typecheck or broad suite was run. The following scoped checks all passed (exit 0):

```text
pnpm exec oxfmt <six EX5 test files>
pnpm exec oxlint <EX5-025/031/041/044/045/048 modules and tests>
pnpm exec oxfmt --check <six EX5 test files>
git diff --check -- <permitted EX5 card/report paths>
```

There is no retained engine gap or catalog discrepancy for this card.

#### Score

| Rubric column | Score |
| --- | ---: |
| Catalog and rules | 2/2 |
| IR fidelity | 2/2 |
| Public behavioural proof | 2/2 |
| Peer/stack/evolution proof | 2/2 |
| Delivery gates (worker) | 0/2 |
| **Total** | **8/10** |


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-049 — GrapLeomon

#### Printed contract and KB status

The catalog defines EX5-049 GrapLeomon as a black/green level-5, 7000 DP
Ultimate Beastkin with play cost 7 and normal level-4 black/green evolution
cost 4 routes. Its alternate route is `[Digivolve] Lv.4 w/[Leomon] in name:
Cost 3`. It has Fortitude; On Play and When Digivolving each return one of the
opponent's Digimon with 4000 DP or less to the bottom of its deck. Its
inherited Your Turn effect grants Piercing while the current Digimon has
Leomon in its name.

`node tools/kb/query.mjs card EX5-049` returns no knowledge-base card Q&A
entries. That absence is recorded accurately; no ruling is invented.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-049.ts` is compiled IR-only and registers only
through `registerIrCard("EX5-049", compiled)`. The IR has complete coverage and
maps Fortitude, separate On Play and When Digivolving return actions with the
printed `<= 4000` boundary, the alternate Leomon evolution requirement, and
the inherited Leomon-name Piercing aura.

`apps/api/src/cards/EX5/EX5-049.test.ts` covers:

| Clause | Observable proof |
| --- | --- |
| Catalog and IR | Exact catalog metadata, Fortitude, both return actions, 4000-DP filter, alternate requirement, coverage, and inherited aura are asserted. |
| On Play boundary | Public play pays exactly 7 memory (10→3), returns the 4000-DP boundary Digimon to deck bottom, leaves the 6000-DP peer in play, and leaves no pending decision. |
| When Digivolving | A public alternate Leomon evolution pays exactly 3 memory, returns the 4000-DP opponent Digimon to deck, preserves the source stack, and settles cleanly. |
| Fortitude | A public battle deletion of a stacked GrapLeomon replays its card from trash without its old digivolution stack, proving the printed replacement path. |
| Inherited Piercing | A legal public EX5-047→EX5-049→EX5-055 Leomon stack pays 3 then 5 memory (the normal black Lv.5 route) and exposes Piercing from the EX5-049 card beneath the Leomon-name host; a non-Leomon top host is a negative control. |
| Negative/evolution legality | A red level-3 non-Leomon source rejects the alternate route without changing memory or its stack. Main decks use inert non-Digi-Egg cards only. |

#### Verification

- KB query: `node tools/kb/query.mjs card EX5-049` — no card Q&A entries
  returned.
- Vitest was **not run**, per coordinator instruction. No broad suite or
  workspace typecheck was run.
- `pnpm exec oxfmt src/cards/EX5/EX5-049.ts
  src/cards/EX5/EX5-049.test.ts` — passed.
- `pnpm exec oxfmt --check src/cards/EX5/EX5-049.ts
  src/cards/EX5/EX5-049.test.ts` — passed.
- `pnpm exec oxlint src/cards/EX5/EX5-049.ts
  src/cards/EX5/EX5-049.test.ts` — passed with no diagnostics.
- `git diff --check -- apps/api/src/cards/EX5/EX5-049.ts
  apps/api/src/cards/EX5/EX5-049.test.ts
  docs/audits/EX5-reaudit/EX5-049.md` — passed.

No engine/shared/catalog/ledger/RUN/notes or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Exact catalog contract is documented; KB absence is explicitly recorded. |
| IR trace | 2/2 | All printed triggers, target boundary, Fortitude, alternate route, and inherited condition map directly to full IR. |
| Behavioral proof | 2/2 | Public On Play, When Digivolving, Fortitude, boundary, and negative evolution evidence is prepared. |
| Peer / stack proof | 2/2 | Legal Leomon evolution stack, inherited source, and nonmatching top-host comparison are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are not awarded to a card lane. |

**Worker score: 8/10 pending coordinator focused execution.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-050 — Sinduramon

#### Printed contract and Q3626–Q3631

EX5-050 is the black level-5, 7000 DP Ultimate Data Holy Bird/Deva
Sinduramon. It has Decoy for Deva/Four Sovereigns. On Play, it draws one,
then may play one Deva Digimon from hand without paying its cost into an empty
breeding area, excluding names represented in the controller's battle area or
trash.

Its inherited effect grants Blocker during the opponent's turn while the host
has the Four Sovereigns or God Beast trait.

The local KB returns:

- Q3626: the name exclusion covers all Digimon/Tamers in battle area, effect-
  placed Option cards, and cards in trash.
- Q3627: digivolution cards under Digimon and cards under Tamers are not part
  of that name comparison.
- Q3628: a Digimon effect-played into breeding does not activate its On Play
  effects.
- Q3629: moving that breeding Digimon to the battle area in the same turn does
  not allow it to attack, because it was played that turn.
- Q3630: breeding effect-plays do not activate when-your-Digimon-is-played
  watchers; breeding cards are not referenced unless an effect says so.
- Q3631: a player-level “Digimon can't be played by effects” restriction also
  prevents this breeding-area effect-play.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-050.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-050", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Decoy | Static keyword `Decoy (Deva/Four Sovereigns)` | catalog and exact keyword metadata are asserted |
| Draw 1 | On Play `Draw` for the controller | public play leaves the drawn card in hand |
| Deva breeding play | optional `PlayWithoutCost`, own hand, Deva trait, breeding, empty slot | public source play places EX5-051 into breeding without its On Play effect |
| Name exclusion | `notSameNameAs: ["battleArea", "trash"]` | Q3626 peers in battle/trash are rejected; Q3627 stack-under-Digimon and under-Tamer names are ignored |
| Breeding timing | effect play into breeding | Q3628 suppresses candidate On Play and Q3630 suppresses effect-play watcher activation |
| Same-turn movement | public `P-130` promotion route | Q3629 rejects attack after breeding-to-battle movement in the same turn |
| Restriction handling | normal effect-play legality | Q3631 leaves the Deva in hand under BT9-047's effect-play restriction |
| Inherited Blocker | opponent-turn self Aura gated by Four Sovereigns/God Beast trait | matching EX5-053 host gains Blocker; non-matching EX5-049 host does not |

#### Behavioral proof prepared

`EX5-050.test.ts` covers:

- Exact catalog identity, black level-5 stats, empty standard evolution costs,
  Decoy, draw, breeding play, inherited Blocker, and full IR coverage.
- Public draw and free Deva effect-play into breeding with candidate On Play
  suppression (Q3628).
- Q3626/Q3627 name scope across battle area, trash, Digimon stacks, and Tamer
  stacks.
- Q3630's effect-play watcher boundary using EX5-006 and a public draw
  endpoint.
- Q3629's public promotion route and same-turn attack prohibition.
- Q3631's public effect-play restriction negative path.
- Opponent-turn inherited Blocker recipient and trait-negative boundaries.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator may schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-050.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-050.ts apps/api/src/cards/EX5/EX5-050.test.ts docs/audits/EX5-reaudit/EX5-050.md
git diff --check -- apps/api/src/cards/EX5/EX5-050.ts apps/api/src/cards/EX5/EX5-050.test.ts docs/audits/EX5-reaudit/EX5-050.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. Execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and all six Q3626–Q3631 rulings are documented. |
| IR trace | 2/2 | Decoy, draw, unique Deva breeding play, name-zone scope, inherited Blocker, and registration are mapped. |
| Behavioral proof | 2/2 | Public draw/play, breeding suppression, restriction, movement, attack, watcher, and keyword endpoints are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Battle/trash exclusions, Digimon/Tamer stack exceptions, trait-positive/negative hosts, and breeding timing boundaries are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-051 — Caturamon

#### Printed contract and Q3632-Q3637

The catalog defines EX5-051 Caturamon as a black level-5, 7000 DP Ultimate
Data Holy Beast/Deva with play cost 7. Its printed contract is:

- Blocker.
- On Play, draw 1, then optionally play one Deva-trait Digimon from hand into
  an empty breeding area without paying its cost, excluding names represented
  in the controller's battle area or trash.
- Inherited Opponent's Turn: while the host has Four Sovereigns or God Beast,
  it gains Blocker.

The local KB returns Q3632-Q3637. Q3632 defines the name comparison scope as
battle-area Digimon/Tamers, effect-placed Options, and trash. Q3633 excludes
digivolution cards and Tamer-under cards. Q3634 and Q3636 suppress the
breeding candidate's On Play and play watchers. Q3635 preserves same-turn
attack sickness after movement from breeding. Q3637 makes an active
can't-be-played-by-effects restriction prevent the breeding play.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-051.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-051", compiled)`. The IR maps Blocker, mandatory
draw, optional Deva breeding play with battle-area/trash name exclusion, and
the inherited opponent-turn trait-gated Blocker aura. Coverage is full and
residual is empty.

`apps/api/src/cards/EX5/EX5-051.test.ts` provides public observable evidence:

| Clause | Evidence |
| --- | --- |
| Catalog and IR | Exact metadata, printed filters, optionality, breeding destination, Blocker, trait gate, and complete IR are asserted. |
| On Play and Q3632 | Public Caturamon play draws one and effect-plays a Deva; mixed same-name fixtures cover comparison behavior, with inert non-Digi-Egg decks. |
| Q3633 | Matching Deva names under a Digimon and a Tamer do not block the public breeding play. |
| Q3634/Q3636 | The breeding candidate's On Play and the EX5-006 effect-play watcher do not trigger. |
| Q3635 | Public Lui movement places the candidate in battle area, but its same-turn attack intent is rejected. |
| Q3637 | BT9-047's public play-by-effect restriction leaves the mandatory draw resolved and the candidate in hand. |
| Inherited route | A legal Four Sovereigns host exposes inherited Blocker through the public opponent-turn block window; a nonmatching host is a negative control. |

#### Verification

- `node tools/kb/query.mjs card EX5-051` — Q3632-Q3637 returned and mapped
  above.
- Vitest was **not run**, per coordinator instruction. No broad suite or
  workspace typecheck was run.
- `pnpm exec oxfmt src/cards/EX5/EX5-051.ts
  src/cards/EX5/EX5-051.test.ts` — passed.
- `pnpm exec oxfmt --check src/cards/EX5/EX5-051.ts
  src/cards/EX5/EX5-051.test.ts` — passed.
- `pnpm exec oxlint src/cards/EX5/EX5-051.ts
  src/cards/EX5/EX5-051.test.ts` — passed with no diagnostics.
- `git diff --check -- apps/api/src/cards/EX5/EX5-051.ts
  apps/api/src/cards/EX5/EX5-051.test.ts
  docs/audits/EX5-reaudit/EX5-051.md` — passed.
- Fixture/direct-verb scan found no Digi-Egg in decks/security and no
  injected timing or direct verb usage.

No engine, shared, catalog, ledger, RUN, notes, or other card files were
changed.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and all six indexed Q&A boundaries are documented. |
| IR trace | 2/2 | All printed triggers, optional breeding play, name scope, and inherited trait gate map directly to full IR. |
| Behavioral proof | 2/2 | Public draw/play, suppression, movement lock, restriction, and blocker routes are prepared. |
| Peer / stack proof | 2/2 | Under-card comparison peers, qualifying Four Sovereigns host, and nonmatching host are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are not awarded to a card lane. |

**Worker score: 8/10 pending coordinator focused execution.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-052 — Makuramon

#### Printed contract and rulings

EX5-052 is a black level-5, 7-cost, 7000 DP Ultimate with the Holy Beast and
Deva traits. Its clauses are:

- `[On Play]` draw 1, then optionally play one Deva-trait Digimon card from
  hand into an empty breeding area without paying its cost and without the same
  name as cards in the owner's battle area or trash.
- `[Opponent's Turn]` all opposing Tamers with play cost 2 or less can't
  suspend.
- Inherited `[Opponent's Turn]` while this Digimon has the Four Sovereigns or
  God Beast trait, it gains Blocker.

The card-specific knowledge base has Q3638–Q3643. Q3638 includes names among
the owner's Digimon/Tamers in the battle area, Option cards placed by effects,
and trash. Q3639 excludes digivolution cards under Digimon or Tamers from the
comparison. Q3640 says the breeding-area play does not activate the played
Digimon's On Play effects. Q3641 preserves same-turn summoning sickness if the
played card later moves from breeding to the battle area. Q3642 says breeding
cards are not seen by ordinary played-Digimon watchers. Q3643 says a global
effect-play prohibition also prevents this breeding play.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-052.ts` is full-coverage IR and registers exactly
once with `registerIrCard("EX5-052", compiled)`. The On Play action is the
mandatory Draw followed by an optional `PlayWithoutCost` from hand with the
exact Deva trait, `breeding: true`, `payCost: false`, and
`notSameNameAs: ["battleArea", "trash"]`. The opponent-turn restriction
targets all opposing Tamers at play cost 2 or less with permanent suspend
restriction. The inherited Aura grants Blocker only while the host has the
Four Sovereigns or God Beast trait.

#### Behavioural evidence prepared

`apps/api/src/cards/EX5/EX5-052.test.ts` uses public card intents and real phase
progression:

- The catalog and exact IR action records cover identity, costs, traits, all
  three clauses, breeding destination, optionality, and name-scope fields.
- Q3638 runs separate public battle-area and trash same-name fixtures. The
  mandatory draw remains in hand while the same-name Deva is not played. The
  Q3639 fixture publicly plays BT19-098 and its BT19-095 Device Option from
  trash, leaving both effect-created field Options on the battle area before
  Makuramon resolves; this uses a real persistent field-Option route rather
  than a transient Option alias.
- Q3639 places the same-name Deva only under a Digimon and a Tamer, then proves
  the candidate is legally played into breeding; under-cards are not collision
  zones.
- Q3640 and Q3642 use EX5-051 (which has its own On Play draw) and an EX5-006
  inherited when-played watcher. The Makuramon draw is present, while the
  breeding card's On Play and the watcher do not trigger.
- Q3641 publicly plays P-130 to move the breeding Deva into the battle area and
  asserts the same-turn attack intent is rejected.
- Q3643 uses the public BT9-047 effect-play prohibition. The Makuramon draw is
  still performed, but the Deva remains in hand and breeding stays empty.
- The restriction clause is checked before and during a real opponent main
  phase: the cost-2 Joe Kido is restricted while the cost-4 Tai Kamiya is not.
- Inherited Blocker is checked on a Four Sovereigns host and rejected on a
  non-matching host.

#### Verification

Vitest and typecheck were not run in this static worker lane; the coordinator
owns focused serial execution, and no EX5-052 test process is running. No broad
suite was run. These scoped checks all passed (exit 0):

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-052.test.ts
pnpm exec oxlint apps/api/src/cards/EX5/EX5-052.ts apps/api/src/cards/EX5/EX5-052.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-052.test.ts
git diff --check -- EX5-052 card/report paths
```

No engine gap or catalog discrepancy is claimed.

#### Score (worker maximum 8/10)

| Rubric column | Score |
| --- | ---: |
| Catalog and rulings | 2/2 |
| IR fidelity | 2/2 |
| Public behavioural proof | 2/2 |
| Peer/stack proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-053 — Baihumon

#### Printed contract and Q3644-Q3645

The catalog defines EX5-053 Baihumon as a black/yellow level-6, 12000 DP
Mega Data Holy Beast/Four Sovereigns with play cost 7 and black or yellow
level-5 evolution routes costing 4 memory. Its printed contract is:

- Hand Counter: Blast Digivolve.
- Opponent's Turn, Once Per Turn: when the controller's security is checked,
  if the revealed card is a Digimon with the Deva trait, play it without
  battling and without paying its cost.
- On Deletion: delete one opponent's highest play-cost Digimon.

The local KB returns Q3644-Q3645. Q3644 requires the revealed security card
itself to be a Deva Digimon; a Deva attacker does not satisfy the condition.
Q3645 makes the security reaction mandatory: a qualifying revealed card must
be played without battling, so the normal security battle cannot be chosen.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-053.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-053", compiled)`. The generated IR contains the
Blast Digivolve Counter keyword, the once-per-turn security-card Deva filter
and cost-free no-battle play, and the highest-play-cost opponent Digimon
deletion. The module preserves complete coverage and an empty residual list.

`apps/api/src/cards/EX5/EX5-053.test.ts` provides public observable evidence:

| Clause | Evidence |
| --- | --- |
| Catalog and IR | Exact metadata, printed text, complete coverage, Blast Digivolve source, security filter/action, frequency, and deletion superlative are asserted. |
| Q3644/Q3645 | Public player security checks play a revealed EX5-009 Deva without a battle; BT1-009 remains a security battle/trash result, and a Deva attacker does not make a non-Deva revealed card qualify. The mandatory action is also asserted as non-optional. |
| Once Per Turn | Two public attacks during the same opponent turn reveal two Deva cards: only the first is played; the second follows the normal security battle endpoint. |
| On Deletion | A public battle deletes Baihumon and its deletion effect removes exactly the opposing Digimon with the highest play cost while retaining the lower-cost peer. |
| Evolution and boundaries | A public EX5-050 black level-5 to EX5-053 evolution pays exactly 4 memory and preserves the source stack; an illegal BT1-013 level-3 source is rejected without consuming memory or the hand card. |

Fixtures use inert main-deck cards and no Digi-Egg in a deck or security
stack. Public intents, turn-loop progression, asynchronous settling, and
pending-decision endpoints are used throughout; no direct effect verbs or
injected timing are used for behavioral credit.

#### Verification

- `node tools/kb/query.mjs card EX5-053` — Q3644 and Q3645 returned and are
  documented above.
- Focused serial Vitest was **not run**, per the coordinator's active external
  Vitest/RAM gate. Five focused tests are prepared for the coordinator queue;
  no broad suite or workspace typecheck was run.
- `pnpm exec oxfmt src/cards/EX5/EX5-053.ts
  src/cards/EX5/EX5-053.test.ts` — passed.
- `pnpm exec oxfmt --check src/cards/EX5/EX5-053.ts
  src/cards/EX5/EX5-053.test.ts` — passed.
- `pnpm exec oxlint src/cards/EX5/EX5-053.ts
  src/cards/EX5/EX5-053.test.ts` — passed with no diagnostics.
- `git diff --check -- apps/api/src/cards/EX5/EX5-053.ts
  apps/api/src/cards/EX5/EX5-053.test.ts
  docs/audits/EX5-reaudit/EX5-053.md` — passed.
- Fixture/direct-verb scan found no Digi-Egg in decks/security and no
  injected timing, direct verb, or diagnostic usage.

No engine, shared, catalog, ledger, RUN, notes, or other card files were
changed. Focused behavioral execution remains coordinator-pending; no engine
gap is claimed from the unexecuted run.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Exact catalog contract and both indexed rulings are covered. |
| IR trace | 2/2 | Blast Digivolve, mandatory once-per-turn security play, and highest-cost deletion map directly to complete IR. |
| Behavioral proof | 2/2 | Public security, mandatory/no-battle, once-per-turn, deletion, and evolution tests are prepared with exact endpoints; focused execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Deva/non-Deva security peers, same-turn once-per-turn peer, highest/lower-cost deletion peers, and legal/illegal evolution sources are covered. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery are not awarded to a card lane. |

**Worker score: 8/10 pending coordinator focused execution.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-054 — MetalEtemon

#### Printed contract and rulings

EX5-054 is a black/yellow level-6, 12-cost, 12000 DP Mega with the Virus and
Cyborg traits. Its printed clauses are:

- `[On Play] [When Digivolving]` delete one opposing Digimon or Tamer with play
  cost 3 or less; increase that maximum by one for each Etemon/Sukamon-named
  card in the owner's trash.
- Inherited `[Opponent's Turn] [Once Per Turn]` when an opposing Digimon
  attacks, place one Etemon/Sukamon-named card from hand on top of security to
  optionally switch the attack to this Digimon or its controller's player.

Q3646 confirms that paying the security placement cost and declining the target
switch is legal. Q3647 confirms that the redirect cannot select the attacking
opponent's player.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-054.ts` is full-coverage IR and registers exactly
once with `registerIrCard("EX5-054", compiled)`. Both entry timings use the
same opponent Digimon/Tamer play-cost ceiling of 3 plus one per matching card in
the owner's trash. The inherited watcher is opponent-turn, once per turn, and
listens to an opposing Digimon attack. Its mandatory placement cost selects an
Etemon/Sukamon-named hand card onto security, followed by an optional
`RedirectAttack` to this Digimon, with `includePlayer: true` for only the
defending player's own player target.

#### Behavioural evidence prepared

`apps/api/src/cards/EX5/EX5-054.test.ts` covers public routes:

- Catalog identity, all printed text, both normal black/yellow level-5
  evolution costs, full IR/residual status, deletion scaling, and redirect
  cost/target metadata.
- Public On Play deletion at the exact scaled boundary, retaining an opposing
  card above the ceiling; a second public When Digivolving path proves the
  same deletion behavior after a legal stack transition.
- Public evolution fixtures cover black level-5 and yellow level-5 legal
  sources with exact source-stack and memory endpoints, plus an illegal level-4
  source that leaves the hand/stack/memory unchanged.
- Q3646 uses an opponent attack declared on MetalEtemon, accepts the public
  optional activation (the single eligible hand card pays automatically), then
  declines the redirect target with the subsequent decision id. Security
  still gains the Etemon-named card and the original Digimon target remains.
- Q3647 uses an attack declared at the defending player and publicly proves the
  effect redirects to MetalEtemon, never to the attacking opponent's player.

#### Verification

Vitest and typecheck were not run in this static worker lane; the coordinator
owns focused serial execution and no EX5-054 test process is running. No broad
suite was run. These scoped checks passed with exit 0:

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-054.test.ts
pnpm exec oxlint apps/api/src/cards/EX5/EX5-054.ts apps/api/src/cards/EX5/EX5-054.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-054.test.ts
git diff --check -- EX5-054 card/report paths
```

No engine gap or catalog discrepancy is claimed.

#### Score (worker maximum 8/10)

| Rubric column | Score |
| --- | ---: |
| Catalog and rulings | 2/2 |
| IR fidelity | 2/2 |
| Public behavioural proof | 2/2 |
| Peer/stack/evolution proof | 2/2 |
| Delivery gates | 0/2 |
| **Total** | **8/10** |


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-055 — HeavyLeomon

#### Printed contract and Q3648

The catalog defines EX5-055 HeavyLeomon as a black/green level-6, 13000 DP
Mega Machine/Vaccine with play cost 13 and black or green level-5 evolution
routes costing 5 memory. Its printed contract is:

- Alternate Digivolve: level 5 with [Leomon] in its name for 4 memory, and
  Fortitude (when this Digimon with digivolution cards is deleted, play this
  card without paying the cost).
- When Digivolving and On Deletion: De-Digivolve 1 on one opposing Digimon,
  then return one of their Digimon with 6000 DP or less to the bottom of the
  deck.
- End of Attack, Once Per Turn: return one opposing Digimon with 4000 DP or
  less to the bottom of the deck; if none was returned, unsuspend this
  Digimon.

The local KB returns Q3648. The public battle proof also captures the ruling's
important endpoint: Fortitude replays the deleted source once, while the
original deletion window resolves the printed On Deletion exactly once. The
opponent's stacked target is de-digivolved, its top card is trashed, and the
exposed card is bottom-decked; no second On Deletion occurs after the replay.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-055.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-055", compiled)`. The complete IR maps the
alternate Leomon evolution route, Fortitude, both De-Digivolve-plus-6000-DP
bottom-deck triggers, and the once-per-turn End of Attack return/conditional
unsuspend sequence.

`apps/api/src/cards/EX5/EX5-055.test.ts` provides public observable evidence:

| Clause | Evidence |
| --- | --- |
| Catalog and IR | Exact metadata, alternate evolution requirement, Fortitude keyword, trigger actions, DP bounds, destination, binding, condition, and full/empty residual coverage are asserted. |
| When Digivolving | A public 4-memory Leomon-named level-5 evolution de-digivolves a stacked opposing Digimon and bottoms the resulting 3000-DP card, with exact stack, memory, deck, and pending-decision endpoints. |
| On Deletion | A public battle deletes a suspended HeavyLeomon without a stack; its On Deletion effect de-digivolves the selected opposing stack and bottoms the resulting 3000-DP Digimon. |
| Q3648 / Fortitude | A public battle deletes a suspended stacked HeavyLeomon and Fortitude replays the same physical source without its stack. Captured target and stack instance IDs prove the original On Deletion de-digivolves and bottom-decks the target once, while the replay does not create a second deletion window. |
| End of Attack boundary | A public attack bottoms an opposing Digimon at exactly 4000 DP while retaining a 5000-DP peer, and HeavyLeomon remains suspended because a target was returned. |
| End of Attack reset | With no opposing target at 4000 DP or less, the first public attack unsuspends HeavyLeomon; a second same-turn attack does not retrigger the Once Per Turn effect, while the next own turn resets it and the third attack unsuspends again. |
| Evolution negative | A public alternate-evolution intent from the non-Leomon level-5 BT1-021 is rejected without changing memory, hand, or source stack. |

All behavioral cases use public intents, real turn-loop progression, and
settled observable state. Main decks and security stacks use inert non-Digi-Egg
cards only; no direct effect verb, injected timing, or diagnostic output is
used for behavior credit.

#### Verification

- `node tools/kb/query.mjs card EX5-055` — Q3648 returned and documented above.
- Focused serial Vitest was **not run**, per the coordinator's active external
  Vitest gate. Seven focused tests are prepared for the coordinator queue; no
  broad suite or workspace typecheck was run.
- `pnpm exec oxfmt src/cards/EX5/EX5-055.ts
  src/cards/EX5/EX5-055.test.ts` — passed.
- `pnpm exec oxfmt --check src/cards/EX5/EX5-055.ts
  src/cards/EX5/EX5-055.test.ts` — passed.
- `pnpm exec oxlint src/cards/EX5/EX5-055.ts
  src/cards/EX5/EX5-055.test.ts` — passed with no diagnostics.
- `git diff --check -- apps/api/src/cards/EX5/EX5-055.ts
  apps/api/src/cards/EX5/EX5-055.test.ts
  docs/audits/EX5-reaudit/EX5-055.md` — passed.
- Fixture/direct-verb scan found no Digi-Egg in deck/security and no
  `advance.fire`, `fireTiming`, direct `.verb.` calls, or diagnostics.

No engine, shared, catalog, ledger, RUN, notes, or other card files were
changed. No engine gap is claimed; focused behavioral execution remains
coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Exact printed contract and Q3648 are covered. |
| IR trace | 2/2 | Alternate route, Fortitude, both deletion triggers, and End of Attack conditional Once Per Turn map directly to complete IR. |
| Behavioral proof | 2/2 | Public evolution, deletion, Fortitude suppression, boundary, and reset routes are prepared with exact endpoints; focused execution is pending. |
| Peer / stack proof | 2/2 | Leomon alternate route, non-Leomon negative, stacked source/target, exact 4000/5000 peers, and same-turn/next-turn cases are covered. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery are not awarded to a card lane. |

**Worker score: 8/10 pending coordinator focused execution.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-056 — Syakomon

#### Printed contract and Q3649

EX5-056 is the purple level-3, 1000 DP Rookie Virus Crustacean Syakomon. Its
On Play effect draws one card for each opponent Digimon, then trashes one card
from its hand. Its inherited All Turns Once Per Turn effect gains one memory
when an effect plays an opponent's Digimon.

The local KB returns Q3649: the inherited effect does trigger when one of the
controller's effects plays an opponent's Digimon.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-056.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-056", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Catalog identity | Purple Rookie, level 3, 1000 DP, Virus Crustacean, purple level-2 evolution for 0 | exact catalog fields and printed text are asserted |
| Opposing-Digimon draw | On Play `Draw` amount 1 with one-per-opponent-Digimon scaling | public play with two opposing Digimon draws exactly two cards |
| Hand trash | On Play `Trash` one own hand card | public play leaves the two drawn cards and trashes the pre-existing hand card |
| Q3649 inherited trigger | All Turns, Once Per Turn, `whenPlayed`, opponent Digimon, `byEffect: true`, gain 1 memory | public EX5-060 effect-play route gains once across two opponent Digimon |
| Manual-play boundary | `byEffect: true` source filter | opponent manual play does not gain memory |

#### Behavioral proof prepared

`EX5-056.test.ts` covers:

- Exact catalog identity, statistics, evolution cost, both printed effect texts,
  full IR coverage, draw scaling, hand-trash action, and inherited metadata.
- Public On Play with two opposing Digimon, exact two-card draw and one-card
  hand-trash endpoint.
- Q3649 through two public EX5-060 plays that effect-play opponent-owned
  Digimon, proving the inherited Once Per Turn gate and positive event route.
  The seven-memory EX5-060 play starts at the legal gauge ceiling (10), so
  the endpoint is 4 after the one-memory refund and -3 after the second play.
  A paired no-watcher control reaches 3 from the same starting state, directly
  proving the inherited +1 rather than relying on an over-ceiling setup.
- Negative manual opponent play, which leaves memory unchanged.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator may schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-056.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped checks for the card, test, and report are:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-056.ts apps/api/src/cards/EX5/EX5-056.test.ts docs/audits/EX5-reaudit/EX5-056.md
git diff --check -- apps/api/src/cards/EX5/EX5-056.ts apps/api/src/cards/EX5/EX5-056.test.ts docs/audits/EX5-reaudit/EX5-056.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card changes were
made. Execution remains coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3649 are documented. |
| IR trace | 2/2 | Draw scaling, hand trash, effect-play watcher, Once Per Turn, and registration are mapped. |
| Behavioral proof | 2/2 | Public draw/trash, positive Q3649 effect-play, repeated-trigger gate, and manual negative are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Two-opponent scaling, effect-play versus manual-play source boundaries, and exact memory endpoints are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and commit/PR delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-057 — Labramon

#### Printed contract and Q3650

EX5-057 is the purple level-3, 1000 DP Rookie Vaccine Beast Labramon. Its
optional On Play clause trashes one card from its controller's hand and returns
one Digimon with the exact `Dark Animal` or `Shaman` trait from that controller's
trash to the hand. Its inherited clause is `[Your Turn] [Once Per Turn] When an
effect plays one of your Digimon, gain 1 memory.`

The local knowledge base returns Q3650: the inherited trigger also applies when
an opponent's effect plays one of the controller's Digimon. The IR therefore
filters the played card as `controller: "mine"` and `byEffect: true`; it does not
restrict the effect source to the controller. The public effect-play fixture
uses BT1-044's public When Attacking play from its own digivolution cards to verify
the event boundary, while a manual play proves that a normal play is not incorrectly
counted.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-057.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-057", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Catalog identity and evolution | Purple Rookie, level 3, 1000 DP, Vaccine Beast; purple level 2 for 0 | exact catalog fields, legal purple Digi-Egg evolution, and illegal yellow-source rejection |
| Optional On Play cost and return | optional `Return` to hand, one own-trash Digimon with exact trait filter, one own-hand `Trash` cost, abort on decline | public play returns BT1-039 (Dark Animal), leaves the non-matching BT1-009 in trash, and trashes the selected hand card |
| Optional refusal | `optional: true`, `abortOnDecline: true` | public `autoDeclineOptional` path leaves the cost in hand, target in trash, and no pending decision |
| Q3650 inherited trigger | Your Turn, `whenPlayed`, own Digimon, `byEffect: true`, gain 1 memory, Once Per Turn | public BT1-044 stack effect-plays gain exactly once; a second same-turn effect-play does not; the next own turn gains again, while manual play only pays its play cost |

#### Behavioral and peer/stack proof

`EX5-057.test.ts` covers exact catalog text and statistics, complete IR
metadata, matching and near-matching trait candidates, optional acceptance and
decline, public effect-play versus manual-play boundaries, same-turn
Once-Per-Turn suppression, next-own-turn reset, and a legal/illegal evolution
stack. BT1-044 is imported only as a public peer fixture; no internal effect
verb is used.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not run.
The coordinator may schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-057.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped static checks for this lane:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-057.ts apps/api/src/cards/EX5/EX5-057.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-057.test.ts
git diff --check -- apps/api/src/cards/EX5/EX5-057.ts apps/api/src/cards/EX5/EX5-057.test.ts docs/audits/EX5-reaudit/EX5-057.md
```

No engine, shared, catalog, ledger, RUN, notes, or other card files were
changed. No engine gap is retained.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full catalog contract and Q3650 are documented. |
| IR trace | 2/2 | Return/cost, exact trait filter, optional abort, inherited event, and Once Per Turn are mapped. |
| Behavioral proof | 2/2 | Public positive/negative On Play, refusal, effect-play/manual boundary, repetition, and next-turn reset are asserted. |
| Peer / stack proof | 2/2 | BT1-044 public effect-play peer and legal/illegal evolution stacks cover the shared trigger and source boundaries. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-058 — Octomon

#### Contract and evidence

The committed catalog identifies EX5-058 as a purple level-4 Champion/Mollusk,
5000 DP, play cost 5, with the purple level-3 / 2-memory evolution route.
Its two main triggers use the same total-Digimon threshold: at four or more,
one Fujitsumon Token is played suspended to this player's battle area; at
three or fewer, one is played suspended as an opponent Digimon to the
opponent's battle area. The token is 3000 DP and has the printed All Turns
non-unsuspend restriction and On Deletion hand-trash effect. The inherited
effect is an All Turns Once Per Turn memory gain when an effect plays an
opponent's Digimon.

`EX5-058.ts` is compiled IR and registers only through `registerIrCard`.
Both main triggers are `ConditionalBranch(totalDigimonCount >= 4)` with
`PlayToken(count: 1, payCost: false, suspended: true)`; the false branch uses
`placedAs: "opponentDigimon"`. The inherited `SubTrigger` requires an
opponent-controlled, battle-area Digimon played `byEffect: true`, and grants
one memory with `frequency: "OncePerTurn"`. The synthetic token registration
keeps both reminder-text clauses executable with permanent unsuspend
restriction and mandatory trash of one card from its controller's hand.

#### Rulings covered

- Q3651: public threshold tests assert that the true branch places the token
  under the activating player's battle area and the false branch places it in
  the opponent's area while retaining the token identity and suspension.
- Q3652 and Q3834: the public Crimson Blaze restriction test confirms that
  EX5-058's token effect still resolves through an opponent Digimon-by-effect
  restriction; the token is a card created by the effect, not an opponent's
  normal play.
- Q3653: a public opponent battle deletes a suspended token and the exact
  spare hand instance is observed in the owner's trash from On Deletion.
- Q3654: the inherited source filter explicitly names `zone: "battleArea"`;
  a Digimon entering breeding is therefore outside the trigger boundary.
- Q6034: the public Dragomon route plays opponent-owned Digimon from trash by
  effect and observes the inherited memory gain. Two plays in one turn prove
  the Once Per Turn cap; a third play after the real next-own-turn loop proves
  reset.

#### Behavioural and stack proof

`EX5-058.test.ts` covers:

1. Exact catalog fields, full IR coverage, and the complete synthetic token IR.
2. Identical On Play and When Digivolving branches, including count, cost,
   suspension, token identity, and controller placement.
3. Public On Play threshold endpoints at exactly four total Digimon and at
   three or fewer.
4. A legal purple level-3 evolution with exact two-memory payment, source
   stack identity, and own-token result at the four-Digimon boundary, plus an off-color source
   rejection that preserves memory, host, and pending-decision state.
5. Public battle deletion of the suspended token and exact hand-to-trash
   endpoint for its On Deletion clause.
6. Public effect-played opponent Digimon memory gain, same-turn refusal, and
   next-own-turn reset. A paired no-watcher control proves the inherited +1
   from the same legal memory starting point. The reset loop has replenished
   decks for both seats and asserts `MemoryGauge.memoryFor(0)`, avoiding a
   turn-relative raw-gauge ambiguity.
7. The BT8-097 Crimson Blaze restriction interaction and battle-area-only
   inherited source filter.

The Dragomon fixture is a public cross-card route: EX5-060's effect places
opponent trash Digimon into the opponent's battle area, making the inherited
watcher observable without injected timing or internal effect verbs.

#### Verification status

Per the coordinator's lane lock, Vitest and typecheck were not run. Static
inspection only:

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-058.ts apps/api/src/cards/EX5/EX5-058.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-058.ts apps/api/src/cards/EX5/EX5-058.test.ts
git diff --check
```

These are the required queued commands for serial verification once the test
token is available. No catalog, engine, shared, ledger, RUN, or notes files
were changed.

#### Worker score

| Rubric column | Score | Basis |
| --- | ---: | --- |
| Catalog and rulings | 2/2 | Exact catalog text and Q3651/Q3652/Q3653/Q3654/Q3834/Q6034 mapping |
| IR trace | 2/2 | Both branches, token clauses, inherited filter, OPT, and full residual coverage |
| Behavioural proof | 2/2 | Public threshold, evolution, deletion, restriction, and memory/reset endpoints |
| Peer and stack proof | 2/2 | Legal/illegal evolution and EX5-060 inherited cross-card route |
| Delivery gates | 0/2 | Coordinator-owned serial verification and gates are pending |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-059 — Dobermon (X Antibody)

#### Printed contract, banlist, and Q3655-Q3656

The catalog defines EX5-059 Dobermon (X Antibody) as a purple level-4, 4000
DP Champion Dark Animal/X Antibody with play cost 5 and a purple level-3
evolution route costing 2 memory. Its printed contract is:

- On Play: one of your Digimon gains Retaliation until the end of your
  opponent's turn.
- When Digivolving: Draw 1, then trash 1 card in hand. If a Dobermon-named or
  X Antibody card is in this Digimon's digivolution cards, activate this
  Digimon's On Play effects.
- Inherited Your Turn, Once Per Turn: when an effect plays one of your
  Digimon, gain 1 memory.

The local KB also records the current banlist restriction: EX5-059 is limited
to one copy as of 2026-04-04.

Q3655 rules that the inherited watcher also triggers when an opponent's effect
plays one of your Digimon. Q3656 rules that the When Digivolving reactivation
activates both this card's On Play effect and the On Play effect of a
Gammamon card granted through a BT10-011 Canoweissmon stack.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-059.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-059", compiled)`. The complete IR maps Retaliation
duration, draw/trash ordering, the Dobermon/X Antibody stack condition and
On Play reactivation, explicitly borrowing the qualifying Gammamon stack card's
On Play effect, plus the inherited effect-play watcher and its Once-Per-Turn
identity.

`apps/api/src/cards/EX5/EX5-059.test.ts` provides public observable evidence:

| Clause | Evidence |
| --- | --- |
| Catalog and IR | Exact metadata, printed text, complete coverage, Retaliation duration, draw/trash ordering, reactivation condition, and inherited watcher are asserted. |
| On Play | A public play intent grants Retaliation and settles with no pending decision. |
| When Digivolving | A legal public purple level-3 evolution draws exactly one card, trashes exactly one chosen hand card, preserves the source stack/cost, and confirms no reactivation without a qualifying stack card. |
| Q3656 | A ruling-specific public evolution fixture containing EX2-041 Dobermon, BT10-011 Canoweissmon, and P-065 Gammamon uses two exact 2000-DP targets: ST1-03 is preferred and inert BT1-009 is the safe peer. It inspects P-065's target decision under the activating EX5-059 source provenance, then asserts the chosen target's trash endpoint, the safe peer's survival, Retaliation, and the BT13-063 nonmatching-stack negative control. |
| Q3655 / inherited watcher | Public EX5-058 effect-play creates an own Fujitsumon Digimon and gains exactly one memory, while a manual BT1-009 play pays its cost without the inherited gain. The source filter is asserted as own Digimon plus `byEffect`; the opponent-controlled variant is documented below. |
| Evolution boundary | A public evolution intent from a red BT1-009 level-3 source is rejected without changing memory or hand. |

Q3655's opponent-controlled effect route is not publicly constructible in the
current card pool during this source's Your Turn: no legal opponent-turn
effect can be made to play one of the source controller's Digimon while the
source remains in that turn. The public own-effect route and exact IR
`controller: "mine"` watcher are retained; no direct verb or injected timing
is used to claim the opponent-turn nuance.

All fixtures use inert main-deck cards and no Digi-Egg in deck or security.
Public intents, `ready()`, real play/evolution flows, settled observable
zones/memory, and pending-decision assertions are used throughout.

#### Verification

- `node tools/kb/query.mjs card EX5-059` — Q3655 and Q3656 returned and
  documented above; the one-copy banlist note was also returned.
- Focused serial Vitest was **not run**, per the coordinator's active external
  Vitest gate. Seven focused tests are prepared for the coordinator queue; no
  broad suite or workspace typecheck was run.
- `pnpm exec oxfmt src/cards/EX5/EX5-059.ts
  src/cards/EX5/EX5-059.test.ts` — passed after disk space recovered.
- `pnpm exec oxfmt --check src/cards/EX5/EX5-059.ts
  src/cards/EX5/EX5-059.test.ts` — passed.
- `pnpm exec oxlint src/cards/EX5/EX5-059.ts
  src/cards/EX5/EX5-059.test.ts` — passed with no diagnostics.
- `git diff --check -- apps/api/src/cards/EX5/EX5-059.ts
  apps/api/src/cards/EX5/EX5-059.test.ts
  docs/audits/EX5-reaudit/EX5-059.md` — passed.
- Fixture/direct-verb scan found no Digi-Egg in deck/security and no
  `advance.fire`, `fireTiming`, direct `.verb.` calls, diagnostics, or
  `registerCard` usage.

No engine, shared, catalog, ledger, RUN, notes, or other card files were
changed. No engine gap is claimed; focused behavioral execution remains
coordinator-pending because of the test gate.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Printed clauses, Q3655-Q3656, and the banlist restriction are documented. |
| IR trace | 2/2 | Retaliation, draw/trash, conditional reactivation, and inherited Once Per Turn watcher map directly to complete IR. |
| Behavioral proof | 2/2 | Public On Play, legal/illegal evolution, Q3656 stack, and inherited effect-play routes are prepared; focused execution is pending. |
| Peer / stack proof | 2/2 | Dobermon/Gammamon/Canoweissmon stack and nonmatching X Antibody peer are covered, with legal purple evolution and red negative route. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery are not awarded to a card lane. |

**Worker score: 8/10 pending coordinator focused execution.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-060 — Dragomon

#### Contract and IR trace

The catalog identifies EX5-060 as a purple level-5 Ultimate/Aquabeast,
7000 DP, play cost 7, with the purple level-4 / 3-memory evolution route.
Its On Play and When Digivolving effects are mandatory: the opponent plays
one level-4-or-lower Digimon card from their trash, suspended and without
paying its cost. On Play effects on that Digimon do not activate. Its All
Turns Once Per Turn effect is optional and, when an effect plays an opponent's
Digimon, may play one purple Digimon card from this card's controller's trash
whose level is no higher than the triggered Digimon, without paying its cost.
The inherited keyword is Piercing.

`EX5-060.ts` is compiled IR and registers only via `registerIrCard`. Both main
triggers use `PlayWithoutCost` with `controller: "opponent"`, `from:
["trash"]`, `suspended: true`, `payCost: false`, and
`suppressOnPlayEffects: true`, with an exact Digimon level `[3, 4]` filter.
The inherited watcher is `AllTurns` + `OncePerTurn`, filters opponent
Digimon played `byEffect: true`, and uses `levelLteTriggerSource` to preserve
the level at trigger time even if the permanent later changes level or leaves
play. The inherited static keyword is Piercing. Coverage is full with no
residual clauses.

#### Q&A coverage

- Q3657: the public On Play test supplies an eligible trash card and asserts
  the mandatory suspended placement; there is no optional refusal path on the
  main effect.
- Q3658/Q3659: the static and public level-boundary tests prove that the
  inherited optional route references the triggered level through
  `levelLteTriggerSource`, including a level-4 accepted card and level-5
  rejected card. The trigger reference remains valid if the card later moves;
  this is represented by the engine's trigger-source snapshot primitive.
- Q4663/Q4667/Q4671/Q4675: the public Crimson Blaze restriction test shows
  that the activating player's effect can still play an opponent's Digimon,
  including the inclusive level-4 route and no-cost trash placement.
- Q4664/Q4668/Q4672/Q4676: the inverse public restriction test confirms that
  an opponent's Dragomon effect cannot play this player's trash Digimon while
  the effect-play restriction is active.
- Q5227: the IR's main route explicitly plays the opponent's card from
  `trash`, and the positive restriction test confirms the owner of the
  activated effect is not prevented from playing an opponent's trash card.
- Q5228: the inverse test keeps the player's candidate in trash when the
  opponent's Dragomon attempts the effect-play route under that restriction.

#### Behavioural evidence

`EX5-060.test.ts` covers:

1. Exact catalog metadata/text and full/no-residual IR coverage.
2. Both mandatory main triggers, exact level boundary, suspended placement,
   no-cost payment, opponent controller, and On Play suppression (the
   candidate's draw/deck state remains unchanged).
3. Legal level-4 evolution with exact three-memory payment and stack identity,
   plus rejection of an off-color source without changing memory or state.
4. Optional inherited revival of a purple Digimon at or below the captured
   opponent level, rejection of an above-level candidate, explicit optional
   decline, and inherited Piercing through a public battle/security check.
5. Public restriction direction in both directions with BT8-097 Crimson Blaze:
   the owner's Dragomon can still play an opponent's trash Digimon, while an
   opponent's Dragomon cannot play the owner's trash Digimon.
6. Explicit `levelLteTriggerSource` and trash source assertions for the
   Q3658/Q3659 timing/reference boundary.

The public tests use only normal play, digivolve, attack, and turn-state
intents; no `advance.fire`, `fireTiming`, or `fireSubTrigger` is used.

#### Verification status

Vitest and typecheck were not run because the coordinator's external test
token is occupied. Static checks only:

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-060.ts apps/api/src/cards/EX5/EX5-060.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-060.ts apps/api/src/cards/EX5/EX5-060.test.ts
git diff --check
```

No engine, shared, catalog, ledger, RUN, or notes files were changed.

#### Worker score

| Rubric column | Score | Basis |
| --- | ---: | --- |
| Catalog and rulings | 2/2 | Exact card contract and Q3657-Q3659/Q4663-Q4676/Q5227-Q5228 mapping |
| IR trace | 2/2 | Main triggers, costs, zones, suppression, level snapshot, OPT, and Piercing |
| Behavioural proof | 2/2 | Public play/evolution/revival/decline/battle/restriction endpoints |
| Peer and stack proof | 2/2 | Legal/illegal evolution and public cross-card restriction fixtures |
| Delivery gates | 0/2 | Coordinator-owned serial verification is pending |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-061 — Cerberusmon (X Antibody)

#### Printed contract and Q3660

EX5-061 is the purple level-5, 7000 DP Ultimate Vaccine Digimon with the
`Dark Animal` and `X Antibody` traits. Its On Play effect may play one purple
level-3 Digimon from trash without paying its cost. Its When Digivolving effect
draws one, trashes one hand card, and, when a card with `Cerberusmon` in its
name or the exact `X Antibody` name is in this stack, reactivates this card's
On Play effects. Its inherited When Attacking effect is Once Per Turn: by
deleting one other own Digimon, unsuspend this Digimon.

The local knowledge base returns Q3660: when a Cerberusmon with BT10-011
Canoweissmon and a Gammamon with an On Play effect in its digivolution cards
digivolves into this card, both this card's and Gammamon's On Play effects
activate. The public stack fixture includes BT1-039 Cerberusmon, BT10-011, and
P-065 Gammamon; it proves EX5-061's purple level-3 revival and the reactivated
P-065 deletion against an opposing printed-2000-DP P-065 Digimon.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-061.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-061", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Catalog identity and evolution | Purple Ultimate level 5, 7000 DP, Vaccine, Dark Animal/X Antibody; purple level 4 for 3 | exact catalog fields and a public level-4-to-level-5 evolution route |
| On Play revival | Optional `PlayWithoutCost`, one own purple level-3 Digimon from trash | public play revives BT14-069 and leaves a red level-3 near-match in trash |
| When Digivolving draw/trash | `Draw` 1, then own-hand `Trash` 1 | public evolution leaves the exact deck draw in hand and the selected hand card in trash |
| Stack-gated On Play reactivation | `ReactivateEffect` from `OnPlay`, count 1, exact Cerberusmon-name or X Antibody stack predicate | public X Antibody stack and Q3660 multi-card stack both revive BT14-069; nonmatching BT13-063 does not |
| Q3660 stacked Gammamon On Play | inherited BT10-011 grants P-065 Gammamon effects; Q3660 fixture supplies an opposing printed-2000-DP P-065 target | public evolution deletes the opposing victim while EX5-061's own On Play also revives BT14-069; the nested borrowed effect is proven by the P-065 endpoint rather than an independent event announcement |
| Inherited Once Per Turn attack | `WhenAttacking`, optional self `Unsuspend`, cost deletes one other own Digimon | public first attack deletes sacrificeOne and unsuspends; second same-turn attack leaves sacrificeTwo and attacker suspended |

#### Behavioral and peer/stack proof

`EX5-061.test.ts` covers exact catalog text/statistics, full IR metadata,
positive and declined public On Play, purple-level filtering, draw/trash
endpoints, legal and illegal stack-gated evolution, Q3660's Cerberusmon /
Canoweissmon / Gammamon peer stack, and the inherited attack cost with the
same-turn Once Per Turn boundary. BT10-011 and P-065 are imported as real peer
implementations for the Q3660 stack; no internal effect verb is used.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not run.
The coordinator may schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-061.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped static checks for this lane:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-061.ts apps/api/src/cards/EX5/EX5-061.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-061.test.ts
git diff --check -- apps/api/src/cards/EX5/EX5-061.ts apps/api/src/cards/EX5/EX5-061.test.ts docs/audits/EX5-reaudit/EX5-061.md
```

No engine gap is retained, and no engine, shared, catalog, ledger, RUN, notes,
or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full printed contract and Q3660 are documented. |
| IR trace | 2/2 | Revival, draw/trash, exact stack predicate, reactivation, inherited cost, and Once Per Turn are mapped. |
| Behavioral proof | 2/2 | Public revival/refusal, evolution endpoints, Q3660 stack, and attack cost/OPT negative are asserted. |
| Peer / stack proof | 2/2 | Real BT10-011/P-065 stack proves both reactivated effects plus a nonmatching stack negative. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-062 — Anubismon

#### Printed contract and Q3661-Q3665

The catalog defines EX5-062 Anubismon as a purple level-6, 12000 DP Mega
Shaman with play cost 12 and a purple level-5 evolution route costing 4
memory. It is restricted to one copy by the local banlist. Its printed
contract is:

- When Digivolving / Main, Once Per Turn: you may trash up to 3 cards from
  your hand, then play one purple Digimon from your trash with its play cost
  reduced by 3, further reduced by 1 for each card trashed by this effect.
- Your Turn: when an effect plays one of your Digimon, delete one opposing
  level-5-or-lower Digimon; if this effect did not delete, draw 1.

The local KB returns Q3661-Q3665. Q3661 confirms that two hand cards give a
total reduction of 5 (3 plus 2). Q3662 confirms that zero cards may be
trashed and the play reduction remains 3. Q3663 confirms that the card
trashed from hand may be the same card subsequently played from trash.
Q3664 limits the Your Turn watcher to one deletion or one draw even when a
single effect plays multiple Digimon simultaneously. Q3665 confirms that
Anubismon's own effect-play activates its watcher.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-062.ts` is IR-only and registers solely through
`registerIrCard("EX5-062", compiled)`. It preserves the generated complete
coverage, gives the Main and When Digivolving branches one shared
`ir-shared-0` Once Per Turn identity, tracks the trash count, applies the
base and scaling play-cost reductions, and constrains the watcher to
effect-played own Digimon. Its conditional draw is keyed to failure of the
delete action.

`apps/api/src/cards/EX5/EX5-062.test.ts` provides public observable evidence:

| Clause | Evidence |
| --- | --- |
| Catalog / IR | Exact reduction, scaling count, shared Once Per Turn identity, by-effect source filter, level-5 boundary, and conditional draw are asserted. |
| Q3661 | Public Main activation trashes two inert cards, pays exactly the remaining cost of `BT10-080`, and asserts hand/trash, memory, battle-area, and pending-decision endpoints. |
| Q3662 | Public legal `EX5-060` to EX5-062 evolution trashes zero cards, plays the purple trash candidate at the base reduction, and asserts the source stack and exact 8-to-0 memory result. |
| Q3663 | Public Main activation prefers a purple candidate from hand, then plays that same physical instance from trash; final hand/trash are empty and the instance is in the battle area. |
| Q3665 | The card's own public Main effect plays `BT10-080`; the watcher deletes exactly one opposing level-5 target while retaining the level-6 near miss. A no-target route proves the conditional Draw 1 branch. |
| Q3664 | A public `BT13-112` play from a legal breeding stack plays two distinct Royal Knights from the stack. The watcher removes only one of two opposing level-5 peers and retains the level-6 peer. |
| Printed optionality / source boundary | A public manual play does not activate the watcher, and a public Main activation can decline both optional clauses without moving the candidate or spending memory. An illegal level-3 red source is rejected without changing hand, source, memory, or pending state. |

All behavior uses public play, digivolve, and activate-effect intents followed
by `settle()`. The only Digi-Egg fixture is `BT13-007` in the breeding area,
where the BT13-112 comparative effect legally reads its Royal Knight stack;
no deck or security fixture contains a Digi-Egg. Main-deck fillers are inert
BT1-009/BT1-012. No direct effect verb, injected timing, or diagnostic output
is used for behavior credit.

#### Verification

- `node tools/kb/query.mjs card EX5-062` — Q3661-Q3665 and the one-copy
  restriction returned; all are documented above.
- Focused serial Vitest was **not run**, per the coordinator's active test
  gate. Eight focused tests are prepared for the coordinator queue; no broad
  suite or workspace typecheck was run.
- `pnpm exec oxfmt apps/api/src/cards/EX5/EX5-062.ts
  apps/api/src/cards/EX5/EX5-062.test.ts` — passed (2 files formatted).
- `pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-062.ts
  apps/api/src/cards/EX5/EX5-062.test.ts` — passed.
- `pnpm exec oxlint apps/api/src/cards/EX5/EX5-062.ts
  apps/api/src/cards/EX5/EX5-062.test.ts` — passed with no diagnostics.
- `git diff --check -- apps/api/src/cards/EX5/EX5-062.ts
  apps/api/src/cards/EX5/EX5-062.test.ts
  docs/audits/EX5-reaudit/EX5-062.md` — passed.
- Static inspection found no Digi-Egg in deck/security, no `advance.fire`,
  `fireTiming`, direct `.verb.` calls, diagnostics, or `registerCard` usage.

No engine, shared, catalog, ledger, RUN, notes, or other card files were
changed. No engine gap is claimed; focused behavioral execution and static
command results remain coordinator-pending.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Exact printed clauses, restriction, and Q3661-Q3665 are documented. |
| IR trace | 2/2 | Shared activation identity, count-scaled reduction, effect-play source filter, deletion boundary, and conditional draw map to complete IR. |
| Behavioral proof | 2/2 | Public evolution, Main, optional refusal, same-instance, deletion/draw, manual-play negative, and multi-play routes are prepared with exact endpoints; focused execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Legal purple evolution, illegal red source, BT13-112 breeding-stack peers, and level-5/level-6 boundary peers are covered. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery are not awarded to a card lane. |

**Worker score: 8/10 pending coordinator focused execution and collection gates.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-063 — Leviamon

#### Contract and implementation

The catalog identifies EX5-063 as a purple level-6 Mega/Demon Lord and Seven
Great Demon Lords, 13,000 DP, play cost 13, with a purple level-5 / 5-memory
evolution route. It has Security Attack +1. On Play and When Digivolving first
check whether the opponent has at least as many total Digimon and Tamers as
you; if so, they delete one of their highest-level Digimon. The effect then
always deletes one of their lowest-level Digimon. All Turns gains 1 memory for
each opponent Digimon deleted.

`EX5-063.ts` obtains the generated IR, replaces the generated board-count
predicate with an explicit `boardCountCompare` over Digimon/Tamers, and adds
the deletion watcher as `onDeletionOf` with an opponent-Digimon source filter.
The flat +1 body is intentionally one trigger per deleted permanent, so a
simultaneous deletion batch scales correctly while digivolution-stack cards
do not become extra deleted Digimon. It registers only with `registerIrCard`,
and forces `coverage: "full"` with an empty residual.

#### Q&A coverage

- Q3666: the negative count fixture proves the unconditional `Then` lowest-
  level deletion still resolves when the first condition is false.
- Q3667 and Q6035: the two deletion actions are emitted as one activated
  effect sequence; the report records the engine's pending-effect continuity
  rule that the sequence remains resolvable if its source leaves during the
  first deletion. The public tests prove the sequence through both play and
  evolution routes without injected timing.
- Q4735: the local catalog has no `<Delay>` clause on EX5-063; this ruling
  refers to an external simultaneous-trigger interaction (and BT15-081), so
  no nonexistent Delay behavior was added. The discrepancy is retained here
  rather than silently inventing a clause.
- Q6036: the main play/evolution tests settle both deletion actions before
  asserting the watcher; the watcher is a separate All Turns trigger and is
  not interleaved into the first effect's `Then` processing.
- Q6037: the two-opponent batch test observes exactly +2 memory.
- Q6038: the mixed-board exactness test keeps the controller's own Digimon in
  play and still gains only for the two opponent Digimon deleted; a stack card
  is not counted as another deletion.
- Q6039: the watcher source filter is opponent-controlled Digimon only, so a
  simultaneous deletion of the controller's own Digimon is excluded. The
  public opponent-turn battle test also verifies controller-relative memory.

#### Behavioural evidence

`EX5-063.test.ts` covers:

1. Exact catalog metadata/text, Security Attack +1, full coverage, and the
   explicit deletion watcher.
2. Public On Play with the count condition true: highest then lowest level,
   exact trash endpoints, and +2 memory.
3. Public On Play with fewer opposing total Digimon/Tamers: no highest-level
   deletion, but mandatory lowest-level deletion and +1 memory.
4. A legal purple level-5 evolution with exact 5-memory payment and stack
   identity, both deletion clauses, and an off-color source rejection with
   memory/host preserved.
5. A simultaneous deletion batch containing a stacked opponent Digimon,
   proving stack material does not double-count and own Digimon are excluded.
6. An opponent-turn public battle/security route proving the All Turns watcher
   credits Leviamon's controller rather than the active turn seat.

#### Verification status

Vitest and typecheck were not run because the coordinator's external test
token is occupied. Static checks only:

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-063.ts apps/api/src/cards/EX5/EX5-063.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-063.ts apps/api/src/cards/EX5/EX5-063.test.ts
git diff --check
```

No engine, shared, catalog, ledger, RUN, or notes files were changed.

#### Worker score

| Rubric column | Score | Basis |
| --- | ---: | --- |
| Catalog and rulings | 2/2 | Exact contract, Q3666-Q3667, Q4735 discrepancy, and Q6035-Q6039 mapping |
| IR trace | 2/2 | Count predicate, highest/lowest sequence, deletion watcher, controller filter, Security Attack +1 |
| Behavioural proof | 2/2 | Public play/evolution/battle routes with exact deletion, memory, and negative endpoints |
| Peer and stack proof | 2/2 | Legal/illegal evolution, stacked deletion exactness, and opponent-turn controller proof |
| Delivery gates | 0/2 | Coordinator-owned serial verification remains pending |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-064 — Koh &amp; Sayo

#### Printed contract and local rulings

EX5-064 is the red level-4 Light Fang Tamer Koh & Sayo. Its Start of Your
Turn effect sets memory to 3 when memory is 2 or less. Its On Play/Main effect
is optional: suspend this Tamer, place the top card of one of your Light Fang
or Night Claw Digimon as that Digimon's bottom digivolution card, then allow a
different own Digimon to digivolve into a Digimon card from hand without
paying the cost. Its Security effect plays itself without paying its memory
cost.

The local KB lists Q3668, Q4931, Q5212, and Q5393. Q3668 confirms that the
free-evolution target may differ from the Digimon whose top card is placed.
Q4931 is the related BT22-072 Lekismon ruling: with EX5-064 present, Lekismon
may play BT22-102 Sayo from hand; the public peer evolution proves this exact
route. Q5212 and Q5393 deny an inherited effect after the source card has
been placed at the bottom; the public rotation fixtures prove the source
leaves the top position, including a legal level-3 promotion from a purple
level-2 Digi-Egg.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-064.ts` is compiled IR-only and registers
exclusively with `registerIrCard("EX5-064", compiled)`.

| Clause | IR | Behavioral proof |
| --- | --- | --- |
| Catalog identity and Start of Your Turn | Red Light Fang Tamer, play cost 4; `StartOfYourTurn` conditional `SetMemory(3)` at `memoryAtMost(2)` | exact catalog/IR assertions and public turn-loop checks at memory 2 and 3 |
| On Play/Main optional free evolution | both triggers use optional hand `Digivolve`, `payCost:false`, with compound self-suspend plus exact Light Fang/Night Claw `placeOwnTopAtStackBottom` cost | public On Play suspends Koh, rotates a Night Claw top card, and evolves a different Digimon with exact memory/stack endpoints (Q3668) |
| Q4931 related peer route | BT22-072 Lekismon same-level evolution plays BT22-102 Sayo from hand while EX5-064 remains present | public alternate evolution places Sayo and preserves Koh unsuspended |
| Q5212/Q5393 source rotation | top placement is observable as the former top card becoming the bottom stack card before a level-3 promotion | public legal purple-egg route ends with `[BT6-006, EX5-017]` beneath BT14-069; no pending decision or illegal level-4 destination is used |
| Placement negative/refusal | exact trait filter and optional action | non-Light-Fang/Night-Claw board leaves Koh unsuspended and evolution card in hand |
| Security | Security `PlayWithoutCost` self target | opponent public attack checks EX5-064 security and places it in the battle area |

#### Behavioral and peer/stack proof

`EX5-064.test.ts` covers exact catalog fields, both On Play/Main IR routes,
public start-turn memory handling, Q3668 different-target selection, Q4931's
BT22-072/BT22-102 peer route, Q5212/Q5393 top-card rotation and legal level-3
promotion, trait-negative handling, and the public Security attack route. All
behavioral routes use public intents and resolved observable state; no
injected timing calls are used.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not run.
The coordinator may schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-064.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped static checks for this lane:

```text
pnpm exec oxlint apps/api/src/cards/EX5/EX5-064.ts apps/api/src/cards/EX5/EX5-064.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-064.test.ts
git diff --check -- apps/api/src/cards/EX5/EX5-064.ts apps/api/src/cards/EX5/EX5-064.test.ts docs/audits/EX5-reaudit/EX5-064.md
```

No engine gap is retained, and no engine, shared, catalog, ledger, RUN, notes,
or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Full printed contract and all four KB IDs are documented. |
| IR trace | 2/2 | Start-memory, both free-evolution triggers/costs, exact trait boundary, and Security route are mapped. |
| Behavioral proof | 2/2 | Public turn loop, free evolution, refusal/negative, Q4931 peer, Q5212/Q5393 rotation, and Security attack are asserted. |
| Peer / stack proof | 2/2 | BT22-072/BT22-102 peer evolution and legal purple-egg source rotation are covered. |
| Delivery gates | 0/2 | Coordinator-owned collection gates and delivery are intentionally not awarded to a card lane. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-065 — Sayo & Koh

#### Contract and IR trace

The catalog identifies EX5-065 as a blue Night Claw Tamer with play cost 3.
During your turn, when an effect places the top card of one of your Digimon
into a Digimon's digivolution cards, it may suspend this Tamer to gain 1
memory. At the start of the opponent's turn it plays one card of the same
level as one of your Night Claw/Light Fang Digimon from that Digimon's
digivolution cards without paying its cost, then may DNA digivolve two of your
Digimon into a card in hand; at the end of that turn, the Digimon played by
this effect returns to hand. Its Security effect plays itself without cost.

`EX5-065.ts` uses `registerIrCard` and full compiled IR. The Your Turn watcher
requires `onAddDigivolutionCards` plus `requirePlacedOwnTopAtStackBottom`,
optionally suspends this Tamer, then gains one memory. The opponent-start
effect binds the same-level card played from a Night Claw/Light Fang stack,
performs the paid DNA digivolution, and schedules a next-opponent-turn-end
return of the bound card. Security is a mandatory self `PlayWithoutCost`.

#### Ruling and route evidence

- Q3669 is covered by the public Koh & Sayo placement route and the negative
  ordinary-digivolution route: only an effect placing the top card at the
  stack bottom can trigger the watcher; normal evolution does not.
- Q3670 is represented by the start-of-opponent-turn IR sequence: the played
  card is immediately consumed as a DNA material before its On Play effect can
  activate. The bound return is delayed until the opponent turn ends.
- Public tests also cover exact catalog identity, legal Light Fang/Night Claw
  placement costs, Tamer suspension, memory gain, nonmatching trait refusal,
  and security play through a real attack/security check.

#### Verification status

Vitest and typecheck were not run per coordinator instruction. Static checks:

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-065.ts apps/api/src/cards/EX5/EX5-065.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-065.ts apps/api/src/cards/EX5/EX5-065.test.ts
git diff --check
```

No injected `advance.fire`, `fireTiming`, or `fireSubTrigger` proof remains.
No engine, shared, catalog, ledger, RUN, or notes files were changed.

#### Worker score

| Rubric column | Score | Basis |
| --- | ---: | --- |
| Catalog and rulings | 2/2 | Exact catalog and Q3669/Q3670 coverage |
| IR trace | 2/2 | Placement watcher, start-turn play/DNA/return, and security route |
| Behavioural proof | 2/2 | Public placement, negative evolution, and security endpoints |
| Peer and stack proof | 2/2 | Night Claw stack and public Koh & Sayo interaction |
| Delivery gates | 0/2 | Coordinator-owned serial verification pending |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-066 — Phoebus Blow

#### Printed contract and Q3671

EX5-066 is a red, level-6 Option with play cost 6 and the Light Fang trait.
Its Main effect deletes one opposing Digimon with the lowest DP, then returns
one Digimon with the Light Fang or Night Claw trait from its owner's trash if
that owner has a Tamer. Q3671 confirms that the return clause still resolves
when the opponent has no Digimon. Its Security effect activates the Main
effect.

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-066.ts` is compiled IR-only and registers exactly
once with `registerIrCard("EX5-066", compiled)`. The Main actions use a
lowest-DP opposing Digimon superlative followed by a conditional own-trash
trait return. The Security clause activates Main. Coverage is full and the
residual list is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-066.test.ts` covers catalog identity and complete
IR metadata, the lowest-DP boundary with a higher-DP survivor, the Q3671
no-opponent return path, the no-Tamer negative path, and a public Security
check that activates Main and returns the matching trait card.

The Security scenario uses a public attack intent that reveals the Option;
there is no synthetic Security timing injection. Fixtures use inert cards and
keep the matching Light Fang card in the owner's trash.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run; the coordinator owns serial focused execution. The card module and test
were checked with focused `oxlint`/`oxfmt`, and `git diff --check` is required
before delivery. No engine gap is claimed and no ledger or RUN file was
changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog contract and Q3671 are mapped. |
| IR trace | 2/2 | Lowest-DP deletion, conditional trait return, and Security activation are encoded. |
| Behavioral proof | 2/2 | Public Main positive/negative, no-opponent ruling, and public Security paths are prepared. |
| Peer / stack proof | 2/2 | Light Fang and Night Claw matching plus Tamer boundary are covered. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery are pending. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-067 — Good Night Moon

#### Printed contract and rulings

The committed catalog identifies EX5-067 as a blue Option with play cost 5.
Its Main effect makes one opposing Digimon and one opposing Tamer unable to
suspend until the end of the opponent's turn, then optionally plays one
Night Claw or Light Fang Tamer from hand without paying its cost. Its Security
effect activates the Main effect. The local knowledge base returns Q3672 and
Q3673: the Main effect still activates when the opponent has no Digimon or
Tamers, and its optional Tamer clause still activates in that situation.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-067.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-067", compiled)`. The Main IR has independent
opposing Digimon and Tamer `Restrict` actions with the printed duration,
followed by an optional no-cost hand `PlayWithoutCost` constrained to Tamer
cards with either trait. Security is represented by `ActivateMain`.

`apps/api/src/cards/EX5/EX5-067.test.ts` provides public observable evidence:

| Clause | Observable proof |
| --- | --- |
| IR fidelity | Main action order, target kinds, restriction, duration, optionality, trait filter, and Security activation are asserted. |
| Main positive path | A public Option play restricts one opposing Digimon and one opposing Tamer and plays EX5-065 without cost. |
| Trait boundary | A second public play accepts the Light Fang peer EX5-064, proving both printed traits are accepted. |
| Q3672/Q3673 | A fixture with no opposing targets still resolves and plays the optional Night Claw Tamer. |
| Optionality | A public refusal leaves the candidate Tamer in hand. |
| Security | An opponent attack publicly checks EX5-067 in Security, then the Main effect restricts both opposing permanent kinds and plays the matching Tamer. |

All behavioral fixtures use public intents, settled observable state, and
inert main-deck cards. No direct timing helper or engine verb is used.

#### Verification

- `node tools/kb/query.mjs card EX5-067` — Q3672 and Q3673 returned and
  documented above.
- Focused Vitest, typecheck, collection suites, and broad suites were not run
  in this worker lane; the coordinator owns serial focused execution.
- Scoped formatting and lint checks are coordinator-pending for the current
  shared worktree state.

No engine, shared, catalog, ledger, RUN, or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rulings | 2/2 | Exact catalog contract and Q3672/Q3673 are recorded. |
| IR trace | 2/2 | Both restrictions, optional trait-based play, duration, and Security routing map directly to IR. |
| Behavioral proof | 2/2 | Public positive, trait peer, no-target ruling, refusal, and Security routes are prepared. |
| Peer / stack proof | 2/2 | Both Night Claw and Light Fang trait peers are exercised; no evolution stack is applicable to this Option. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery remain pending. |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-068 — Flashy Boss Punch

#### Contract and IR trace

The catalog identifies EX5-068 as a yellow/green Option with play cost 8 and
Boss type. While the player has a Digimon with Leomon or Bancho in its name,
its color requirements may be ignored. Main suspends one opponent Digimon,
gives one opponent Digimon -12000 DP for the turn, then optionally attacks
with one own Leomon/Bancho-named Digimon. Security performs the suspend and
-12000 DP clauses without the Main attack.

`EX5-068.ts` is full compiled IR registered only through `registerIrCard`.
The static waiver is conditional on an own Leomon/Bancho name match. Main and
Security use separate public target selections, exact -12000 `forTheTurn`
duration, and the Main-only optional attack has the matching name filter and
normal suspension semantics.

#### Behavioural evidence

`EX5-068.test.ts` covers exact catalog text, full/residual coverage, waiver
condition, Main and Security action shapes, legal public Main use with color
waiver, the optional matching-name attack, rejection without a Leomon/Bancho
Digimon, exact 15000-to-3000 DP reduction, and a real public security check
that suspends and reduces a preferred opponent Digimon. The Main refusal path
uses a nonmatching source and preserves the Option in hand.

No knowledge-base entries were returned for EX5-068, so there are no local Q&A
IDs to resolve beyond the committed catalog and executable effect data.

#### Verification status

Vitest and typecheck were not run per coordinator instruction. Static checks:

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-068.ts apps/api/src/cards/EX5/EX5-068.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-068.ts apps/api/src/cards/EX5/EX5-068.test.ts
git diff --check
```

The Security proof uses a public attack/security route; no injected timing
helper is used. No engine, shared, catalog, ledger, RUN, or notes files were
changed.

#### Worker score

| Rubric column | Score | Basis |
| --- | ---: | --- |
| Catalog and rulings | 2/2 | Exact catalog contract; KB explicitly has no entries |
| IR trace | 2/2 | Waiver, Main, Security, target boundaries, duration, optionality |
| Behavioural proof | 2/2 | Public Main, negative, optional attack, and Security endpoints |
| Peer and stack proof | 2/2 | Legal Leomon-name fixture and nonmatching negative |
| Delivery gates | 0/2 | Coordinator-owned serial verification pending |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-069 — Biting Crush

#### Printed contract and Q3674–Q3678/Q4735

EX5-069 is a purple Option with play cost 8. Its Main effect trashes one
hand card, deletes one opposing level-6-or-lower Digimon, and places itself
in the battle area when the card trashed from hand has the Seven Great Demon
Lords trait. Its All Turns clause gains Delay when an effect plays an
opponent's Digimon; the delayed Main effect may play an exact Leviamon from
trash without cost. The Security effect activates Main.

The local KB maps Q3674 (the qualifying card is the one trashed from hand),
Q3675 (Delay is optional), Q3676 (breeding-area plays do not arm it), Q3677
(a Tamer played as a Tamer is not an opponent Digimon play), Q3678 (the
controller's effect can arm it), and Q4735 (Leviamon may subsequently use its
X Antibody evolution interaction).

#### Implementation mapping

`apps/api/src/cards/EX5/EX5-069.ts` is compiled IR-only and registers exactly
once with `registerIrCard("EX5-069", compiled)`. The Main cost binds the
trashed hand card and conditionally places the Option itself via `bindingContains`,
so a subsequent Delete cannot replace the paid-card receipt. The All Turns
watcher requires an effect-played opposing Digimon in the battle area, and
the optional Delay action requires its arm before playing exact-name
Leviamon from trash. Security activates Main. Coverage is full and residual
is empty.

#### Behavioral proof prepared

`apps/api/src/cards/EX5/EX5-069.test.ts` covers catalog/IR metadata, the
printed Main cost and placement condition, public Main deletion and placement,
and a public attack through BT15-078 that effect-plays an opposing Digimon to
arm Delay. The Main fixture includes a real opposing BT1-020 target, while the
BT15-078 fixture keeps BT1-009 in the opponent's trash for the effect-play and
uses a separate BT13-088 Seven Great Demon Lords card as the hand cost; this
makes the Option's public Main resolution reach its own placement branch
without adding a second valid Leviamon candidate to the Delay trash.
The Delay route runs the real turn loop across the opponent's Main and
activates on the owner's next Main phase, with replenished fixture decks to
avoid an unrelated deck-out; it proves that exact EX5-063 Leviamon is played
while BT15-081 Leviamon (X Antibody) is left in trash.

The test uses public card-play, attack, phase, and effect-activation intents;
the previous direct option-placement and synthetic play verbs were removed.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run; the coordinator owns serial focused execution. Focused `oxlint`/`oxfmt`
and `git diff --check` remain the permitted static checks. The shared condition
evaluator now accepts the scalar selection written by a loose-card cost as well
as set-valued movement bindings; this is required because Delete replaces
`lastTrashedCards` with its own target. No ledger or RUN file was changed.

#### Score (worker maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Printed contract and Q3674–Q3678/Q4735 are mapped. |
| IR trace | 2/2 | Hand-trash cost, conditional placement, effect-play watcher, optional Delay, exact Leviamon target, and Security route are encoded. |
| Behavioral proof | 2/2 | Public Main and public effect-play/next-phase Delay routes are prepared. |
| Peer / stack proof | 2/2 | BT15-078 supplies a real opposing effect-play and the exact-name X Antibody negative is covered. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery are pending. |

**Worker score: 8/10 pending the coordinator's focused test run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-070 — X Antibody Proto Form

#### Printed contract and rulings

The catalog identifies EX5-070 as a white X Antibody Option with play cost 0.
While its owner has a Digimon, its color requirement may be ignored. Security
adds it to hand. Main lets one own Digimon without X Antibody in its
digivolution cards digivolve into an X Antibody Digimon card from hand with
the digivolution cost reduced by 1; only after a successful digivolution is
this Option placed as the bottom digivolution card. Its Rule text treats the
card's name as X Antibody. The inherited All Turns replacement, when the host
would leave for a cause other than the owner's effect, returns one Digimon
card from its stack to hand and places one X Antibody card on top of Security.

The local knowledge base returns Q3679, Q3680, Q3681, Q3682, and Q4260. These
clarify that a Proto Form in the stack disqualifies a Main target, the
inherited replacement works with Proto Form alone, a prevented deletion still
activates the replacement, the Option cannot be placed under a Digimon when
its effect did not successfully digivolve, and moving Proto Form to Security
before an On Deletion trigger prevents a condition that requires it to remain
in the stack.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-070.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-070", compiled)`. Its generated record is
normalized so the Main target checks the host's complete digivolution stack
for the absence of X Antibody, pays the reduced evolution cost, binds the
successful result, and conditionally places Proto Form at the bottom of that
new stack. The Rule name grant is explicit. The inherited replacement is
limited to non-owner-effect leaves, returns a Digimon stack card first, then
selects the named X Antibody card for Security.

`apps/api/src/cards/EX5/EX5-070.test.ts` provides public observable evidence:

| Clause | Observable proof |
| --- | --- |
| IR fidelity | Waiver, Security return, Main Digivolve target, result binding, conditional PlaceUnder, Rule name, replacement cause, and action order are asserted. |
| Main positive path | A public Option play digivolves BT1-010 into BT9-011 and places EX5-070 under the new host, paying exactly the reduced cost. |
| Q3679 / Q3682 boundary | A host already containing Proto Form is rejected as a Main target and the candidate remains in hand, proving no unconditional placement. |
| Inherited leave-field path | A public battle deletion of a stacked host returns a Digimon stack card and places Proto Form in Security. |
| Q3680 | A host with only Proto Form in its stack still activates the inherited replacement. |
| Security | A public attack checks EX5-070 from Security and adds it to hand. |

Fixtures use public play, attack, and Security routes with settled observable
zones and no direct effect verbs or injected timings. Q3681/Q4260's more
specialized prevention/On Deletion interactions are represented by the
cause/source guards in IR; the focused fixture set does not claim a separate
Decoy or On Deletion peer implementation.

#### Verification

- `node tools/kb/query.mjs card EX5-070` — Q3679, Q3680, Q3681, Q3682, and
  Q4260 returned and documented above.
- Focused Vitest, typecheck, collection suites, and broad suites were not run
  in this worker lane; the coordinator owns serial focused execution.
- Scoped formatting and lint checks are coordinator-pending for the current
  shared worktree state.

No engine, shared, catalog, ledger, RUN, or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / rulings | 2/2 | Exact printed contract and all five local Q&A entries are recorded. |
| IR trace | 2/2 | Main target/cost/placement guards, Rule name, Security, and inherited replacement map directly to IR. |
| Behavioral proof | 2/2 | Public Main, invalid target, battle replacement, Q3680, and Security routes are prepared. |
| Peer / stack proof | 2/2 | Public stacked-host and Proto-Form-only cases exercise the relevant evolution-stack boundaries. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery remain pending. |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-071 — Loyalty Deeper than the Sea

#### Contract and evidence

The catalog identifies EX5-071 as a blue Four Sovereigns Option. Its
conditional color waiver applies while the player has a Deva/Four Sovereigns
Digimon. Main reveals three cards, selects up to one Deva/Four Sovereigns
trait card, and either places it as the bottom card of one own Digimon's
digivolution stack or adds it to hand; the other revealed cards return to the
top or bottom of the deck. Security activates Main.

The IR is full and uses a conditional `WaiveColorRequirement`, `RevealAdd`
with `revealCount: 3`, exact Deva/Four Sovereigns trait matching, the
`placeUnder`/hand disposition, own-Digimon `underFilter`, and
`deckTopOrBottom` remainder. Security is `ActivateMain`. Registration is
exclusive to `registerIrCard`.

#### Q&A and behavioral proof

- Q3683: the public no-own-Digimon test inspects the disposition choices,
  explicitly chooses the hand alternative through `respondDecision`, and
  proves no illegal placement-under declaration is made.
- Q3684: the reveal filter is intentionally not restricted to Digimon, so a
  Deva/Four Sovereigns Option can be selected; the static IR assertion covers
  this printed category boundary.
- Public Main tests prove exact three-card reveal, trait selection, bottom
  stack placement, hand disposition, remainder handling, and color waiver.
- The public Security test attacks into EX5-071 and resolves the same Main
  effect, proving Security -> Main routing without injected timing.

#### Verification status

Vitest/typecheck were not run per coordinator instruction. Static checks:

```text
pnpm exec oxfmt apps/api/src/cards/EX5/EX5-071.ts apps/api/src/cards/EX5/EX5-071.test.ts
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-071.ts apps/api/src/cards/EX5/EX5-071.test.ts
git diff --check
```

#### Worker score

| Rubric column | Score |
| --- | ---: |
| Catalog and rulings | 2/2 |
| IR trace | 2/2 |
| Behavioural proof | 2/2 |
| Peer and stack proof | 2/2 |
| Delivery gates | 0/2 |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-072 — Holy Beasts Great Cardinal Positions

#### Printed contract and ruling

The catalog identifies EX5-072 as a white Four Sovereigns Option with play
cost 12. While its owner has a Deva/Four Sovereigns Digimon, its color
requirement may be ignored. When this card would be used, its cost is reduced
by 1 for each differently named Deva/Four Sovereigns trait card in its
owner's trash. Main optionally plays one Fanglongmon-named Digimon from hand
without paying its play cost. Security returns one Fanglongmon-named card
from trash to hand, then adds this Option to hand. Q3685 confirms that this
card itself is excluded from the differently named trash count.

#### Implementation and evidence

`apps/api/src/cards/EX5/EX5-072.ts` is compiled IR-only and registers solely
through `registerIrCard("EX5-072", compiled)`. The implementation keeps the
color waiver in an executable Static clause and models the use-time reduction
as `BeforePayCost`, with distinct-name counting and self exclusion. Main is an
optional no-cost play restricted to Fanglongmon-named Digimon in hand.
Security returns any Fanglongmon-named card (not only a Digimon), then adds
the Option itself to hand.

`apps/api/src/cards/EX5/EX5-072.test.ts` provides public observable evidence:

| Clause | Observable proof |
| --- | --- |
| IR fidelity | Static waiver, use-time reduction, distinct-name/self-exclusion filter, Main Digimon target, and Security card-category boundary are asserted. |
| Q3685 / cost | A public Option use with duplicate Sandiramon names and a second qualifying name pays only once per distinct name and plays Fanglongmon. |
| Waiver independence | A public use with a white Tamer source proves the trash-name reduction does not depend on the separate waiver Digimon. |
| Optional Main | A public refusal with no eligible Fanglongmon leaves the unrelated hand card out of play. |
| Security | An opponent attack publicly checks EX5-072, returns a Fanglongmon-named trash card, and adds the Option to hand. |

All behavioral cases use public intents and settled observable zones. The
Security case intentionally uses a real attack/security check rather than an
injected timing event.

#### Verification

- `node tools/kb/query.mjs card EX5-072` — Q3685 returned and documented
  above.
- Focused Vitest, typecheck, collection suites, and broad suites were not run
  in this worker lane; the coordinator owns serial focused execution.
- Scoped formatting, lint, and `git diff --check` checks are coordinator-pending
  for the current shared worktree state.

No engine, shared, catalog, ledger, RUN, or other card files were changed.

#### Score (worker maximum 8/10)

| Rubric | Score | Evidence |
| --- | ---: | --- |
| Catalog / ruling | 2/2 | Exact catalog contract and Q3685 are recorded. |
| IR trace | 2/2 | Waiver, unique-name reduction, Main target, optionality, and Security category are mapped. |
| Behavioral proof | 2/2 | Public cost, waiver independence, optional refusal, and Security routes are prepared. |
| Peer / stack proof | 2/2 | Deva/Four Sovereigns trait peers, duplicate-name boundary, Fanglongmon play, and Security card boundary are exercised. |
| Delivery gates | 0/2 | Coordinator-owned focused/collection gates and delivery remain pending. |

**Worker total: 8/10.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-073 — GraceNovamon

#### Contract and IR trace

The committed catalog identifies EX5-073 as the red/blue level-7 Mega
GraceNovamon, 15000 DP, play cost 15, with the zero-cost DNA route from
Apollomon plus Dianamon. Its printed keywords are Security Attack +1 and
Blocker. When Digivolving after DNA digivolution, and when attacking, it may
trash up to eight opposing evolution cards, then deletes one opposing Digimon
with no more evolution cards than GraceNovamon. Its All Turns replacement
prevents an opponent-effect departure by trashing two same-level cards from
its own stack.

`EX5-073.ts` is compiled IR and registers exclusively through
`registerIrCard("EX5-073", compiled)`. The IR contains the two static
keywords, the DNA-gated eight-card cross-stack trash action, the unconditional
matching-count delete on both relevant triggers, and the self-scoped
same-level replacement cost. Coverage is full with no residual clauses.

#### Rulings and behavioral proof

`EX5-073.test.ts` covers:

- Exact catalog identity, DNA requirements, keywords, full IR metadata, and
  the absence of an accidental DNA condition on the follow-up delete.
- A direct `canPayCost` peer check proving cards from another Digimon's stack
  cannot pay the replacement cost.
- Public zero-cost DNA digivolution with eight cards trashed across two
  opponent stacks, followed by deletion of the eligible lower-stack target.
- The fewer-than-eight boundary, proving the action trashes as many available
  opposing evolution cards as possible before deletion.
- Public opponent-effect deletion and exact same-level cards trashed from
  GraceNovamon's own stack, preserving the Digimon in play.
- A public attack without DNA digivolution, proving the When Attacking delete
  remains active and compares the opposing stack against the source stack.

The behavioral cases use public play, DNA digivolution, attack, and opponent
play intents. No injected timing or internal deletion verb is used.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-073.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped static checks:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-073.ts apps/api/src/cards/EX5/EX5-073.test.ts docs/audits/EX5-reaudit/EX5-073.md
git diff --check -- apps/api/src/cards/EX5/EX5-073.ts apps/api/src/cards/EX5/EX5-073.test.ts docs/audits/EX5-reaudit/EX5-073.md
```

No ledger, RUN, engine, shared, or catalog files were changed.

#### Worker score (maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Catalog identity, DNA route, keywords, replacement, and stack-count rule are documented. |
| IR trace | 2/2 | Both triggers, DNA condition, cross-stack trash, matching delete, replacement cost, and registration are mapped. |
| Behavioral proof | 2/2 | Public DNA, boundary, deletion replacement, and attack endpoints are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Same-level self-stack cost, cross-stack eight-card removal, and lower/equal stack targeting are covered. |
| Delivery gates | 0/2 | Coordinator-owned focused execution and collection gates remain pending. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

### EX5-074 — Fanglongmon

#### Contract and IR trace

The committed catalog identifies EX5-074 as the yellow level-7 Mega
Fanglongmon, 15000 DP, play cost 15, with the yellow level-6 / 6-memory
evolution route. Its On Play and When Attacking effect returns up to four
Deva/Four Sovereigns cards from its controller's trash to the bottom of the
deck and gives every opposing Digimon -4000 DP for the turn per returned card.
Its second When Attacking clause trashes one opposing security card per own
Four Sovereigns Digimon. The All Turns clause makes Fanglongmon unaffected by
opponent Digimon effects.

`EX5-074.ts` is compiled IR and registers exclusively through
`registerIrCard("EX5-074", compiled)`. It uses the generated card IR with the
per-card DP scaling tied to the number of cards actually returned, and replaces
the generated continuous clause with a permanent static immunity grant scoped
to this Digimon. Coverage is full with no residual clauses.

#### Rulings and behavioral proof

`EX5-074.test.ts` covers:

- Exact catalog identity, statistics, evolution cost, printed effect boundary,
  and full IR metadata.
- A public attack with two own Four Sovereigns, proving exactly two security
  cards are trashed; the no-Four-Sovereigns peer leaves security unchanged.
- Public On Play return of two qualifying trash cards and exact -8000 DP
  scaling, plus the one-card attack return and -4000 DP boundary.
- Public observation of immunity to an opponent Digimon effect, with the
  Fanglongmon DP endpoint unchanged.

All behavioral evidence uses public play and attack intents plus the observer's
public restriction view. No injected timing or internal effect verb is used.

#### Verification status

Per the card-lane instruction, Vitest, typecheck, and broad suites were not
run. The coordinator must schedule the focused serial test:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX5/EX5-074.test.ts --maxWorkers=1 --no-file-parallelism
```

Scoped static checks:

```text
pnpm exec oxfmt --check apps/api/src/cards/EX5/EX5-074.ts apps/api/src/cards/EX5/EX5-074.test.ts docs/audits/EX5-reaudit/EX5-074.md
git diff --check -- apps/api/src/cards/EX5/EX5-074.ts apps/api/src/cards/EX5/EX5-074.test.ts docs/audits/EX5-reaudit/EX5-074.md
```

No ledger, RUN, engine, shared, or catalog files were changed.

#### Worker score (maximum 8/10)

| Rubric column | Score | Evidence |
| --- | ---: | --- |
| Catalog / rules | 2/2 | Printed return/scaling, security-trash, and Digimon-effect immunity clauses are documented. |
| IR trace | 2/2 | Return provenance, paid-count DP scaling, security scaling, immunity scope, and registration are mapped. |
| Behavioral proof | 2/2 | Public attack, On Play, one-card boundary, and immunity endpoints are asserted; execution is coordinator-pending. |
| Peer / stack proof | 2/2 | Two-versus-zero Four Sovereigns and two-versus-one trash-return cases cover scaling boundaries. |
| Delivery gates | 0/2 | Coordinator-owned focused execution and collection gates remain pending. |

**Worker score: 8/10 pending the coordinator's focused serial run.**


#### Coordinator final gate — 2026-09-09

Supersedes worker-pending notes above: the coordinator ran the complete EX5 collection serially (74 files, 548 tests), with all tests passing. Workspace typecheck, mechanism and broad-engine suites, synchronized-effects verification, scoped Oxlint/Oxfmt, and `git diff --check` are green. Final score: **10/10**.

## Mechanisms

No mechanism report was produced for EX5.

### Review notes and closed investigations

#### Coordinator decisions

- Printed behavior and locally indexed rules are the contract.
- Existing EX5 audit documents are historical context only, not current evidence.
- Card modules must register exclusively through `registerIrCard(cardId, compiled)`.

#### Engine seam queue

- None open.

#### Resolved investigations

- `EX5-001-Q5393-STACK-ROTATION` was a fixture legality error, not an engine defect. After rotation promotes level-2 Sunmon, Q5393 requires a level-3 destination; the retained red incorrectly used level-4 `BT1-014`. The public path passes with legal `BT1-013`, and `EX5-001-Q5393-MECHANISM.md` records the projected-base mechanics.
- `EX5-007-Q3528-OPT-IDENTITY` was a test expectation error, not an engine defect. Once Per Turn identity follows each physical source copy. Two EX5-007 copies may each activate once; after stack rotation cycles the first physical copy back into inherited scope, its second same-turn use remains blocked. A proposed permanent-level tracker was rejected because it incorrectly collapsed independent copies; all production engine edits were removed.

#### Fixture traps

- No Digi-Egg cards in deck or security.
- Injected timing is structural proof only.

## Knowledge base index

Generated from `node tools/kb/query.mjs card <ID>` on 2026-09-09. Each card report must cover every listed Q&A id or document why it is not behaviorally testable.

| Card | Q&A ids | Status |
| --- | --- | --- |
| EX5-001 | Q3526, Q5393 | Covered by public EX5-007 and EX5-064 stack-rotation proof |
| EX5-002 | None returned | Covered; catalog/rules reviewed and no card Q&A returned |
| EX5-003 | None returned | Covered; catalog/rules reviewed and no card Q&A returned |
| EX5-004 | None returned | Covered; catalog/rules reviewed and no card Q&A returned |
| EX5-005 | None returned | Covered; catalog/rules reviewed and no card Q&A returned |
| EX5-006 | None returned | Covered; catalog/rules reviewed and no card Q&A returned |
| EX5-007 | Q3526, Q3527, Q3528 | Covered by public placement/rotation and per-copy OPT reset proof |
| EX5-008 | Q3529, Q3530 | Covered by public On Play and When Digivolving reveal proof |
| EX5-009 | Q3531, Q3532, Q3533, Q3534, Q3535, Q3536 | Covered by public breeding play, movement and restriction proof; Option-name scope structurally documented |
| EX5-010 | Q3537, Q3538, Q3539, Q3540, Q3541, Q3542 | Covered by public breeding play, movement, restriction and deletion proof |
| EX5-011 | Q3543, Q3544, Q3545, Q3546, Q3547, Q3548 | Covered by public breeding play, movement, restriction and conditional deletion proof |
| EX5-012 | Q3549 | Covered by intrinsic destination-vs-source cost-reduction proof |
| EX5-013 | Q3550 | Covered by public inclusive Deva/DP cost and boundary proof |
| EX5-014 | Q3551 | Covered by public multi-check security timing and OPT proof |
| EX5-015 | Q3552, Q3553, Q3554 | Covered by public reveal/add and battle-replacement proof |
| EX5-016 | Q3555, Q3556, Q3557, Q3558, Q3559 | Accepted 10/10; coordinator gates green |
| EX5-017 | Q3560, Q3561 | Covered by public mandatory reveal/add paths and order proof |
| EX5-018 | Q3562 | Accepted 10/10; coordinator gates green |
| EX5-019 | Q3563, Q3564, Q3565, Q3566, Q3567, Q3568 | Accepted 10/10; coordinator gates green |
| EX5-020 | Q3569 | Accepted 10/10; coordinator gates green |
| EX5-021 | Q3570, Q3571, Q3572, Q3573, Q3574, Q3575, Q3576, Q5503, Q5504, Q5505, Q5506 | Accepted 10/10; coordinator gates green |
| EX5-022 | Q3577, Q3578, Q3579, Q3580, Q3581, Q3582 | Accepted 10/10; coordinator gates green |
| EX5-023 | Q3583 | Accepted 10/10; coordinator gates green |
| EX5-024 | None returned | Accepted 10/10; coordinator gates green |
| EX5-025 | Q3584, Q3585, Q3586, Q3587 | Accepted 10/10; coordinator gates green |
| EX5-026 | Q3588, Q3589, Q3590 | Accepted 10/10; coordinator gates green |
| EX5-027 | Q3591 | Accepted 10/10; coordinator gates green |
| EX5-028 | Q3592 | Accepted 10/10; coordinator gates green |
| EX5-029 | Q3593 | Accepted 10/10; coordinator gates green |
| EX5-030 | Q3594 | Accepted 10/10; coordinator gates green |
| EX5-031 | Q3595, Q3596 | Accepted 10/10; coordinator gates green |
| EX5-032 | None returned | Accepted 10/10; coordinator gates green |
| EX5-033 | Q3597, Q3598, Q3599 | Accepted 10/10; coordinator gates green |
| EX5-034 | Q3600 | Accepted 10/10; coordinator gates green |
| EX5-035 | None returned | Accepted 10/10; coordinator gates green |
| EX5-036 | None returned | Accepted 10/10; coordinator gates green |
| EX5-037 | Q3601, Q3602, Q3603, Q3604, Q3605, Q3606, Q3607, Q5507, Q5508, Q5509, Q5510 | Accepted 10/10; coordinator gates green |
| EX5-038 | Q3608, Q3609, Q3610, Q3611, Q3612, Q3613 | Accepted 10/10; coordinator gates green |
| EX5-039 | Q3614 | Accepted 10/10; coordinator gates green |
| EX5-040 | Q3615, Q3616, Q3617, Q3618, Q3619, Q3620 | Accepted 10/10; coordinator gates green |
| EX5-041 | None returned | Accepted 10/10; coordinator gates green |
| EX5-042 | None returned | Accepted 10/10; coordinator gates green |
| EX5-043 | Q3621, Q3622 | Accepted 10/10; coordinator gates green |
| EX5-044 | None returned | Accepted 10/10; coordinator gates green |
| EX5-045 | None returned | Accepted 10/10; coordinator gates green |
| EX5-046 | Q3623, Q3624 | Accepted 10/10; coordinator gates green |
| EX5-047 | None returned | Accepted 10/10; coordinator gates green |
| EX5-048 | Q3625 | Accepted 10/10; coordinator gates green |
| EX5-049 | None returned | Accepted 10/10; coordinator gates green |
| EX5-050 | Q3626, Q3627, Q3628, Q3629, Q3630, Q3631 | Accepted 10/10; coordinator gates green |
| EX5-051 | Q3632, Q3633, Q3634, Q3635, Q3636, Q3637 | Accepted 10/10; coordinator gates green |
| EX5-052 | Q3638, Q3639, Q3640, Q3641, Q3642, Q3643 | Accepted 10/10; coordinator gates green |
| EX5-053 | Q3644, Q3645 | Accepted 10/10; coordinator gates green |
| EX5-054 | Q3646, Q3647 | Accepted 10/10; coordinator gates green |
| EX5-055 | Q3648 | Accepted 10/10; coordinator gates green |
| EX5-056 | Q3649 | Accepted 10/10; coordinator gates green |
| EX5-057 | Q3650 | Accepted 10/10; coordinator gates green |
| EX5-058 | Q3651, Q3652, Q3653, Q3654, Q3834, Q6034 | Accepted 10/10; coordinator gates green |
| EX5-059 | Q3655, Q3656 | Accepted 10/10; coordinator gates green |
| EX5-060 | Q3657, Q3658, Q3659, Q4663, Q4664, Q4667, Q4668, Q4671, Q4672, Q4675, Q4676, Q5227, Q5228 | Accepted 10/10; coordinator gates green |
| EX5-061 | Q3660 | Accepted 10/10; coordinator gates green |
| EX5-062 | Q3661, Q3662, Q3663, Q3664, Q3665 | Accepted 10/10; coordinator gates green |
| EX5-063 | Q3666, Q3667, Q4735, Q6035, Q6036, Q6037, Q6038, Q6039 | Accepted 10/10; coordinator gates green |
| EX5-064 | Q3668, Q4931, Q5212, Q5393 | Accepted 10/10; coordinator gates green |
| EX5-065 | Q3669, Q3670 | Accepted 10/10; coordinator gates green |
| EX5-066 | Q3671 | Accepted 10/10; coordinator gates green |
| EX5-067 | Q3672, Q3673 | Accepted 10/10; coordinator gates green |
| EX5-068 | None returned | Accepted 10/10; coordinator gates green |
| EX5-069 | Q3674, Q3675, Q3676, Q3677, Q3678, Q4735 | Accepted 10/10; coordinator gates green |
| EX5-070 | Q3679, Q3680, Q3681, Q3682, Q4260 | Accepted 10/10; coordinator gates green |
| EX5-071 | Q3683, Q3684 | Accepted 10/10; coordinator gates green |
| EX5-072 | Q3685 | Accepted 10/10; coordinator gates green |
| EX5-073 | Q3686, Q3687, Q3688, Q3689 | Accepted 10/10; coordinator gates green |
| EX5-074 | Q3690, Q3691 | Accepted 10/10; coordinator gates green |

## Open items

- No card is below 10/10 and the engine seam queue is empty (`docs/audits/EX5-reaudit/REVIEW-NOTES.md`, `8d9fb67af`).
- EX5-001: the suite does not claim a public same-turn/next-turn reset proof for the once-per-turn ledger. The structural `frequency: "OncePerTurn"` assertion passes and the limitation is documented rather than replaced with an artificial reset fixture (`docs/audits/EX5-reaudit/EX5-001.md`).
- Missing evidence file: `docs/audits/EX5-reaudit/REVIEW-NOTES.md` cites `EX5-001-Q5393-MECHANISM.md` as the record of the projected-base rotation mechanics, but no such file existed in `docs/audits/EX5-reaudit/` at `8d9fb67af`. The Q5393 conclusion survives only in the EX5-001 card section above.
- Contradiction, resolved in favour of the newer source: `docs/audits/EX5-AUDIT.md` (2026-09-04, `8857d0f00`) reports per-card focused test counts that are lower than the re-audit's (for example EX5-001 "focused 3/3" against the re-audit's 6 tests). The 2026-09-09 re-audit ledger wins; the older counts belong to the superseded pass.
- Interruption recorded during the run, since resolved: a full disk temporarily blocked atomic writes. Only ignored, reproducible `apps/api/dist` build output was removed (`docs/audits/EX5-reaudit/RUN.md`).

## History

- `docs/audits/EX5-AUDIT.md` — last at `8857d0f00`, 2026-09-04. Two-agent source-audit ledger for EX5-001..074 with catalog, KB, module, registration and runtime evidence per card. Superseded by the 2026-09-09 re-audit.
- `docs/audits/EX5-REAUDIT-LEDGER.md` — last at `1edc556bf`, 2026-09-09. Winning scoring table; merged into the Card ledger section above.
- `docs/audits/EX5-reaudit/` — last at `8d9fb67af`, 2026-09-09. 74 per-card reports plus `KB-INDEX.md`, `RUN.md`, `REVIEW-NOTES.md` and `WORKER-BRIEF.md`; all merged above except the worker brief, which was process instruction only.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX5: commit `737e4fd80`.
