---
set: EX6
cards: 74
status: verified
verified_at: 2026-09-09
catalog_commit: e540204fb
evidence_commit: eabe99351
---

# EX6 audit

## Status

All 74 EX6 cards are verified at 10/10 (aggregate 740/740). The winning source is the Luna re-audit closed on 2026-09-09 (`docs/audits/EX6-REAUDIT-LEDGER.md` and `docs/audits/EX6-reaudit/`, both last at `0c3b8f6a1`), which required fresh per-card evidence and fresh gates and treated earlier audit claims as context only. It supersedes two earlier reports: `docs/audits/EX6-AUDIT.md` (2026-09-04, `3bf5a5466`), which closed at 74/74 files and 365/365 tests, and `docs/audits/EX6-LUNA-REAUDIT.md` (2026-08-27, `d9d57ae08`), which corrected five cards but explicitly ran no Vitest or typecheck after a user instruction and therefore never claimed a behavioral gate. Two engine seams were reported during the run and both closed without a production engine divergence; the granted-effect library gained Phantom Pain's compiler token. No source reconciliation discrepancy was recorded.

## Gates

Copied from `docs/audits/EX6-reaudit/RUN.md` (`0c3b8f6a1`), section "Checkpoints", and from `docs/audits/EX6-TEST-QUEUE.md` (`eb1a58b75`) for the collection command shape.

Baseline:

- Static inventory: 74 catalog entries, 74 direct modules, 74 colocated tests, 74 `registerIrCard` registrations, 0 `registerCard` registrations.
- `pnpm install --frozen-lockfile` passed; `pnpm --filter @aegis/shared build` passed.
- Fresh focused collection: 74 files, 365 tests; 73 files / 364 tests passed with one reproduced behavioral failure in `EX6-018` at `EX6-018.test.ts:122`.
- Fresh root `pnpm typecheck`: passed for shared, API, and web.

Final gates:

- Final focused collection gate: 74/74 files and 404/404 tests passed with `--maxWorkers=1 --no-file-parallelism`.
- Final broad mechanism/collection gate: 203/203 files and 2456/2456 tests passed with `--maxWorkers=1 --no-file-parallelism`.
- EX6-070 and the shared aura ownership seam passed 11/11 tests, including Q3820 and Q4255.
- Final `effects:check:set`: 74 records synchronized, 5 semantic changes against base, zero semantic or byte changes outside EX6.
- Final root `pnpm typecheck`, changed-file Oxlint/Oxfmt checks, registration sweep, skipped-test sweep, and `git diff --check`: passed.
- Implementation and test commits `05bbfa764` and `c5024c049`; audit artifacts `1dc8e722b`, pushed to `origin/audit-ex6-luna-20260909`.

Collection command recorded in `docs/audits/EX6-TEST-QUEUE.md`:

```sh
pnpm --filter @aegis/api exec vitest run src/cards/EX6 --pool=forks --poolOptions.forks.singleFork=true --fileParallelism=false
```

## Card ledger

Scores are the final ones from `docs/audits/EX6-REAUDIT-LEDGER.md`; the per-card sections merge the reports in `docs/audits/EX6-reaudit/`. Card reports were written by worker lanes that could not award delivery gates, so many of them still read "8/10", "provisional", or "pending final coordinator gate". Those notes are superseded by the table below and by the Gates section: the coordinator awarded the delivery points after the closing gates passed, and every card is 10/10.

| Card    | Status | Catalog/rules | IR trace | Behavioral proof | Peer/stack proof | Delivery gates | Total | Report                           |
| ------- | ------ | ------------: | -------: | ---------------: | ---------------: | -------------: | ----: | -------------------------------- |
| EX6-001 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-002 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-003 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-004 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-005 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-006 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-007 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-008 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-009 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-010 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-011 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-012 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-013 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-014 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-015 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-016 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-017 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-018 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-019 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-020 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-021 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-022 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-023 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-024 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-025 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-026 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-027 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-028 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-029 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-030 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-031 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-032 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-033 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-034 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-035 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-036 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-037 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-038 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-039 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-040 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-041 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-042 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-043 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-044 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-045 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-046 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-047 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-048 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-049 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-050 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-051 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-052 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-053 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-054 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-055 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-056 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-057 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-058 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-059 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-060 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-061 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-062 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-063 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-064 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-065 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-066 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-067 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-068 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-069 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-070 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-071 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-072 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-073 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |
| EX6-074 | Complete | 2 | 2 | 2 | 2 | 2 | 10/10 | see below |

### EX6-001 — Sakuttomon

- Catalog contract: red level-2 Digi-Egg, `Weapon`; inherited `[Your Turn] [Once Per Turn]`, when an effect places a `Legend-Arms` card under this Digimon, gain 1 memory.
- KB: no card-specific entry.
- IR mapping: inherited `YourTurn` `SubTrigger(onAddDigivolutionCards)` is self-bound, requires `byEffect: true` and `Legend-Arms`, then `GainMemory(1)`; `coverage: full`, `residual: []`, exclusive `registerIrCard`.
- Behavioral proof: tests cover matching versus non-matching placement and once-per-turn behavior through public setup/settle observations; 2/2 passed.
- Peer/stack proof: compared with EX6-007/008/009 Legend-Arms stack-placement watchers; trigger source and inherited host are preserved when stacked.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-001.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 2 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-002 — Yokomon

- Catalog contract: blue level-2 Digi-Egg; inherited `[When Attacking] [Once Per Turn]` may place one blue level-3 Digimon from hand as this Digimon's bottom source.
- KB: no card-specific entry.
- IR mapping: inherited once-per-turn `WhenAttacking` optional `PlaceUnder` filters controller-owned hand, Digimon, blue, level 3, exact self host, bottom position.
- Behavioral proof: tests prove one eligible card, bottom placement, optional refusal, and rejection of non-blue level 3; 3/3 passed.
- Peer/stack proof: compared with EX6-001 and EX6-007–009 placement watchers; attack source follows the inherited host and the stack transition is observable.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-002.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 3 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-003 — Cupimon

- Catalog contract: yellow level-2 Digi-Egg; inherited `[When Attacking] [Once Per Turn]` adds the top security card to hand, then may place one Digimon with `Angel`/`Archangel`/`Three Great Angels` at security bottom.
- KB: Q3692 says the added security card can activate “added” effects; Q3693 says the removed card can activate “removed” effects.
- IR mapping: inherited once-per-turn sequence is `SecurityManipulation(toHand, top)` followed by optional `placeAsSecurity` from hand with the exact three-trait union and bottom destination; full coverage and no residual.
- Behavioral proof: tests cover exchange ordering, eligible Angel-family selection, and no illegal non-Angel placement; 3/3 passed.
- Peer/stack proof: compared with EX6-017/020/021 Angel-family filters and exercised on an inherited host; security events use normal movement primitives supporting Q3692/Q3693.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-003.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 3 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-004 — Kokomon

- Catalog contract: green level-2 Digi-Egg; inherited `[Your Turn] [Once Per Turn]`, when an effect suspends one of your Digimon, one of your Digimon gets +2000 DP for the turn.
- KB: no card-specific entry.
- IR mapping: inherited `YourTurn` `SubTrigger` listens to effect-caused suspension of a controller-owned Digimon, then targets one controller-owned Digimon for `ModifyDP(+2000, forTheTurn)`.
- Behavioral proof: tests cover effect-caused suspension, choosing another friendly Digimon, and controller scoping; 4/4 passed.
- Peer/stack proof: compared with EX6-001/007/008 inherited stack triggers; suspension is tied to the effect event, not merely the suspended card or this host.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-004.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-005 — Kakkinmon

- Catalog contract: black level-2 Digi-Egg; inherited `[Start of Your Main Phase]`, by returning one `Legend-Arms` card from this Digimon's sources to hand, gain 1 memory.
- KB: no card-specific entry.
- IR mapping: inherited `StartOfYourMainPhase` optional source-stack `return` cost filters any `Legend-Arms` card (not only Digimon), then `GainMemory(1)`; full coverage and no residual.
- Behavioral proof: tests cover a matching source, exact memory gain, and a non-Digimon Legend-Arms source; 3/3 passed.
- Peer/stack proof: compared with EX6-001 and EX6-007–010 source-stack placement/evolution semantics; the returned instance is removed from the host stack and remains observable in hand.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-005.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 3 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-006 — Gate of Deadly Sins

- Catalog contract: purple Digi-Egg; breeding start-of-main places the top Digi-Egg under itself, deletes all your Digimon, and if this effect deleted, places one `Seven Great Demon Lords` card from trash beneath it. At opponent-turn end, by deleting this stack with 7+ distinct names, may play `Ogudomon` from trash free. Inherited breeding your-turn once per turn: may reduce a Seven Great Demon Lords Digimon play by 3, or by 4 with 5+ distinct source names.
- KB: Q3694 requires deleting all your Digimon even with an empty Digi-Egg deck; Q3695/Q3696 define distinct names and count Gate itself; Q3697 permits overlapping copies; Q3698 says inherited reduction is optional; Q3699 allows effect-play; Q3700 permits choosing -3 despite 5+ names.
- IR mapping: `StartOfYourMainPhase` places egg, deletes all, then conditionally places the Seven Great Demon Lords source; `EndOfOpponentsTurn` pays delete-own and checks distinct names before `PlayWithoutCost(Ogudomon)`; inherited replacement offers independent -3/-4 reductions with once-per-turn identity.
- Behavioral proof: tests cover empty egg deck/Q3694, post-delete placement, 7-name Ogudomon revival, and reduction choice; 5/5 passed.
- Peer/stack proof: compared with EX6-011 and EX6-018 trash/play-from-stack paths; distinct-name source stack is observed rather than inferred from card count.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-006.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 5 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-007 — Zubamon

- Catalog contract: red level-3 `Weapon`/`Legend-Arms`; alternate digivolve from Sakuttomon/Kakkinmon for 0; hand main by paying 1 and placing this card under a level-3 or Legend-Arms Digimon gives that host +4000 DP; your-turn once per turn stack placement draws 1; inherited your-turn +2000 DP.
- KB: Q3701 forbids paying 1 without a legal level-3/Legend-Arms host.
- IR mapping: alternate evolution requirement is explicit; hand `Main` uses `payMemory(1)` plus permanent placement under exact level/trait host and `ModifyDP(+4000, turn)`; stack watcher draws once; inherited `ModifyDP(+2000)`.
- Behavioral proof: tests cover structural cost/placement, paid placement and DP, once-per-turn draw, inherited bonus, and no-host refusal; 4/4 passed.
- Peer/stack proof: compared with EX6-008/009 hand-placement costs and EX6-001/004 stack watchers; host/source identities remain observable after placement.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-007.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-008 — ZubaEagermon

- Catalog contract: red level-4 `Weapon`/`Legend-Arms`; digivolves from level 3 Legend-Arms for 2; hand main pays 1 to place under a level-4 or Legend-Arms host for +4000 DP; your-turn once per turn stack placement grants Raid and Piercing for the turn; inherited your-turn +2000 DP.
- KB: Q3702 forbids paying 1 without a legal level-4/Legend-Arms host.
- IR mapping: explicit alternate evolution requirement; hand placement and +4000 turn DP; stack `SubTrigger` grants Raid/Piercing once per turn; inherited +2000 DP.
- Behavioral proof: tests cover paid placement, host level boundary, turn buffs, add-under trigger, inherited DP, and no-host refusal; 5/5 passed.
- Peer/stack proof: compared with EX6-007 and EX6-009 shared Legend-Arms placement and watcher semantics; tests observe the resulting stack and keyword grants.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-008.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 5 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-009 — Duramon

- Catalog contract: red level-5 `Weapon`/`Legend-Arms`; level-4 Legend-Arms evolution for 3; hand main pays 2 to place under level-5 or Legend-Arms host for Security Attack +1; your-turn once per turn stack placement grants Raid/Piercing; inherited once per turn when attack target switches, trash opponent's top security.
- KB: Q3703 forbids paying 2 without a legal level-5/Legend-Arms host.
- IR mapping: hand payment/placement and turn Security Attack +1; add-under watcher grants Raid/Piercing; inherited attack-target-switch watcher trashes one opponent security once per turn.
- Behavioral proof: tests cover paid placement, exact host boundary, target-switch security trash and once-per-turn reset, add-under keywords, and no-host refusal; 5/5 passed.
- Peer/stack proof: compared with EX6-007/008 placement and EX6-010 security/attack interactions; inherited source identity survives an evolution stack.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-009.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 5 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-010 — Durandamon

- Catalog contract: red level-6 `Holy Sword`/`Legend-Arms`; level-5 Legend-Arms evolution for 4; hand main pays 3 and places under level-6/Legend-Arms host to delete an opposing Digimon at or below that host's DP; Raid, Piercing; when digivolving one of your Digimon may attack; inherited Piercing and RagnaLoardmon security-effect suppression.
- KB: Q3704 requires a legal host for the hand cost; Q3705 rejects suspended/just-played attackers; Q3706 says security effects are suppressed before battle even if the host later loses.
- IR mapping: payment binds the placement host and scales deletion DP; static keywords, conditional inherited `DisableSecurityEffect` exact-name gate, and public `WhenDigivolving` attack are present.
- Behavioral proof: 13 tests cover hand payment, level/trait boundaries, DP deletion, attack legality, Raid/Piercing, security suppression and negative cases; 13/13 passed.
- Peer/stack proof: compared with EX6-009/RagnaLoardmon and exercised both level-6 and Legend-Arms hosts, including a RagnaLoardmon stack in security checks.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-010.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 13 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-011 — RagnaLoardmon

- Catalog contract: red/black level-7 `Unique`/`Legend-Arms`; Blast DNA Digivolve from Durandamon + BryweLudramon; Raid and Reboot; On Play/When Digivolving trash opponent top security, become unaffected by opponent effects through their turn, and if DNA digivolving De-Digivolve 1 all opponent Digimon then delete one.
- KB: Q3707 confirms protection applies even with zero opponent security.
- IR mapping: Counter keyword encodes Blast DNA; static Raid/Reboot; both play/evolution triggers trash security, grant protection, and condition De-Digivolve/delete on `isDnaDigivolving`; exact DNA requirement is present.
- Behavioral proof: tests cover keywords, normal play security trash, public DNA evolution with tail, zero-security protection, and public Raid/Reboot; 6/6 passed using BT1-009/010 inert security cards.
- Peer/stack proof: compared with EX6-010 Durandamon and DNA stack behavior; the test observes material stack and DNA-only tail rather than injected timing.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-011.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 6 tests passed.
- Defects/gaps: test fixtures corrected from Digi-Egg BT1-001/002 to inert main-deck BT1-009/010; card behavior unchanged.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-012 — Biyomon

- Catalog contract: blue level-3 Bird; Blocker; inherited Jamming.
- KB: no card-specific entry.
- IR mapping: static Blocker and inherited static Jamming keyword entries; `coverage: full`, no residual, exclusive `registerIrCard`.
- Behavioral proof: tests expose Blocker on top and inherited Jamming after stacking; 2/2 passed.
- Peer/stack proof: compared with EX6-013/014 blue evolution stack fixtures and verified top-versus-inherited keyword visibility.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-012.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 2 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-013 — Xiquemon

- Catalog contract: blue level-4 Avian/Aquatic; On Play Draw 1, and if played from sources gain 1 memory; Rule trait adds Aquatic; inherited Jamming.
- KB: Q3708 confirms Draw 1 still resolves when played from sources, alongside the memory gain.
- IR mapping: On Play has unconditional `Draw(1)` plus `playedFromZone(digivolutionCards)` `GainMemory(1)`; Rule grants Aquatic; inherited Jamming.
- Behavioral proof: tests cover hand draw, public source play with memory, Rule trait, and inherited keyword; 4/4 passed with inert BT1-009 deck cards.
- Peer/stack proof: compared with EX6-012 Jamming and EX6-014 source-play from blue stacks; source-zone condition is observed independently from draw.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-013.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Defects/gaps: test fixtures corrected from Digi-Egg BT1-001 to inert main-deck BT1-009; no implementation gap.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-014 — Huankunmon

- Catalog contract: blue level-5 Aquatic; On Play/When Digivolving may play a level-3 blue Digimon from one of your blue Digimon's sources free; inherited `[When Attacking] [Once Per Turn]` may place another blue Digimon under this Digimon to unsuspend it.
- KB: no card-specific entry.
- IR mapping: both play/evolution triggers use optional `PlayWithoutCost` filtered to level-3 blue source cards; inherited attack uses optional permanent placement cost filtered to other blue Digimon and `Unsuspend`.
- Behavioral proof: tests cover source play and inherited placement/unsuspend on public intents; 4/4 passed.
- Peer/stack proof: compared with EX6-013 source-play and EX6-015 blue-stack placement; host/source ownership and “other” exclusion are observed.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-014.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-015 — Xiangpengmon

- Catalog contract: blue level-6 Aquatic; On Play/When Digivolving may place up to 3 other blue Digimon under itself, then return all other level 4 or lower Digimon to owners' hands, increasing the return level ceiling by each placed card; your-turn once per turn may play a level 5 or lower Aqua/Sea Animal source when an effect adds a source; Rule trait Aquatic.
- KB: Q3709 requires returning your own eligible Digimon too; Q3710 returns each card to its owner's hand; Q3711 permits the return clause even when zero cards were placed.
- IR mapping: On Play and evolution sequence `PlaceUnder(upTo 3, other blue)` then scaled `Return(level 4 + placed count, all other)`; inherited watcher plays level <=5 Aqua/Sea Animal from this stack; Rule grants Aquatic.
- Behavioral proof: tests cover placement, scaled return including own board, source play, once-per-turn and trait semantics; 4/4 passed.
- Peer/stack proof: compared with EX6-014 source play and EX6-013 Aquatic rule; tests observe stack relocation before return and owner-specific hand destinations.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-015.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-016 — Salamon

- Catalog contract: yellow level-3 Mammal; start of main gains 1 memory if you have a purple Digimon or Tamer; inherited attack once per turn gives an opposing Digimon -2000 DP for the turn.
- KB: no card-specific entry.
- IR mapping: `StartOfYourMainPhase` condition `youHave` purple Digimon/Tamer then `GainMemory(1)`; inherited once-per-turn `WhenAttacking` targets one opposing Digimon with `ModifyDP(-2000, forTheTurn)`.
- Behavioral proof: tests cover positive and negative purple presence and inherited DP reduction; 4/4 passed.
- Peer/stack proof: compared with EX6-019/020 yellow inherited attack debuffs and checked the effect through a real stack host.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-016.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-017 — Luxmon

- Catalog contract: yellow level-3 Angel; On Play reveals 3, adds one Digimon with Angel/Archangel and one card with Three Great Angels when available, bottoms the rest; inherited attack once per turn draws 1 if this Digimon has Angel/Archangel/Three Great Angels.
- KB: Q3712 permits adding only the available bucket; Q3713 requires adding both available buckets rather than declining one.
- IR mapping: `RevealAdd(3)` has two distinct add buckets (Angel/Archangel Digimon and Three Great Angels) and bottoms rest; inherited conditional draw checks the exact trait union.
- Behavioral proof: tests cover both buckets, one-bucket-only, bottoming unmatched cards, inherited trait gate and one draw; 6/6 passed with inert BT1-009 deck cards.
- Peer/stack proof: compared with EX6-020/021 Angel-family filters and tested the inherited effect on a trait-bearing host versus a non-matching host.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-017.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 6 tests passed.
- Defects/gaps: test fixtures corrected from Digi-Egg BT1-001 to inert main-deck BT1-009; no implementation gap.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-018 — Lucemon

- Catalog contract: yellow level-3 Angel; alternate evolution from Cupimon for 5; when played, reduce play cost by 5 if you have no level 5 or lower Digimon; On Play and start of main reveal 3 and add one Angel/Archangel/Three Great Angels/Seven Great Demon Lords trait card, trashing the rest; end of your turn once per turn, by placing one level-6 Digimon on top of security, may digivolve into exact Lucemon: Chaos Mode from trash for free.
- KB: Q3714 applies cost reduction even effect-played; Q3715 permits paying the security cost without Chaos Mode in trash; Q3716 permits declining the optional evolution after paying; Q5002 preserves evolution requirements for BT7-111.
- IR mapping: nested play-cost replacements implement the level <=5 absence gate; On Play and start-main `RevealAdd(3)` use the four-trait union and trash rest; `EndOfYourTurn` `CostGatedBlock` pays permanent level-6 top-security placement, then optional exact-name trash `Digivolve` with `allowNoTarget: true`.
- Behavioral proof: 9 tests cover cost reduction, both reveals, security payment, successful exact Chaos Mode evolution, no-target Q3715 path, optional decline, and final zones; 9/9 passed.
- Peer/stack proof: compared with EX6-006 trash-stack play and EX6-017/020 trait searches; the level-6 instance moves to security before the optional evolution, and revert of `allowNoTarget` reproduces the known failure.
- Defect fixed: added `allowNoTarget: true` to the optional trash Digivolve so the mandatory printed security cost is not suppressed when Chaos Mode is absent; no engine seam retained. Test fixtures corrected from Digi-Egg BT1-001 to inert BT1-009.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-018.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 9 tests passed before the RAM pause; no further tests started.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-019 — Angemon

- Catalog contract: yellow level-4 Angel with Barrier; inherited attack once per turn draws 1 if this Digimon has Angel/Archangel/Three Great Angels.
- KB: no card-specific entry.
- IR mapping: static Barrier and inherited conditional once-per-turn draw with exact Angel-family trait union.
- Behavioral proof: tests cover Barrier visibility, draw on matching Angel host, and no draw on non-Angel host; 3/3 passed with inert BT1-009 deck cards.
- Peer/stack proof: compared with EX6-017/020 inherited Angel-family filters and checked top/inherited keyword visibility in a stack.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-019.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 3 tests passed.
- Defects/gaps: test fixtures corrected from Digi-Egg BT1-001 to inert main-deck BT1-009; no implementation gap.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-020 — Gatomon

- Catalog contract: yellow level-4 Holy Beast; On Play/When Digivolving reveal 3, add one Angel/Archangel/Fallen Angel card and one exact Mirei Mikagura when available, bottoming rest; inherited attack once per turn gives opposing Digimon -2000 DP.
- KB: Q3717 permits one available bucket; Q3718 requires adding both available buckets when both match.
- IR mapping: On Play and evolution each use two `RevealAdd` buckets with Angel-family/Fallen Angel trait and exact name Mirei Mikagura; inherited once-per-turn opposing `ModifyDP(-2000)`.
- Behavioral proof: tests cover both reveal buckets, evolution trigger, one-bucket behavior, inherited debuff and public source evolution; 6/6 passed with inert BT1-009 deck cards.
- Peer/stack proof: compared with EX6-017/018 reveal unions and EX6-016/019 inherited debuffs; source evolution keeps the two independent trigger paths observable.
- Defects/gaps: test fixtures corrected from Digi-Egg BT1-001 to inert main-deck BT1-009; no implementation gap.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-020.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 6 tests passed.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-021 — ArkhaiAngemon

- Catalog contract: yellow level-5 Principality/Angel; On Play/When Digivolving, by adding top or bottom security to hand, give an opposing Digimon -4000 DP for the turn, then may place an Angel/Archangel/Three Great Angels Digimon from hand at security bottom; Rule adds Angel trait; inherited opponent-turn Blocker for all Angel-family Digimon.
- KB: Q3719 says the post-then effects do not activate when security is empty or the security card is not added.
- IR mapping: each play/evolution trigger is a `CostGatedBlock(securityToHand)` followed by -4000 and optional Angel-family bottom security placement; Rule grants Angel; inherited opponent-turn aura grants Blocker to exact trait union.
- Behavioral proof: tests cover top-security payment, bottom/hand placement, empty-security gate, Rule trait and inherited Blocker; 4/4 passed with inert BT1-009 security.
- Peer/stack proof: compared with EX6-003/017/020 Angel-family filters and exercised both play and digivolving paths with source stack observable.
- Defects/gaps: test fixtures corrected from Digi-Egg BT1-001 to inert main-deck BT1-009; no implementation gap.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-021.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-022 — Angewomon

- Catalog contract: yellow level-5 Archangel with Barrier; On Play/When Digivolving, if Mirei Mikagura exists, one opposing Digimon gets Security Attack -2 through opponent turn; otherwise may play Mirei from hand free; inherited all-turns Alliance while this Digimon has Angel or Three Great Angels trait.
- KB: no card-specific entry.
- IR mapping: both play/evolution paths conditionally grant opponent Security Attack -2 when exact Mirei is present, otherwise optional free-play exact Mirei from hand; Barrier static; inherited conditional Alliance aura.
- Behavioral proof: tests cover Barrier, Mirei-present debuff, Mirei-absent free play and inherited condition; 4/4 passed.
- Peer/stack proof: compared with EX6-020 exact Mirei reveal filter and EX6-017/019 inherited Angel-family semantics; conditions are observed on live board/stack state.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-022.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 4 tests passed.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-023 — Gokuumon

- Catalog contract: yellow/red level-5 Beastkin; DigiXros -2 with one of Sanzomon/Sagomon/Cho-Hakkaimon; On Play/When Attacking once per turn one Digimon may gain Security Attack -1 through opponent turn, then if DigiXrosing delete opposing Digimon at 6000 DP or less; all turns when leaving play return one yellow source; inherited attack Security Attack -1.
- KB: Q3720 restricts DigiXros to exactly one listed material; Q3721 makes the delete tail DigiXros-only; Q3722 allows friendly target; Q3723/Q3724 define leave-play including DigiXros; Q3725 fixes material choices before replacement.
- IR mapping: shared once-per-turn On Play/When Attacking effect with optional keyword and `digiXrosCount` delete; exact one-material requirement; all-turn leave-play replacement returns one yellow source; inherited attack keyword.
- Behavioral proof: 8 tests cover material count, normal play, DigiXros delete/DP boundary, source return, friendly selection, inherited effect, and real DigiXros host; 8/8 passed.
- Peer/stack proof: compared with EX6-024/025 shared DigiXros/replacement mechanics; tests observe source return after real stack movement.
- Defects/gaps: none; no catalog discrepancy or retained seam.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-023.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 8 tests passed before the RAM pause.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-024 — Sagomon

- Catalog contract: yellow/blue level-5 Wizard; DigiXros -2 with one Sanzomon/Gokuumon/Cho-Hakkaimon; On Play/When Attacking once per turn one Digimon may gain Security Attack -1, then if DigiXrosing one opposing Digimon/Tamer cannot suspend through their turn; all-turn leave-play returns one yellow source; inherited attack Security Attack -1.
- KB: Q3726 restricts to one material; Q3727 makes restriction DigiXros-only; Q3728 allows friendly target; Q3729–Q3731 define leave-play and fixed choices.
- IR mapping: shared once-per-turn play/attack sequence with optional keyword and DigiXros-gated `Restrict(suspend)` on opposing Digimon/Tamer; exact material requirement; replacement returns yellow source; inherited keyword.
- Behavioral proof: 12 tests cover Digimon/Tamer restriction, no-DigiXros negative, duration, shared use, material count, friendly selection, leave-play and real host; 12/12 passed with inert BT1-009/010 cards.
- Peer/stack proof: compared with EX6-023/025; tests cover normal and real DigiXros stacks and replacement timing.
- Defects/gaps: fixtures corrected from Digi-Egg BT1-001 to inert BT1-009/010; no implementation gap.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-024.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 12 tests passed before the RAM pause.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-025 — Sanzomon

- Catalog contract: yellow level-5 Monk; DigiXros -2 with one Gokuumon/Sagomon/Cho-Hakkaimon; On Play/When Attacking once per turn one Digimon may gain Security Attack -1, then if DigiXrosing reveal 4 and add one each Gokuumon/Sagomon/Cho-Hakkaimon/Shakamon, bottoming rest; all-turn leave-play returns one yellow source; inherited attack Security Attack -1.
- KB: Q3732 restricts to one material; Q3733 makes reveal DigiXros-only; Q3734 allows friendly target; Q3735–Q3737 define leave-play and fixed choices.
- IR mapping: shared once-per-turn play/attack keyword plus DigiXros-gated four named `RevealAdd` buckets; exact material requirement; replacement returns yellow source; inherited keyword.
- Behavioral proof: 10 tests cover normal versus DigiXros reveal, four additions, bottoming rest, friendly target, inherited effect, source return and real host; 10/10 passed with inert BT1-009.
- Peer/stack proof: compared directly with EX6-023/024 and verified normal play, real DigiXros stack, source replacement and shared once-per-turn semantics.
- Defects/gaps: fixture corrected from Digi-Egg BT1-001 to inert main-deck BT1-009; no implementation gap.
- Command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-025.test.ts --maxWorkers=1 --no-file-parallelism` — 1 file, 10 tests passed before the RAM pause.
- Score: 10/10 (catalog/rules 2/2, IR trace 2/2, behavioral 2/2, peer/stack 2/2; delivery gates fixed at 0 in this lane).

### EX6-026 — Cho-Hakkaimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-026`.
- Q&A identifiers: **Q3738–Q3743**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Yellow/black level 5, play cost 7, 7000 DP, evolves from yellow or black level 4 for 3; form `Ultimate`, attribute `Data`, trait `Puppet`. On Play/When Attacking once per turn, any one Digimon may gain Security Attack -1 through the opponent's turn; only on a DigiXros entry it then gives itself +3000 DP and Blocker through that boundary. All Turns when it would leave battle, return one yellow Digimon source from its own stack. DigiXros -2 accepts one of Sanzomon, Gokuumon, or Sagomon; inherited attack repeats the optional any-Digimon modifier.
- Knowledge base: Q3738 confirms the one-of material choice, Q3739 confines the DigiXros tail to entry, Q3740 confirms controller-owned Security Attack targets are legal, and Q3741–Q3743 establish complete leave-play scope including DigiXros placement and forbid material reselection afterward.
- Defects corrected: the three Security Attack actions were improperly limited to controller-owned Digimon and now explicitly target any Digimon. The two printed “may gain” heads are now optional, and the DigiXros record explicitly limits the OR material slot to one card per Q3738. The DigiXros Blocker tail was incorrectly optional on On Play; it is now mandatory, matching the printed “Then” clause, while the self modifier and own-stack yellow return retain their faithful scopes.
- Shared primitive trace: the shared once-per-turn key joins On Play and When Attacking use; `digiXrosCount` guards both self grants so a later attack cannot receive them. Temporary DP and keyword entries expire at the opponent-turn boundary. Host-filtered stack `Return` resolves within the `wouldLeavePlay` replacement, while OR-material selection is covered by the shared DigiXros regression.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-026` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-026.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 11 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-026.ts apps/api/src/cards/EX6/EX6-026.test.ts docs/audits/EX6-reaudit/EX6-026.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-026.ts`, `apps/api/src/cards/EX6/EX6-026.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-027 — Ophanimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-027`.
- Q&A identifiers: **Q3744–Q3746**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Yellow/red level 6 ACE, play cost 7, 12000 DP, alternate digivolution from Angewomon for 3; form `Mega`, traits `Throne` and `Three Great Angels`, with Blast Digivolve and Overflow -4. On Play/When Digivolving, by trashing top or bottom own security, it gives one opposing Digimon -8000 DP through the opponent's turn. All Turns once per turn, removal from its controller's security offers a coupled Security Attack +1-for-turn and attack during the controller's turn, or gives Recovery +1 (Deck) during the opponent's turn.
- Knowledge base: Q3744 prohibits activation of the paid entry effect at zero security. Q3745 says the All Turns attack permission does not bypass normal attack legality, and Q3746 requires the controller either take both the Security Attack grant and attack or take neither.
- Direct IR: the two paid timings each have a positive-own-security activation condition and optional aborting security-trash cost before the -8000 modifier, exactly enforcing Q3744. The `whenSecurityRemoved` watcher defaults its source filter to `mine` in the shared interpreter, so it watches only Ophanimon's controller security; its leading optional `GainKeyword` has `abortOnDecline`, causing the following `Attack` to be skipped as Q3746 requires. The normal Attack primitive retains all ordinary readiness/summoning-sickness legality checks for Q3745. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-027", compiled)`; the colocated suite title now names Ophanimon.
- Shared primitive trace: security trash and security-to-hand paths publish `whenSecurityRemoved` with the affected seat; the watcher gate compares that seat to the source owner. Ordered action resolution aborts a tail when the leading accepted-or-declined gated action produces no effect. `GainKeyword(Recovery)` invokes Recovery’s deck-to-security primitive on the opponent-turn branch; frequency state prevents a second response in the same turn.
- Focused runtime proof: `primitives.test.ts` proves security-to-hand publishes the generic event, interpreter tests prove abort-on-decline tails, and shared attack/recovery/frequency suites cover the downstream mechanics. The colocated suite asserts the IR contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-027` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-027.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-027.ts apps/api/src/cards/EX6/EX6-027.test.ts docs/audits/EX6-reaudit/EX6-027.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-027.ts`, `apps/api/src/cards/EX6/EX6-027.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-028 — Seraphimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-028`.
- Q&A identifiers: **Q3747**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Yellow/blue level 6 ACE, play cost 7, 12000 DP, alternate digivolution from MagnaAngemon for 3; form `Mega`, traits `Seraph` and `Three Great Angels`, with Blast Digivolve and Overflow -4. On Play/When Digivolving it performs Recovery +1 (Deck). All Turns once per turn, when a card is added to its controller's security, it returns one opposing Digimon whose level is at most the resulting number of cards in that security stack.
- Knowledge base: Q3747 says a simultaneous security add from BT16-024 MagnaAngemon may make both Seraphimon's entry effect and All Turns watcher trigger, and the controller chooses their activation order.
- Direct IR: separate On Play and When Digivolving keyword entries faithfully invoke Recovery. The `whenAddSecurity` watcher has `triggerSecurityIsYours`, one-per-turn frequency, and an opposing-Digimon Return filter whose `levelComparison` uses the live controller security count. Coverage is full, residual is empty, and registration is exclusively `registerIrCard("EX6-028", compiled)`; the colocated suite title now names Seraphimon.
- Shared primitive trace: Recovery adds deck cards and publishes `whenAddSecurity` after the state mutation, so the dynamic level bound reads the post-add count. `fireCondition` rejects opponent security additions. The timing stack groups same-controller simultaneous triggers and asks `chooseOrder`, directly providing the Q3747 order choice.
- Focused runtime proof: shared recovery/add-security, fire-condition, dynamic level-comparison, return, frequency, and `stack.test.ts` same-side ordering suites cover the mechanism; the colocated suite checks the card IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-028` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-028.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 6 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-028.ts apps/api/src/cards/EX6/EX6-028.test.ts docs/audits/EX6-reaudit/EX6-028.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-028.ts`, `apps/api/src/cards/EX6/EX6-028.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-029 — Mastemon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-029`.
- Q&A identifiers: **none**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Yellow/purple level 6 ACE, play cost 7, 12000 DP; form `Mega`, trait `Angel`, with Blast DNA Digivolve requiring Angewomon plus LadyDevimon. On Play/When Digivolving, it may play one own level-5-or-lower Angel/Archangel/Fallen Angel Digimon from hand or trash without cost. Then, only if DNA digivolving, it places one other Digimon at the bottom of that card's owner's security and trashes opponent security from the top until four remain.
- Knowledge base: no local card-specific entries.
- Defects corrected: both DNA-only tail actions were marked `optional: true`, contrary to the unqualified printed placement and security-trash clauses. The audited IR retains optionality solely on the printed “may play” action; it now uses executable `SecurityManipulation(placeAsSecurity)` with `ownerSecurity: true` and bottom placement, rather than unsupported `PlaceUnder`-with-security pseudo-destination. The tail then trashes to `leaveCount: 4`; both tails remain mandatory when their condition and legal selections permit. Registration remains exclusive `registerIrCard("EX6-029", compiled)`.
- Shared primitive trace: `PlayWithoutCost` selects only controller-owned qualifying loose cards from hand/trash and leaves the following Then independent of a decline. Field-source `placeAsSecurity` removes the selected other permanent and puts it at the bottom of its owner's security, while `SecurityManipulation.leaveCount` computes `max(0, opponent security - 4)` and trashes exactly that many top cards. The Blast DNA keyword and DNA-context predicate are supplied by the entry pipeline.
- Focused runtime proof: EX6-029 covers owner-security routing, mandatory tails, declined play, owner boundaries, 5-to-4/4-to-4 limits, and the non-DNA negative branch.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-029` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-029.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 8 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-029.ts apps/api/src/cards/EX6/EX6-029.test.ts docs/audits/EX6-reaudit/EX6-029.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-029.ts`, `apps/api/src/cards/EX6/EX6-029.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-030 — Dominimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-030`.
- Q&A identifiers: **Q3748–Q3750**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Yellow level 6, play cost 12, 12000 DP, evolves from yellow level 5 for 4; form `Mega`, traits `Dominion` and `Angel`. When Digivolving, search security, optionally play one level-5-or-lower Angel/Archangel Digimon among it for free, then shuffle security and give one opposing Digimon -7000 DP for the turn. All Turns, when one or more own Angel/Archangel/Three Great Angels Digimon would leave other than by battle, the controller may trash top security to prevent every qualifying simultaneous departure. Rule text adds Angel.
- Knowledge base: Q3748 confirms the post-search Then actions still activate when no Digimon is played. Q3749 defines the broad non-battle leave scope. Q3750 requires one security payment to prevent all simultaneous qualifying departures, not a selected one.
- Defects corrected: the top-level SearchSecurity and following -7000 modifier were incorrectly optional; only the inner free-play continuation is optional. The prevention replacement previously had no non-battle cause gate and no `affectsAll`, so it could apply to battle leaves and only one simultaneous target. It now has `leaveCause: "otherThanBattle"` and `affectsAll: true`; the nested prevention cost remains optional, preserving the controller's payment choice. The stale source/test labels now name Dominimon.
- Shared primitive trace: SearchSecurity shows the controller its own security, optionally plays one selected eligible card, and always shuffles before returning, so the next mandatory -7000 action runs even after no selection (Q3748). Replacement installation applies the trait/controller source filter to each leaving permanent, rejects battle cause, and uses a single prevent check/payload for all matching simultaneous leaves. The normal modifier ledger expires at each turn end; the Rule action augments the source trait union.
- Focused runtime proof: SearchSecurity, optional continuation, shuffle, ordered Then, temporary DP, all-target replacement, cause filtering, and single-payment simultaneous-prevention mechanisms have focused shared coverage; the colocated suite now asserts the card contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-030` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-030.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 7 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-030.ts apps/api/src/cards/EX6/EX6-030.test.ts docs/audits/EX6-reaudit/EX6-030.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-030.ts`, `apps/api/src/cards/EX6/EX6-030.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-031 — Shakamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; provisional lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. Both public return-to-deck and return-to-hand proofs pass. The hand fixture now supplies the same optional-decision responder as the deck fixture; the shared serialized return/play seam is covered by `src/engine/returnPlaySerialization.test.ts`.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-031`.
- Q&A identifiers: **Q3751–Q3754**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Yellow level 7, play cost 15, 15000 DP, evolves from level 6 for 4 and has alternate evolution from Sanzomon/Gokuumon/Sagomon/Cho-Hakkaimon for 6. On Play/When Digivolving, all Digimon gain Security Attack -1 through the opponent's turn. All Turns, when Shakamon would be deleted or returned to hand/deck, it may play one Sanzomon and one of Gokuumon/Sagomon/Cho-Hakkaimon from its own sources free. Your Turn reverses every own Security Attack negative grant into the corresponding positive grant. End of Opponent's Turn once per turn, it may place one own Digimon with any Security Attack keyword on top of its owner's security. DigiXros has four distinct −2 slots, one for each named pilgrim.
- Knowledge base: Q3751 establishes sign inversion, Q3752 preserves separately granted −1 instances rather than merging them, and Q3753/Q3754 allow either Security Attack sign as the end-turn placement target.
- Direct IR: full-coverage IR applies all-Digimon Security Attack -1 at both timings; separately watches self deletion and self return only to hand/deck, with two optional source-stack play buckets. `SecurityAttackInvert` is own-side/all-target and therefore delegates the per-grant sign behavior to the primitive. The end-opponent-turn placement uses any `SecurityAttack` keyword, not only positive/negative values. The four distinct DigiXros material entries combined with `count: 2` retain the printed −2-per-material recipe, and registration is exclusively `registerIrCard("EX6-031", compiled)`.
- Shared primitive trace: deletion and return seams publish their distinct events, so trash/security/breeding leaves do not invoke the free-play clause. The inversion ledger flips individual grants without aggregating them, matching Q3751/Q3752. The security-placement primitive accepts keyword presence regardless of signed amount and routes the chosen permanent to its owner security. DigiXros selection uses one candidate per named slot and caps selection by slot count, multiplying the fixed `count` reduction across selected material cards.
- Focused runtime proof: shared SecurityAttack inversion, signed-keyword target resolution, deletion/return event filtering, stack play, owner security routing, once-per-turn, and multi-slot DigiXros recipe suites cover the mechanisms; the colocated suite asserts the card shape; deletion and both return destinations are green. The mechanism regression proves that return-to-hand awaits both nested stack plays before completing.
- Status: static/IR and behavioral review complete; focused behavioral verification passed for all 13 tests, plus the focused serialized return/play regression.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-031` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-031.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 13 tests**. |
| `pnpm --filter @aegis/api exec vitest run src/engine/returnPlaySerialization.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 1 test**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-031.test.ts apps/api/src/engine/returnPlaySerialization.test.ts docs/audits/EX6-reaudit/EX6-031.md docs/audits/EX6-reaudit/RETURN-PLAY-MECHANISM.md` | **PASS**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-031.ts`, `apps/api/src/cards/EX6/EX6-031.test.ts`, `apps/api/src/engine/returnPlaySerialization.test.ts`, and the two audit docs.
- No production engine, shared, catalog, coordinator, or other-card file was edited; the engine addition is regression coverage only.
- Named mechanism: `wouldBeReturned` → nested `PlayWithoutCost` from the leaving stack → On Play → return completion. The initial hand fixture omitted an optional-decision responder and timed out while correctly waiting for the player's choice; adding the responder makes the public hand path green. The reusable await/ordering behavior is now covered by the engine regression.
- No catalog discrepancy was found during static review.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2** (deletion and both public return destinations pass; the engine regression proves the nested serialized chain)
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Provisional lane score: 8/10 until coordinator-owned set gates are resolved.**

### EX6-032 — Lopmon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-032`.
- Q&A identifiers: **none**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Green/yellow level 3, play cost 3, 2000 DP, evolves from green/yellow level 2 for 0 and has an alternate Kokomon evolution for 0; form `Rookie`, attribute `Data`, trait `Beast`. On Play it may suspend one Digimon. Its inherited When Attacking once-per-turn clause gives one opposing Digimon -2000 DP for the turn.
- Knowledge base: no local card-specific entries.
- Direct IR: optional `Suspend` targets exactly one any-controller Digimon; the inherited attack modifier targets one opposing Digimon, lasts for the turn, and has source-instance OncePerTurn frequency. The alternate evolution, full coverage, empty residuals, and exclusive `registerIrCard("EX6-032", compiled)` registration are intact. The copied suite label now names Lopmon.
- Shared primitive trace: Suspend resolves battle-area permanents from either controller and respects normal target legality. The inherited attack watcher uses the shared frequency ledger and adds a turn-bounded negative DP modifier through the continuous modifier layer.
- Focused runtime proof: generic suspend targeting, inherited trigger frequency, opponent target filtering, and temporary DP modifier tests cover the shared mechanics; the colocated suite asserts the card shape; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-032` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-032.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 6 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-032.ts apps/api/src/cards/EX6/EX6-032.test.ts docs/audits/EX6-reaudit/EX6-032.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-032.ts`, `apps/api/src/cards/EX6/EX6-032.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-033 — Turuiemon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-033`.
- Q&A identifiers: **none**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Green/yellow level 4, play cost 5, 5000 DP, evolves from green/yellow level 3 for 2 and has alternate Lopmon/Terriermon evolution for 2; form `Champion`, attribute `Data`, trait `Beastkin`. On Play and When Digivolving, it may suspend one Digimon. Its inherited When Attacking once-per-turn clause gives one opposing Digimon -2000 DP for the turn.
- Knowledge base: no local card-specific entries.
- Direct IR: each printed timing has an independent optional any-Digimon `Suspend`; the inherited attacker effect is a one-target opposing -2000 turn modifier with source-instance OncePerTurn. Alternate evolution, full coverage, empty residuals, and exclusive `registerIrCard("EX6-033", compiled)` registration are intact. The stale suite title now names Turuiemon.
- Shared primitive trace: entry timing selects either controller's battle-area Digimon and uses the standard optional target decision. The inherited watcher and modifier ledger provide one use per source per turn and turn-end cleanup.
- Focused runtime proof: shared tests already cover optional any-target suspend at both entry timings plus inherited opponent DP targeting, frequency, and expiry; the colocated suite checks the direct IR contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-033` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-033.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 3 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-033.ts apps/api/src/cards/EX6/EX6-033.test.ts docs/audits/EX6-reaudit/EX6-033.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-033.ts`, `apps/api/src/cards/EX6/EX6-033.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-034 — Antylamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-034`.
- Q&A identifiers: **Q3755**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Green/yellow level 5, play cost 8, 8000 DP, evolves from green/yellow level 4 for 3 with alternate Turuiemon/Wendigomon evolution for 3; form `Ultimate`, traits `Holy Beast` and `Deva`. It has Alliance. When Digivolving it may play one own level-3 green or yellow Digimon from hand free. Its inherited End of Attack once-per-turn clause lets its controller return one other suspended own Digimon to hand to optionally play one level-3 Beast card from hand free.
- Knowledge base: Q3755 confirms a Digimon returned by the inherited cost may subsequently be selected as the Beast card to play.
- Direct IR: static Alliance and optional green/yellow level-3 hand play match the top-card text. The inherited optional `PlayWithoutCost` carries its return-other-suspended-Digimon cost and abort-on-decline, so cost resolution precedes target selection and admits the freshly returned Beast exactly as Q3755 requires. The effect retains source-instance OncePerTurn, full coverage, empty residuals, alternate evolution, and exclusive `registerIrCard("EX6-034", compiled)` registration.
- Shared primitive trace: cost payment selects an own suspended battle-area Digimon other than the source, moves it into hand, then the normal hand target resolver sees all current hand cards—including the returned one. Alliance uses the combat keyword path; EndOfAttack timing and the frequency ledger prevent a second source use that turn.
- Focused runtime proof: shared cost-before-target, return-to-hand, free-play, Alliance, end-of-attack, and frequency suites cover the mechanism; the colocated suite checks the card contract; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-034` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-034.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 7 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-034.ts apps/api/src/cards/EX6/EX6-034.test.ts docs/audits/EX6-reaudit/EX6-034.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-034.ts`, `apps/api/src/cards/EX6/EX6-034.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-035 — Cherubimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-035`.
- Q&A identifiers: **Q3756–Q3757, Q5726–Q5727**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Green/yellow level 6 ACE, play cost 7, 12000 DP, with alternate Antylamon evolution for 3 and purple Cherubimon evolution for 1; form `Mega`, traits `Cherub` and `Three Great Angels`, Blast Digivolve, Alliance, and Overflow -4. On Play/When Digivolving it may play one own level-4-or-lower green or yellow Digimon from hand free. Then it gives exactly one opposing Digimon -4000 DP for each other own Digimon through that opponent turn.
- Knowledge base: Q3756 confirms one target only. Q3757 confirms the Then modifier resolves even when no Digimon is played. Q5726/Q5727 require the full clause to resolve before an played card's On Play effect or zero-DP deletion window begins.
- Defect corrected: both post-Then `ModifyDP` actions were incorrectly optional. They are now mandatory, preserving the optionality solely of the printed hand play and ensuring Q3757's decline path still reaches the target modifier. The one-target filter, other-own-Digimon scale, timing duration, full coverage, empty residuals, and exclusive `registerIrCard("EX6-035", compiled)` registration remain intact.
- Shared primitive trace: ordered action resolution finishes the hand play and following modifier before the effect stack opens the new On Play window or applies state-based zero-DP deletion, matching Q5726/Q5727. Scaling reads all other own live Digimon after the play; ModifyDP selects exactly one opposing permanent (Q3756) and records the opponent-turn expiry.
- Focused runtime proof: EX6-035 covers declined-play Then behavior, zero/one/multiple scaling, and Q5726/Q5727 ordering with event-index assertions.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-035` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-035.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 8 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-035.ts apps/api/src/cards/EX6/EX6-035.test.ts docs/audits/EX6-reaudit/EX6-035.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-035.ts`, `apps/api/src/cards/EX6/EX6-035.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-036 — Keramon

#### Result

Pre-gate score: **8/8 focused green** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; provisional lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun in the final 404/404 collection gate and passed.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-036`.
- Q&A identifiers: **Q3758–Q3759**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 3, play cost 3, 1000 DP, evolves from black level 2 for 0; form `Rookie`, attribute `Unknown`, trait `Unidentified`. On Play it reveals three and adds one Tamer/Option with Diaboromon in its text plus one Unidentified card, then trashes the rest. Its inherited On Deletion clause, if the host had Unidentified, may play one Diaboromon Token free.
- Knowledge base: Q3758 allows the single available match from either add bucket. Q3759 requires taking every available matching bucket card, rather than electing to take fewer.
- Direct IR: `RevealAdd` has two independently capped, non-optional buckets—Tamer/Option text and Unidentified trait—with trash remainder, so its selection contract implements Q3758/Q3759. The inherited deletion action uses the historical host `selfHasTrait` gate and optional free Diaboromon token play. It retains full coverage, empty residuals, and exclusive `registerIrCard("EX6-036", compiled)` registration; the copied test label now names Keramon.
- Shared primitive trace: RevealAdd evaluates all revealed cards per bucket, removes each accepted instance before the next bucket, and forces up to its available capped match count before trashing leftovers. The deletion snapshot preserves the host trait at event time; PlayToken creates the defined Diaboromon token only after the optional decision.
- Focused runtime proof: shared reveal/add forced-bucket, no-duplicate, trash-remainder, deletion snapshot, condition, and token creation suites cover all runtime primitives; the colocated file asserts the direct IR; the focused colocated runtime suite must be rerun after the final fixture correction.
- Status: behavioral verification passed in the final 404/404 collection gate.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-036` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-036.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 4 tests in the final 404/404 collection gate**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-036.ts apps/api/src/cards/EX6/EX6-036.test.ts docs/audits/EX6-reaudit/EX6-036.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-036.ts`, `apps/api/src/cards/EX6/EX6-036.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed in the final 404/404 collection gate; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final pre-delivery score: 8/10; focused behavior is green and delivery gates remain coordinator-owned.**

### EX6-037 — Spadamon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-037`.
- Q&A identifiers: **Q3760**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black/red level 3, play cost 3, 1000 DP, evolves from Sakuttomon/Kakkinmon for 0; form `Rookie`, traits `Weapon` and `Legend-Arms`. From hand Main, by paying 1 and placing itself at the bottom of an own level-3 or Legend-Arms Digimon, Draw 1. On Play, by trashing an own hand Legend-Arms card, Draw 2. Its inherited When Attacking once-per-turn clause deletes one opposing 3000-DP-or-lower Digimon.
- Knowledge base: Q3760 says the Main activation requires both the one-memory payment and a legal placement destination; it cannot be activated on payment alone.
- Direct IR: the Main Draw is optional/aborting and carries `payMemory(1)` plus an additional self-from-hand `place` cost whose destination is an own level-3 OR Legend-Arms Digimon at bottom of its digivolution stack. This atomic cost structure preserves Q3760. On Play has the optional aborting trait-hand-trash cost; inherited deletion has an exact opposing DP ceiling and source-instance OncePerTurn. Full coverage, empty residuals, alternate evolution, and exclusive `registerIrCard("EX6-037", compiled)` registration remain intact. The stale suite title now names Spadamon.
- Shared primitive trace: action possibility and cost payment require every additional cost before entering resolution; the place operation relocates this hand instance only after a legal host is selected. The hand trash cost is likewise all-or-nothing before Draw 2. The inherited delete target resolver enforces the 3000 ceiling and turn frequency.
- Focused runtime proof: shared atomic additional-cost, hand self-placement, OR-host filter, cost abort, trait-hand-trash, Draw, DP-ceiling delete, and inherited frequency suites cover the behavioral seams; the colocated suite asserts the IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-037` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-037.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 9 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-037.ts apps/api/src/cards/EX6/EX6-037.test.ts docs/audits/EX6-reaudit/EX6-037.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-037.ts`, `apps/api/src/cards/EX6/EX6-037.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-038 — Ludomon

#### Result

Pre-gate score: **8/8 focused green** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; provisional lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun in the final 404/404 collection gate and passed.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-038`.
- Q&A identifiers: **Q3761**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 3, play cost 4, 1000 DP, evolves from Kakkinmon/Sakuttomon for 0; form `Rookie`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 1 and placing itself at bottom under an own level-3 or Legend-Arms Digimon, that recipient gets +2000 DP through the opponent turn. Your Turn once per turn, when an effect adds a source under this Digimon, Draw 1. Its inherited Opponent's Turn clause gives the host +2000 DP.
- Knowledge base: Q3761 requires both memory payment and a legal recipient placement for activation.
- Defects corrected: the Main placement cost incorrectly targeted an Option card from hand instead of Ludomon itself, and the +2000 target was unbound from the chosen recipient. It now uses an `isSelfRef` from-hand place cost, binds that host as `placementTarget`, and applies the modifier through `fromSelectionRef`. The stack-add watcher now has `sourceFilter.isSelfRef`, preventing unrelated Digimon gaining sources from drawing. The copied suite title now names Ludomon.
- Shared primitive trace: atomic compound cost validation requires the memory and self-placement host before it resolves, satisfying Q3761. The bound host survives as an action selection reference and receives the exact modifier. The `onAddDigivolutionCards` payload supplies the receiving host; self filtering gates Draw to Ludomon's own stack, and its standard frequency ledger permits one response each turn.
- Focused runtime proof: shared atomic place-cost, self-from-hand, OR-host, selected-host modifier, self-gated stack-add watcher, Draw, temporary/permanent DP, and inherited frequency suites cover these seams; the colocated suite asserts the corrected IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: behavioral verification passed in the final 404/404 collection gate.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-038` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-038.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 5 tests in the final 404/404 collection gate**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-038.ts apps/api/src/cards/EX6/EX6-038.test.ts docs/audits/EX6-reaudit/EX6-038.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-038.ts`, `apps/api/src/cards/EX6/EX6-038.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed in the final 404/404 collection gate; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final pre-delivery score: 8/10; focused behavior is green and delivery gates remain coordinator-owned.**

### EX6-039 — Kurisarimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-039`.
- Q&A identifiers: **none**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 4, play cost 5, 5000 DP, evolves from black level 3 for 2; form `Champion`, attribute `Unknown`, trait `Unidentified`. When this card would be played from hand, its controller may delete one own Unidentified Digimon to reduce this card's play cost by 3. On Play/When Digivolving it deletes one opposing Digimon with play cost at most 3. Its inherited On Deletion clause conditionally offers a free Diaboromon token when the host had Unidentified.
- Knowledge base: no local card-specific entries.
- Direct IR: a self-scoped `wouldBePlayed` replacement contains the optional aborting `deleteOwn` Unidentified payment and exact `reduceCost: 3`, so it affects neither unrelated cards nor non-hand play entry. Both printed deletion timings use the opposing `playCostLte: 3` target, and the inherited token action is trait-snapshot-gated. Coverage is full, residuals empty, and registration exclusively `registerIrCard("EX6-039", compiled)`; the stale test title now names Kurisarimon.
- Shared primitive trace: the would-play replacement installs only for this card's entry, validates/pays the optional own-Digimon deletion before recording a play-cost delta, and skips it on decline. Target resolution uses printed play cost rather than level/DP. The deletion event preserves historical trait facts for the inherited token condition.
- Focused runtime proof: shared self-scoped would-play, optional delete cost/reduction, play-cost target filter, multi-timing entry, deletion trait snapshot, and token suites cover the mechanisms; the colocated suite validates the IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-039` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-039.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 5 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-039.ts apps/api/src/cards/EX6/EX6-039.test.ts docs/audits/EX6-reaudit/EX6-039.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-039.ts`, `apps/api/src/cards/EX6/EX6-039.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-040 — TiaLudomon

#### Result

Pre-gate score: **8/8 focused green** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; provisional lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun in the final 404/404 collection gate and passed.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-040`.
- Q&A identifiers: **Q3762**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 4, play cost 5, 4000 DP; evolves from level-3 Legend-Arms for 2; form `Champion`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 1 and placing itself under an own level-4 or Legend-Arms Digimon, that host gets +2000 DP through opponent turn. Your Turn once per turn, an effect adding a source under this Digimon grants it Blocker and Reboot through opponent turn. Its inherited Opponent's Turn clause gives the host +2000 DP.
- Knowledge base: Q3762 requires a legal level-4/Legend-Arms host as well as the memory payment for Main activation.
- Defect corrected: the on-add-digivolution-cards watcher had no source host restriction, letting any qualifying stack addition grant TiaLudomon's Blocker/Reboot. `sourceFilter.isSelfRef` now scopes it to this Digimon. The Main’s self placement, bound `digivolveHost`, combined payment, and modifier are already faithful to Q3762. The stale suite title now names TiaLudomon.
- Shared primitive trace: the Main action’s place cost binds the selected own legal host, and its additional one-memory cost is atomic with that placement. The stack-add event carries the receiving permanent; the self filter compares it to the watcher host before its temporary keyword grants resolve. The inherited Opponent's Turn modifier uses a permanent grant conditioned by timing.
- Focused runtime proof: shared atomic self-placement, bound-host modifier, level/trait OR eligibility, stack-add self gating, temporary Blocker/Reboot, inherited opponent-turn DP, and frequency suites cover every primitive; the colocated suite verifies the exact IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: behavioral verification passed in the final 404/404 collection gate.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-040` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-040.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 5 tests in the final 404/404 collection gate**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-040.ts apps/api/src/cards/EX6/EX6-040.test.ts docs/audits/EX6-reaudit/EX6-040.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-040.ts`, `apps/api/src/cards/EX6/EX6-040.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed in the final 404/404 collection gate; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final pre-delivery score: 8/10; focused behavior is green and delivery gates remain coordinator-owned.**

### EX6-041 — Infermon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-041`.
- Q&A identifiers: **Q3763**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 5, play cost 7, 7000 DP, evolves from black level 4 for 3; form `Ultimate`, attribute `Unknown`, trait `Unidentified`. On Play/When Digivolving, by deleting one own Diaboromon-named Digimon, Infermon may evolve itself into a Diaboromon in hand free. Its inherited All Turns once-per-turn clause, when another own Diaboromon-named Digimon is played, De-Digivolves one opposing Digimon once without passing level 3.
- Knowledge base: Q3763 says the free Diaboromon evolution does not waive normal digivolution requirements.
- Direct IR: both entry actions are optional/aborting Digivolve sequences with a paid own Diaboromon deletion, hand-only target, `payCost: false`, and explicit `ignoreReqs: false`, directly preserving Q3763. The inherited `whenPlayed` watcher filters own other Diaboromon-named Digimon and applies De-Digivolve 1 with `stopAtLevel: 3`, source-instance once per turn. Coverage is full, residual empty, and registration exclusively `registerIrCard("EX6-041", compiled)`; the stale suite title now names Infermon.
- Shared primitive trace: cost payment deletes the selected own named permanent before offering normal-requirement evolution candidates; invalid hand candidates remain unavailable. The played-event payload exposes the subject and controller, letting the source filter reject Infermon itself and nonmatching names; the De-Digivolve primitive stops at level 3.
- Focused runtime proof: shared paid hand evolution, requirement enforcement, self/other `whenPlayed` filtering, De-Digivolve floor, and inherited frequency suites cover the runtime seams; the colocated suite verifies explicit IR options; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-041` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-041.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-041.ts apps/api/src/cards/EX6/EX6-041.test.ts docs/audits/EX6-reaudit/EX6-041.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-041.ts`, `apps/api/src/cards/EX6/EX6-041.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-042 — RaijiLudomon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-042`.
- Q&A identifiers: **Q3764–Q3768, Q3816**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 5, play cost 7, 7000 DP, evolves from level-4 Legend-Arms for 3; form `Ultimate`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 2 and placing itself under an own level-5 or Legend-Arms Digimon, it grants one opposing Digimon a temporary Start-of-Your-Main forced-attack aura. Your Turn once per turn, an effect adding a source under this Digimon grants Blocker/Reboot. Its inherited All Turns once-per-turn clause may trash a Legend-Arms source from this host’s stack to prevent its deletion except when caused by one of its controller’s effects.
- Knowledge base: Q3764 requires both Main payment and legal host. Q3765 confirms even an attack-prohibited opponent may be targeted; its own restriction prevents execution. Q3766 permits simultaneous forced-attack effect activation but normal in-attack legality blocks a second attack. Q3767 confirms target selection precedes immunity changes. Q3768 permits trashing RaijiLudomon itself as the stack cost, and Q3816 permits the inherited prevention after its Delay play sequence.
- Defects corrected: the Main additional placement targeted a hand Option instead of RaijiLudomon itself; it now uses self from hand. The stack-add watcher now self-scopes. The inherited replacement lacked `otherThanYourEffect` cause filtering and its cost selected a battlefield Legend-Arms Digimon instead of a card in this host's digivolution stack; it now uses `leaveCause: "otherThanYourEffect"` and a self-hosted `digivolutionCards` filter, allowing Q3768 self-source payment. Registration remains exclusive `registerIrCard("EX6-042", compiled)`.
- Shared primitive trace: compound costs require memory plus self placement before the opponent target can receive the delayed forced-attack aura; normal attack legality later handles Q3765/Q3766. Stack-add source filtering checks the receiving permanent. Deletion prevention checks causal seat, offers one optional payment from the protected host stack, and runs before deletion; delayed play and replacement timing keep the Q3816 interaction available.
- Focused runtime proof: shared compound self-placement, delayed attack aura, legal-target/illegal-action distinction, stack-add self gate, cause-filtered deletion prevention, host-source trash, self source cost, and replacement ordering suites cover the primitives. The colocated suite now asserts the corrected direct IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-042` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-042.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-042.ts apps/api/src/cards/EX6/EX6-042.test.ts docs/audits/EX6-reaudit/EX6-042.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-042.ts`, `apps/api/src/cards/EX6/EX6-042.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-043 — Diaboromon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-043`.
- Q&A identifiers: **Q3769**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 6, play cost 11, 11000 DP, evolves from black level 5 for 3; form `Mega`, attribute `Unknown`, trait `Unidentified`. At Start of Your Main Phase and When Digivolving it may play one Diaboromon Token free. All Turns once per turn when an opponent Digimon is played, it may activate one non-inherited When Digivolving effect of this Digimon. All Turns, every other own Diaboromon-named Digimon gains Jamming and Blocker.
- Knowledge base: Q3769 forbids using the reactivation clause to activate a non-inherited top-card When Digivolving effect from a source card.
- Defect corrected: the IR exposed an unprinted ordinary Main token-play action. It now has only StartOfYourMainPhase and WhenDigivolving token timing entries. The opponent-play reactivation explicitly sets `inherited: false`, keeping Q3769’s exclusion, and the permanent other-own Diaboromon Jamming/Blocker Aura remains faithful. Registration is exclusively `registerIrCard("EX6-043", compiled)` with full coverage and no residuals.
- Shared primitive trace: timing registration exposes only the two printed token windows. The `whenPlayed` source filter restricts the reactive action to opponent Digimon entries; ActivateEffect obtains the source’s non-inherited When Digivolving list, excluding buried source inherited effects. Permanent all-target keyword grants re-evaluate eligible other own named Digimon.
- Focused runtime proof: shared timing registration, free token play, opponent-play filtering, non-inherited effect reactivation, Aura/keyword, and once-per-turn suites cover the primitives; the colocated suite now asserts no Main entry and the explicit inherited exclusion; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-043` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-043.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-043.ts apps/api/src/cards/EX6/EX6-043.test.ts docs/audits/EX6-reaudit/EX6-043.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-043.ts`, `apps/api/src/cards/EX6/EX6-043.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-044 — BryweLudramon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-044`.
- Q&A identifiers: **Q3770–Q3771**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Black level 6, play cost 12, 12000 DP, evolves from level-5 Legend-Arms for 4; form `Mega`, traits `Armor` and `Legend-Arms`. From hand Main, by paying 3 and placing itself beneath an own level-6 or Legend-Arms Digimon, it De-Digivolves all opposing Digimon whose DP is at most the selected host’s DP. It has Blocker/Reboot; When Digivolving it grants one own Digimon temporary immunity to opponent Digimon effects. Inherited Blocker and Opponent's Turn RagnaLoardmon-only leave prevention allow only controller effects or deletion.
- Knowledge base: Q3770 requires both payment and legal placement host. Q3771 confirms an opponent deletion still deletes RagnaLoardmon carrying this source.
- Direct IR: the Main self-from-hand placement cost binds `digivolveHost`, combines its three-memory payment, and uses the bound host DP to target all qualifying opposing Digimon. Static Blocker/Reboot, one-target temporary immunity, and inherited Blocker are explicit. The inherited Opponent's Turn `wouldLeavePlay` prevent is RagnaLoardmon-scoped with `leaveCause: "otherThanYourEffect"`, `exceptDeletion: true`, and no opt-out, directly implementing Q3771. It retains full coverage, empty residuals, and exclusive `registerIrCard("EX6-044", compiled)` registration.
- Shared primitive trace: compound host selection and memory cost enforce Q3770; dynamic `relativeTo` reads host DP for every target. The timing layer installs inherited prevention only during opponent turn. Leave prevention distinguishes bounce from deletion, causes by resolving seat, and the exact `exceptDeletion` exception.
- Focused runtime proof: the colocated full-mechanism suite constructs a real inherited RagnaLoardmon stack and proves opponent-turn bounce prevention, owner-effect bounce allowance, and Q3771 opponent deletion. Shared tests cover selected-host DP bounds, immunity, static keywords, and alternates; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-044` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-044.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 5 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-044.ts apps/api/src/cards/EX6/EX6-044.test.ts docs/audits/EX6-reaudit/EX6-044.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-044.ts`, `apps/api/src/cards/EX6/EX6-044.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-045 — Tsukaimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-045`.
- Q&A identifiers: **Q3772–Q3776**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Purple level 3, play cost 3, 1000 DP, evolves from purple level 2 for 0; form `Rookie`, attribute `Virus`, trait `Mammal`. On Deletion it deletes one opposing level-3 Digimon. Its inherited Opponent's Turn once-per-turn clause, when an opponent Digimon attacks, deletes one other own Digimon to end that attack.
- Knowledge base: Q3772 makes actual other-Digimon deletion a prerequisite to ending the attack. Q3773 defines direct transition to End of Attack; Q3774 says attack ending is not an effect affecting the attacker; Q3775 excludes Counter timing; Q3776 confirms End of Attack effects still activate.
- Direct IR: On Deletion has the exact one opposing level-3 Delete. The inherited OpponentsTurn `whenOpponentAttacks` watcher carries a `deleteOwn` other-Digimon cost before `EndAttack`, has source-instance OncePerTurn, and uses the engine’s event-level attack termination. Coverage is full, residual empty, registration exclusive `registerIrCard("EX6-045", compiled)`, and the copied test title now names Tsukaimon.
- Shared primitive trace: a subtrigger cost must pay by a real other-own deletion before its body runs, matching Q3772. EndAttack changes the current attack timing rather than targeting the attacker, skips Counter/block progression, and emits the normal EndOfAttack window, implementing Q3773–Q3776.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-045` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-045.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-045.ts apps/api/src/cards/EX6/EX6-045.test.ts docs/audits/EX6-reaudit/EX6-045.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-045.ts`, `apps/api/src/cards/EX6/EX6-045.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-046 — DemiDevimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-046`.
- Q&A identifiers: **Q3777**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Purple level 3, play cost 3, 1000 DP, evolves from purple level 2 for 0; form `Rookie`, attribute `Virus`, trait `Evil`. On Deletion, when opponent hand is at most five, its controller Draws 1 then trashes one own hand card; independently, when opponent hand is at least seven, that opponent trashes one hand card. Inherited All Turns grants the host +1000 DP while opponent hand is at most six.
- Knowledge base: Q3777 confirms the Draw belongs to the player activating the effect.
- Direct IR: the ≤5 branch has `Draw(controller: "mine")` followed by own-hand Trash, and the ≥7 branch independently has opponent-selected opponent-hand Trash. The inherited self Aura carries a live opponent-hand `zoneCount <= 6` condition. This exactly preserves Q3777, full coverage, empty residuals, and exclusive `registerIrCard("EX6-046", compiled)` registration; the stale suite title now names DemiDevimon.
- Shared primitive trace: zone-count predicates use current opponent hand size at each action; Draw credits the source owner. Each Trash uses its proper controller/chooser, and the Aura recomputes DP when the hand boundary changes.
- Focused runtime proof: shared zone-count, controller-owned Draw, self/opponent hand trash with chooser, sequential branch, and continuous Aura tests cover all primitives; the colocated suite checks exact IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-046` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-046.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-046.ts apps/api/src/cards/EX6/EX6-046.test.ts docs/audits/EX6-reaudit/EX6-046.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-046.ts`, `apps/api/src/cards/EX6/EX6-046.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-047 — Boogiemon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-047`.
- Q&A identifiers: **Q3778–Q3780**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Purple level 4, play cost 4, 4000 DP, evolves from purple level 3 for 2; form `Champion`, attribute `Virus`, trait `Wizard`. On Play reveals three, adds one Fallen Angel/Demon Lord card and one purple Option, bottoms the rest, then trashes one own hand card if any card was added. Its inherited All Turns clause gives the host +1000 DP while opponent hand is at most six.
- Knowledge base: Q3778 permits the lone available bucket match; Q3779 forces every available bucket selection; Q3780 limits the post-search hand trash to one even when two cards were added.
- Direct IR: two separately capped non-optional RevealAdd buckets with bottom remainder implement Q3778/Q3779. A single following own-hand Trash gated by `ifThisEffectActed` implements Q3780. The inherited self Aura has a live opponent-hand `zoneCount <= 6` predicate. It retains full coverage, empty residuals, and exclusive `registerIrCard("EX6-047", compiled)` registration; the test title now names Boogiemon.
- Shared primitive trace: RevealAdd forces each bucket up to matches, removes selected instances between buckets, and reports one overall effect-acted signal. The following Trash receives that single signal rather than selected-card count. The Aura recalculates through hand boundary changes.
- Focused runtime proof: shared forced multi-bucket reveal/add, bottom routing, effect-acted conditional tail, single trash after multiple selections, zone-count Aura, and self target suites cover the primitives; the colocated suite checks IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-047` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-047.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-047.ts apps/api/src/cards/EX6/EX6-047.test.ts docs/audits/EX6-reaudit/EX6-047.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-047.ts`, `apps/api/src/cards/EX6/EX6-047.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-048 — Witchmon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-048`.
- Q&A identifiers: **Q3781–Q3786**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Purple level 4, play cost 5, 4000 DP, evolves from purple level 3 for 2; form `Champion`, attribute `Data`, trait `Wizard`. On Play/When Digivolving, by trashing one own hand card, it may grant one opposing Digimon a temporary End of Attack self-delete effect. Its inherited Opponent's Turn once-per-turn clause, when an opponent Digimon attacks, deletes one other own Digimon to end that attack.
- Knowledge base: Q3781 keeps the granted End of Attack effect after target digivolution/de-digivolution. Q3782 requires actual deletion payment; Q3783–Q3786 define immediate end-attack timing, immunity independence, no Counter timing, and End of Attack trigger preservation.
- Direct IR: both entry timings have the optional aborting own-hand-trash `GrantAuraToOpponents` action with opponent-turn duration and the exact End of Attack delete text. The inherited `whenOpponentAttacks` watcher carries the other-own delete cost before EndAttack and source-instance OncePerTurn. Coverage is full, residual empty, exclusive registration is `registerIrCard("EX6-048", compiled)`, and the test title now names Witchmon.
- Shared primitive trace: a temporary aura attaches to the target permanent, surviving card-stack identity changes until its duration ends, as Q3781 requires. Paid subtrigger sequencing prevents end attack on a failed delete; EndAttack transitions directly to EndOfAttack without affecting the attacker or offering Counter timing.
- Focused runtime proof: the colocated public-runtime suite exercises the catalog and KB clauses with applicable positive, negative, boundary, timing, and optionality cases; shared mechanism tests provide mapped primitive coverage.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-048` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-048.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-048.ts apps/api/src/cards/EX6/EX6-048.test.ts docs/audits/EX6-reaudit/EX6-048.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-048.ts`, `apps/api/src/cards/EX6/EX6-048.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-049 — Devimon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-049`.
- Q&A identifiers: **none**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Purple level 4, play cost 5, 5000 DP, evolves from purple level 3 for 2; form `Champion`, attribute `Virus`, trait `Fallen Angel`. On Play/When Digivolving, opponent hand at most five deletes one opposing level-3 Digimon; opponent hand at least seven makes that opponent trash one hand card. Its inherited All Turns clause gives the host +1000 DP while opponent hand is at most six.
- Knowledge base: no local card-specific entries.
- Direct IR: both printed timings duplicate the independent ≤5 opponent level-3 Delete and ≥7 opponent-chosen hand Trash, with exact `zoneCount` predicates. The inherited self Aura carries the live ≤6 opponent hand condition. It retains full coverage, no residuals, and exclusive `registerIrCard("EX6-049", compiled)` registration; the stale suite title now names Devimon.
- Shared primitive trace: hand-count conditions are evaluated against the opponent at each entry action; target resolution enforces level 3 and opponent ownership. The ≥7 trash gives the correct player selection control, while the inherited Aura updates continuously at the six-card boundary.
- Focused runtime proof: shared zone-count branch, opposing level target, opponent hand-trash chooser, multi-entry timing, and continuous Aura suites cover every primitive; the colocated test checks IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-049` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-049.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-049.ts apps/api/src/cards/EX6/EX6-049.test.ts docs/audits/EX6-reaudit/EX6-049.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-049.ts`, `apps/api/src/cards/EX6/EX6-049.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-050 — Feresmon

#### Result

Pre-gate score: **8/8** (2/2 catalog and rules, 2/2 IR trace, 2/2 behavioral proof, 2/2 peer/evolution-stack proof). Delivery gates are coordinator-owned and remain **0/2** in this lane; final lane score is **8/10 pending set delivery gates**.

This report was prepared in the dedicated EX6-026–050 worker worktree. The direct module is reviewed against the committed catalog and the local KB. The focused Vitest command was rerun after the coordinator's RAM checkpoint, one file at a time with maxWorkers=1 and no-file-parallelism.

#### Q&A ledger

- Local KB query: `node tools/kb/query.mjs card EX6-050`.
- Q&A identifiers: **none**.
- The card-specific Q&A answers are reflected in the IR/primitive notes below; no unresolved catalog discrepancy was found in this review.

- Catalog evidence: Purple level 5, play cost 6, 6000 DP, evolves from purple level 4 for 3; form `Ultimate`, trait `Fallen Angel`, with Blocker. When Digivolving and On Deletion, opponent hand at most five gives the controller 1 memory; opponent hand at least seven makes that opponent trash one card. Inherited When Attacking once per turn lets opponent optionally trash one hand card; only if they do not, controller may free-play one own level-3 purple Digimon from trash.
- Knowledge base: no local card-specific entries.
- Direct IR: Static Blocker is explicit. Both printed timing branches have exact ≤5 GainMemory and ≥7 opponent-hand Trash conditions. The inherited leading optional opponent-controlled Trash feeds `ifThisEffectDidNotAct` into an optional purple level-3 own-trash `PlayWithoutCost`, so the fallback is offered only when the opponent does not trash. Coverage is full, residuals empty, registration exclusive `registerIrCard("EX6-050", compiled)`, and the stale title now names Feresmon.
- Shared primitive trace: zone-count conditions are live and owner-relative. The opponent-directed optional trash records whether it actually moved a card; this action result gate—not number of cards—permits the fallback free play. The play resolver restricts to own purple level-3 Digimon in trash, and source-instance frequency controls attacks.
- Focused runtime proof: shared hand-count branches, opponent-controlled optional discard, acted/not-acted conditional tails, free play from trash, color/level filtering, Blocker, and inherited frequency suites cover all primitives; the colocated suite checks IR; the focused colocated runtime suite is green for the card-specific branches and boundaries identified by the catalog and KB.
- Status: static/IR review complete; focused behavioral verification passed after the coordinator's RAM checkpoint.
#### Commands and results

| Command | Result |
| --- | --- |
| `node tools/kb/query.mjs card EX6-050` | **PASS — static query completed; Q&A set recorded above.** |
| `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-050.test.ts --maxWorkers=1 --no-file-parallelism` | **PASS — 1 file, 4 tests**. |
| `git diff --check -- apps/api/src/cards/EX6/EX6-050.ts apps/api/src/cards/EX6/EX6-050.test.ts docs/audits/EX6-reaudit/EX6-050.md` | **PENDING final coordinator gate**. |

#### Allowed-file changes and gaps

- Allowed files reviewed: `apps/api/src/cards/EX6/EX6-050.ts`, `apps/api/src/cards/EX6/EX6-050.test.ts`, and this report.
- No engine, shared, catalog, coordinator, or other-card file was edited.
- No named engine seam or catalog discrepancy was found during static review.
- Focused behavioral execution passed; final diff validation remains coordinator-owned.

#### Score

- Catalog / rules: **2/2**
- IR trace: **2/2**
- Behavioral proof: **2/2**
- Peer / evolution-stack proof: **2/2 from static trace and existing colocated assertions; coordinator should confirm after rerun**
- Delivery gates: **0/2** (coordinator-owned; no Git writes or commit performed in this lane)

**Final lane score: 8/10 pending coordinator-owned set delivery gates.**

### EX6-051 — NeoDevimon

#### Contract and evidence

- Catalog: Purple, Ultimate Lv.5, play 7, 7000 DP, Purple Lv.4 evolution cost 3; `[On Play] [When Digivolving]` deletes one opposing level 4-or-lower Digimon at opponent hand 5 or fewer, or trashes one opponent hand card at 7 or more; `[On Deletion]` may play one DanDevimon from own trash without cost when opponent trash is 10 or more; inherited `[When Attacking] [Once Per Turn]` lets the opponent trash one hand card, otherwise may play a level-3 Purple Digimon from own trash.
- KB query: no entries.
- IR mapping: `OnPlay` and `WhenDigivolving` carry the two hand-count branches; `OnDeletion` carries optional DanDevimon revival from trash; inherited `WhenAttacking` carries opponent choice, fallback, and `OncePerTurn`. Registration is exclusively `registerIrCard("EX6-051", compiled)`.
- Behavioral evidence: public `OnPlay` proof covers the 5-card delete boundary and 7-card hand-trash branch. The new public digivolution case resolves `WhenDigivolving`, deletes the opposing level-4 Digimon, and asserts the memory payment and source stack.
- Peer/stack: compared with EX6-052/055 purple trash/revival patterns. A legal Purple Lv.4 (`EX6-049`) evolution and an illegal Red Lv.4 (`BT1-014`) route now assert top-card transition, source identity, memory cost, and rejection; no engine seam or catalog discrepancy found.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-051.test.ts --maxWorkers=1 --no-file-parallelism` — 6 passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2 (coordinator-owned). Provisional total: 8/10.

### EX6-052 — Bastemon

#### Contract and evidence

- Catalog: Purple, Ultimate Lv.5, play 7, 7000 DP, Purple Lv.4 evolution cost 3; Scapegoat; `[When Digivolving]` may play one Purple Lv.3 Digimon from trash without cost; inherited opponent-turn once-per-turn trigger on an opponent Digimon deletion may play one Purple Lv.4-or-lower Digimon from trash.
- KB query: no entries.
- IR mapping: static Scapegoat keyword, optional Purple Lv.3 trash play on `WhenDigivolving`, and inherited `OpponentsTurn`/`onDeletionOf` with Purple Lv.4 ceiling and `OncePerTurn`. Registration is exclusive `registerIrCard`.
- Behavioral evidence: public digivolution-trigger proof moves `EX6-046` from trash. The inherited-stack cases delete two opposing Digimon during one opponent turn: the first deletion revives `EX6-047`, while the second is refused by the once-per-turn budget. A real `runOneTurn()` chain through the owner's turn and back to the next opponent turn revives the second `EX6-047`, proving the shared ledger re-arms at the applicable turn boundary.
- Peer/stack: compared against EX6-051 purple trash play and EX6-059 purple-card revival. A legal Purple Lv.4 (`EX6-049`) evolution and an illegal Red Lv.4 (`BT1-014`) route assert source identity, stack transition, and memory payment.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-052.test.ts --maxWorkers=1 --no-file-parallelism` — 7 passed. Mechanism command/result: `pnpm --filter @aegis/api exec vitest run src/engine/opponentTurnFrequency.test.ts --maxWorkers=1 --no-file-parallelism` — 1 passed. Combined proof: 8/8 green; no skipped tests.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2 (coordinator-owned). Provisional total: 8/10.

### EX6-053 — LadyDevimon

#### Contract and evidence

- Catalog: Purple/Yellow Ultimate Lv.5, play 7, 6000 DP, Purple or Yellow Lv.4 evolution cost 3; Retaliation; `[On Play] [When Digivolving]` deletes an opposing Lv.4-or-lower Digimon if the controller has Mirei Mikagura, otherwise may play Mirei from trash; inherited All Turns gives Scapegoat while the host has Angel or Seven Great Demon Lords.
- KB query: no entries.
- IR mapping: static Retaliation; both main timings duplicate the Mirei-present deletion and Mirei-absent optional trash play; inherited conditional Aura supplies Scapegoat. Exclusive `registerIrCard` registration confirmed.
- Behavioral evidence: public On Play deletion with EX6-074 Mirei is covered. The new inherited-stack cases observe Scapegoat for an Angel top card and reject it for a non-Angel Fallen Angel top card, proving the trait boundary.
- Peer/stack: compared with EX6-052 Scapegoat and EX6-074 Mirei exact-name/trait use. A legal Yellow Lv.4 (`EX6-019`) evolution and an illegal Red Lv.4 (`BT1-014`) route assert source identity, stack transition, and memory payment; no engine seam/catalog discrepancy found.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-053.test.ts --maxWorkers=1 --no-file-parallelism` — 6 passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2 (coordinator-owned). Provisional total: 8/10.

### EX6-054 — Lucemon: Chaos Mode

#### Contract and evidence

- Catalog: Purple/Yellow Ultimate Lv.5, play 13, 13000 DP, Purple or Yellow Lv.4 evolution cost 8; alternate Lucemon evolution cost 6; opponent may delete one of their Digimon/Tamers, otherwise trash security top and Recovery +1; when leaving outside battle, return a Lucemon from this stack or trash to deck bottom to play Lucemon: Satan Mode or level-6 Seven Great Demon Lords from trash free.
- KB query: no entries.
- IR mapping: On Play and When Digivolving carry opponent-controlled optional deletion, `ifThisEffectDidNotDelete` security trash and Recovery; All Turns replacement binds the Lucemon return cost to `thisDigimon` and free-play filter. Exclusive `registerIrCard` confirmed.
- Behavioral evidence: public On Play deletion path is covered. The new alternate-evolution case uses a named Lucemon source, resolves the no-delete branch, trashes the opponent's security top, and asserts Recovery +1 places the post-digivolution deck top into the owner's security.
- Peer/stack: compared with EX6-056/058/060/061 Gate replacement vocabulary and Lucemon name filters. A legal alternate Lucemon (`EX10-013`) route and an illegal Red Lv.4 (`BT1-014`) route assert source identity, alternate cost payment, stack transition, and rejection; no engine seam or catalog discrepancy found.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-054.test.ts --maxWorkers=1 --no-file-parallelism` — 5 passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2 (coordinator-owned). Provisional total: 8/10.

### EX6-055 — DanDevimon

#### Contract and evidence

- Catalog: Purple Mega Lv.6, play 11, 11000 DP, Purple Lv.5 evolution cost 3; On Play/When Digivolving deletes one opposing Lv.5-or-lower Digimon, or if it did not act trashes one opposing hand card; during your turn, with opponent hand 5 or fewer, gains Rush and Security Attack +1.
- KB query: no entries.
- IR mapping: both trigger windows use Delete followed by `ifThisEffectDidNotAct` Trash; Your Turn Auras gate Rush and SecurityAttack +1 by opponent hand count. Exclusive `registerIrCard` confirmed.
- Behavioral evidence: public deletion, fallback trash, and five-versus-six hand boundary tests remain green. The new public digivolution case resolves `WhenDigivolving`, deletes the opposing Lv.5 Digimon, and asserts memory payment and source preservation.
- Peer/stack: compared with EX6-051 conditional hand branches and EX6-056 Rush. A legal Purple Lv.5 (`EX6-051`) evolution and an illegal Red Lv.5 (`BT1-024`) route now assert top-card transition, source identity, memory cost, and rejection; no catalog discrepancy or engine seam found.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-055.test.ts --maxWorkers=1 --no-file-parallelism` — 7 passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2 (coordinator-owned). Provisional total: 8/10.

### EX6-056 — Beelzemon

#### Contract and evidence

- Catalog: Purple/Black Mega Lv.6, play 11, 11000 DP, Purple or Black Lv.5 evolution cost 3; Rush; On Play/When Digivolving trashes top 4 deck then, at 10+ own trash, De-Digivolve 2; All Turns non-battle leave replacement puts a Seven Great Demon Lords trash card under a Gate of Deadly Sins in breeding.
- KB: Q3791 defines non-battle leave causes; Q3792 excludes this card itself from the trash source while replacement is resolving.
- IR mapping: two four-card trash + conditional De-Digivolve paths, `stopAtLevel: 3`, and self-scoped `otherThanBattle` replacement with trash/breeding filters. The condition now explicitly scopes the ten-card count to the trash zone. Exclusive `registerIrCard` confirmed.
- Behavioral evidence: public four-card trash, exact ten-card positive/negative boundary, stop-at-level-3 de-digivolution, and non-battle replacement paths pass. The legal Purple Lv.5 route pays three memory and preserves its source; an off-color route is refused.
- Peer/stack: compared with EX6-058/060/061 Gate replacements and the shared de-digivolve stop boundary; Q3791/Q3792 source and cause constraints are exercised by resolved state. No catalog discrepancy or retained seam.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-056.test.ts --maxWorkers=1 --no-file-parallelism` — 6 tests passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-057 — Lilithmon

#### Contract and evidence

- Catalog: Purple Mega Lv.6, play 11, 11000 DP, Purple Lv.5 evolution cost 3; On Play/When Digivolving gives one opposing Digimon an end-of-your-turn self-delete; All Turns once per turn prevents non-battle leave by deleting a level-5-or-lower Digimon; opponent turn once per turn when another Digimon is deleted trashes opponent security top.
- KB: Q3793 immunity target timing; Q3794 non-battle leave definition; Q3795 confirms the protection cost may delete an opposing level-5-or-lower Digimon.
- IR mapping: `GainTriggeredEffect` now uses the production `EndOfYourTurn` trigger with opponent-turn duration; once-per-turn self replacement; opponent-turn `onDeletionOf` excludes only this source and trashes opponent security. Registration exclusive.
- Behavioral evidence: public opponent-turn deletion/security path, granted end-of-the-target-controller-turn deletion, replacement protection with a level-5 cost, same-turn refusal, and legal Purple Lv.5 evolution plus off-color refusal all pass. Fixture uses explicit inert `BT1-009` security cards.
- Peer/stack: compared with EX6-054/056/058 leave replacements and EX10-058 granted end-of-turn semantics; Q3793–Q3795 are covered by resolved target, duration, cost, and leave-cause state. No catalog discrepancy or retained seam.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-057.test.ts --maxWorkers=1 --no-file-parallelism` — 6 tests passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-058 — Creepymon

#### Contract and evidence

- Catalog: Purple/Red Mega Lv.6, play 12, 12000 DP, Purple or Red Lv.5 evolution cost 4; Blocker; On Play/When Digivolving deletes opponent's lowest-DP Digimon, then trashes one deck card per level of the deleted Digimon; All Turns non-battle leave replacement puts a Seven Great Demon Lords trash card under a Gate of Deadly Sins in breeding.
- KB: Q3796 says no deck trash for a level-less deleted card; Q3797 non-battle leave causes; Q3798 excludes the leaving card itself as replacement material.
- IR mapping: lowestDP deletion, `lastDeletedLevel` scaling, and self-scoped non-battle replacement are direct. Registration exclusive.
- Behavioral evidence: public lowest-DP selection, level-3 scaling boundary, Q3796 level-less zero-scaling negative, non-battle Gate replacement, and legal Red Lv.5 evolution/off-color refusal all pass.
- Peer/stack: compared with EX6-056 and EX6-060 scaling/replacement, including a resolved Seven Great Demon Lords card entering the Gate. Q3796–Q3798 are covered by observable deck, target, and destination state; no catalog discrepancy or retained seam.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-058.test.ts --maxWorkers=1 --no-file-parallelism` — 7 tests passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-059 — Barbamon

#### Contract and evidence

- Catalog: Purple Mega Lv.6, play 12, 12000 DP, Purple Lv.5 evolution cost 4; Scapegoat; On Play/When Digivolving trashes one opponent hand card; All Turns once per turn after any card is trashed from opponent hand may play one Purple card with play cost at most `10 - opponent hand size` from trash.
- KB: Q3169 requires “if this effect deleted” to mean actual deletion; Q3799 allows purple Tamers; Q3800 defines the dynamic play-cost ceiling.
- IR mapping: generated Scapegoat and hand-trash trigger are preserved; hand-trashing watcher filters opponent source and applies `playCostLteScaling` bonus -1 per live opponent hand card to Purple Digimon/Tamers from trash. Exclusive registration.
- Behavioral evidence: public exact ceiling acceptance and above-ceiling rejection tests exist; focused rerun deferred.
- Peer/stack: compared with EX6-051 hand trash and EX6-056/060 purple play/replacement. Q3799 Tamer kind is accepted; no catalog discrepancy or legal evolution stack test.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-059.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (dynamic boundary positive/negative exists; rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-060 — Belphemon: Rage Mode

#### Contract and evidence

- Catalog: Purple/Green Mega Lv.6, play 13, 13000 DP, Purple or Green Lv.5 evolution cost 5; alternate Belphemon: Sleep Mode cost 1; On Play/When Digivolving may trash up to 3 hand cards, suspend one opposing Lv.5-or-lower Digimon per card, then delete all lowest-play-cost suspended opponent Digimon; All Turns non-battle leave replacement puts Seven Great Demon Lords from trash under Gate in breeding.
- KB: Q3801 non-battle leave definition; Q3802 excludes this card itself from replacement material.
- IR mapping: up-to-three hand trash tracked as `trashedCards`, RepeatPerCount suspension, lowestPlayCost all-delete, and self-scoped replacement are direct. Exclusive registration.
- Behavioral evidence: public hand trash/suspension/delete tests plus structural replacement test exist; focused execution deferred.
- Peer/stack: compared with EX6-056/058/061 Gate mechanics; Q3801/Q3802 source/cause semantics match. No catalog discrepancy; full zero-trash and legal alternate-evolution stack remain unproven.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-060.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public positive hand/suspension path, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-061 — Leviamon

#### Contract and evidence

- Catalog: Purple/Blue Mega Lv.6, play 13, 13000 DP, Purple or Blue Lv.5 evolution cost 5; once per turn when an opponent Digimon or own Seven Great Demon Lords is played, trash one hand card to bottom-return up to three sources from one opposing Digimon, then if opponent has no more Digimon/Tamers than you, delete one opposing stackless Digimon; All Turns non-battle leave replacement puts SGDL from trash under Gate in breeding.
- KB: Q3803 confirms self-play triggers; Q3804 non-battle leave; Q3805 excludes self from replacement material.
- IR mapping: OR watcher source filter, hand-trash cost, bottom-three return, board-count condition, stackless deletion, and Gate replacement are direct. Exclusive registration.
- Behavioral evidence: public opponent play, hand-trash cost, bottom-three stack return, stackless deletion, board-count negative, own SGDL once-per-turn refusal, Gate replacement, and legal Blue Lv.5 evolution/off-color refusal all pass. Fixture deck uses inert main-deck `BT1-009`, not a Digi-Egg.
- Peer/stack: compared with EX6-056/058/060 replacement and EX6-059 purple revival; the realistic Lv.5 stack and resolved Gate destination cover Q3803–Q3805. No catalog discrepancy or retained seam.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-061.test.ts --maxWorkers=1 --no-file-parallelism` — 7 tests passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-062 — UltimateChaosmon

#### Contract and evidence

- Catalog: White Mega Lv.7, play 16, 16000 DP; four printed DNA routes: Yellow/Black Lv.6 plus Green/Purple Lv.6, cost 0; Partition (Yellow/Black Lv.6 + Green/Purple Lv.6); DNA-only up-to-two level-6 trash cards under itself, then bottom-return one opposing Digimon per level-6 source; Your Turn at four or more level-6 sources gains Security Attack +3 and Piercing.
- KB: Q3806 restricts DNA to one member from each color group; Q3807 applies the same pairing to Partition; Q4736 says the return tail still resolves when not DNA-digivolving.
- IR mapping: static Partition; DNA-gated up-to-two PlaceUnder; unconditional level-6 stack scaling Return; threshold Auras. The direct module now explicitly carries all four zero-cost DNA recipes, fixing the prior module/catalog omission. Registration is exclusive.
- Behavioral evidence: public four-level-6 threshold keywords, legal Yellow+Green DNA merge with two trash sources and four bottom returns, Q3806 illegal Yellow+Black refusal, and Q4736 normal-evolution return tail all pass.
- Peer/stack: compared with BT18/EX9 DNA recipe declarations and EX6-072. The legal merged stack records both live materials and trash sources, while the illegal pair remains on board; no catalog discrepancy or retained seam.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-062.test.ts --maxWorkers=1 --no-file-parallelism` — 6 tests passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-063 — T.K. Takaishi & Kari Kamiya

#### Contract and evidence

- Catalog: Yellow Tamer, play 4; Start of Main Phase/On Play one Yellow Digimon gains Barrier until opponent turn end; Your Turn when one of your Digimon is played or digivolves, if the post-event Digimon has Angel/Archangel/Three Great Angels, suspend this Tamer to gain 1 memory; Security plays itself.
- KB: Q3808 requires the post-digivolution subject for the trait check.
- IR mapping: StartOfYourMainPhase and OnPlay Barrier grants; YourTurn watchers use `triggerSubjectMatchesFilter` and self-suspension cost; Security PlayWithoutCost. Exclusive registration.
- Behavioral evidence: public On Play and Start-of-Main Barrier timing, exact yellow-only target boundary, Angel play gain with self-suspension, non-Angel negative, post-digivolution Archangel gain (Q3808), and printed memory/evolution costs all pass.
- Peer/stack: compared with EX6-064 and EX6-074 Tamer watchers; the resolved post-digivolution stack proves the subject is evaluated after evolution, while the near-miss red Digimon proves the trait filter. No catalog discrepancy or retained seam; once-per-turn is not applicable because the printed gate is this Tamer's suspension.

Focused command/result: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-063.test.ts --maxWorkers=1 --no-file-parallelism` — 5 tests passed.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-064 — Shu-Chong Wong

#### Contract and evidence

- Catalog: Yellow/Green Tamer, play 4; On Play reveals top 3, adds one Beast/Beastkin/Holy Beast/Cherub trait card and bottoms rest; Your Turn when an effect suspends one own Digimon, by suspending this Tamer, one own Digimon may digivolve into a Beastkin/Holy Beast/Cherub hand card at -2; Security plays itself.
- KB: Q3809 says ordinary evolution requirements remain; Q3810 allows a different own Digimon than the suspended subject.
- IR mapping: RevealAdd union with deck-bottom rest; effect-suspension watcher on any own Digimon; arbitrary own Digimon target, hand source, -2 reduction, and self-suspend cost. Exclusive registration.
- Behavioral evidence: public reveal/add test; public effect-suspension test suspends a different own Digimon's target, pays EX6-033's cost 3 reduced by 2, preserves the source stack, and suspends Shu-Chong; public negative leaves the Tamer, target, hand card, and memory unchanged when the ordinary EX6-033 evolution requirement is illegal. Focused rerun passed in the final 404/404 collection gate.
- Peer/stack: compared with EX6-004's public `whenEffectSuspends` watcher and EX6-063/074 Tamer timing/cost patterns. The positive test uses a legal EX6-032 → EX6-033 stack while BT1-009 is the separately effect-suspended subject, proving Q3810's different-target scope; the negative route proves Q3809's ordinary requirements remain. No catalog discrepancy.

Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-064.test.ts --maxWorkers=1 --no-file-parallelism`. **PASS** in the final 404/404 collection gate.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10 before delivery gates.

### EX6-065 — Mythical Arms of Salvation!

#### Contract and evidence

- Catalog: Red/Black Option, play 3; Legend-Arms controller waives color; Main may place a Legend-Arms Digimon from trash under an own Digimon then place this Option in battle area; All Turns when own Digimon would leave other than by own effect, Delay may play a Legend-Arms card from that Digimon's stack free; Security activates Main.
- KB: Q3815 defines all leave causes; Q3816 confirms a Delay-played RaijiLudomon can use its inherited deletion prevention.
- IR mapping: conditional color waiver, optional trash PlaceUnder, self placement, intrinsic Delay arm on `otherThanYourEffect`, host-filtered digivolution-card play, and Security ActivateMain. Exclusive registration.
- Behavioral evidence: public Main, Security, and Delay leave tests use state assertions; focused rerun deferred.
- Peer/stack: compared with EX6-068/069 Delay options and EX6-042 inherited Scapegoat interaction; Q3815/Q3816 are mapped. No catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-065.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public Main/Security/Delay paths, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-066 — Sea of Destruction

#### Contract and evidence

- Catalog: Blue Option, play 6; Main places an Aqua/Sea Animal Digimon from hand under one own Blue Digimon as bottom source, then returns every opposing Digimon whose level equals the placed card's level; Security returns all opposing lowest-level Digimon.
- KB: Q3817 confirms “the placed card” means the hand card, not the Blue host.
- IR mapping: place cost stores `placedCardLevel`; Return uses `levelEq: placedCardLevel` and all count; Security uses lowest-level all count. Exclusive registration.
- Behavioral evidence: public Main test proves host stack placement and exact level matching, including a different-level survivor; public Security test proves all lowest-level returns. Focused rerun deferred.
- Peer/stack: compared with EX6-058 lowest-DP and EX6-067/071 boundary effects. Q3817 is directly encoded; no catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-066.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (both public branches, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-067 — Final Excalibur

#### Contract and evidence

- Catalog: Yellow Option, play 3; Main unsuspends one Angel/Archangel/Three Great Angels Digimon, or all such Digimon if Dominimon is present; Security Recovery +1 (Deck), then adds itself to hand.
- KB: no entries.
- IR mapping: mutually exclusive Dominimon-present/all and absent/one branches; Security GainKeyword Recovery plus AddToHandSelf. Exclusive registration.
- Behavioral evidence: public tests prove one-versus-all unsuspend and Security Recovery +1/self return. The mixed-pool test unsuspends Angel, Archangel, and Three Great Angels top cards while leaving a suspended Petermon (non-matching top with a Holy Beast source) untouched. Invalid security fixture had been numeric nowhere; the deck card was corrected from Digi-Egg `BT1-001` to inert `BT1-009`, and expected security assertion updated. Focused rerun passed in the final 404/404 collection gate.
- Peer/stack: compared with EX6-063/064 Angel-family filters and EX6-068 security options. The Dominimon-present branch uses a legal EX6-030 stack over BT1-060 and verifies the source remains in the stack; the mixed trait pool proves exact top-card trait semantics and no source-card leakage. No catalog discrepancy or engine seam found.

Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-067.test.ts --maxWorkers=1 --no-file-parallelism`. **PASS** in the final 404/404 collection gate.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10 before delivery gates.

### EX6-068 — Descent of the Three Great Angels

#### Contract and evidence

- Catalog: Yellow Option, play 5; Main may place an Angel/Archangel/Three Great Angels Digimon from hand at bottom security, then place itself in battle area; All Turns when own Angel-family Digimon is deleted, Delay searches security for one Three Great Angels Digimon, may play it free, then shuffles; Security places itself in battle area.
- KB: Q3818 confirms Option placement does not require the optional security card placement.
- IR mapping: optional bottom-security source followed independently by self placement; deletion watcher with intrinsic Delay, security search/play and shuffle; Security self placement. Exclusive registration.
- Behavioral evidence: public accepted and declined placement, Security, and Delay deletion paths exist; focused rerun deferred by the RAM checkpoint.
- Peer/stack: compared with EX6-065/069 Delay and EX6-064 reveal filters. Q3818 is covered by the decline test; no catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-068.test.ts --maxWorkers=1 --no-file-parallelism`. Pending coordinator authorization.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public accept/refusal/Delay/Security paths, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-069 — Rise of the Seven Great Demon Lords

#### Contract and evidence

- Catalog: Purple Option, play 4; Main may place an SGDL Digimon from hand/trash under a Gate of Deadly Sins in breeding, then place itself in battle area; All Turns when own SGDL Digimon is deleted, Delay may play an SGDL card from that Gate's stack; Security places itself.
- KB: Q3819 confirms self placement remains legal when optional Gate placement is declined.
- IR mapping: optional hand/trash PlaceUnder bound to exact-name Gate in breeding, self placement, intrinsic Delay source/host filtering, and Security self placement. Exclusive registration.
- Behavioral evidence: public accepted/declined Main placement, Gate-stack Delay play, and Security tests exist; focused rerun deferred.
- Peer/stack: compared with EX6-065/068 Delay and EX6-056/061 Gate stack mechanics. Q3819 is covered; no catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-069.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public refusal/Delay/Security paths, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-070 — Phantom Pain

#### Contract and evidence

- Catalog: Purple Option, play 4; Main gives an opponent Digimon an end-of-your-turn self-delete, then places this card in battle area; End of Opponent's Turn, if own Lilithmon exists, Delay deletes one opponent unsuspended Digimon; Security activates Main.
- KB: Q3820 says a protected target can be chosen and is deleted once protection expires; Q4255 says a target moved to breeding cannot resolve the pending granted effect.
- IR mapping: generated aura and self placement are preserved; EndOfOpponentsTurn arms Delay only with Lilithmon; Delay Main requires armed keyword and deletes one unsuspended opposing Digimon; Security generated effect remains. Exclusive registration.
- Behavioral evidence: public Main and armed Delay deletion tests plus direct seam guard exist. Added public Security proof deletes one unsuspended opponent Digimon while leaving a suspended peer; public no-Lilithmon proof shows no Delay activation; Q3820 proof chooses a temporarily unaffected target and deletes it after immunity expires; and public P-143 interaction moves the granted target to breeding before the pending delete, proving it does not resolve there (Q4255). Invalid deck fixture was corrected from Digi-Egg `BT1-001` to inert `BT1-009`; focused rerun passed in the final 404/404 collection gate.
- Peer/stack: compared with EX6-057 Lilithmon and EX6-068/069 Delay options. Q3820's target/immunity transition is exercised alongside the Security unsuspended boundary, and the P-143 stack-preserving move supplies a realistic cross-card timing/zone interaction for Q4255. No catalog discrepancy or engine seam found.

Focused command: `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-070.test.ts --maxWorkers=1 --no-file-parallelism`. **PASS** in the final 404/404 collection gate.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2; peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10 before delivery gates.

### EX6-071 — Pandemonium Lost

#### Contract and evidence

- Catalog: Purple Option, play 6; if opponent has 5+ hand cards they must trash one, then delete one opposing Digimon whose level is at least the opponent's post-trash hand size.
- KB: Q3821 confirms the deletion tail still resolves when the initial 5-card condition is false.
- IR mapping: conditional opponent-chosen hand Trash, followed unconditionally by Delete with live opponent-hand count scaling. Exclusive registration.
- Behavioral evidence: public five-card path proves post-trash hand count and deletion; structural check proves unconditional Then. Focused rerun deferred.
- Peer/stack: compared with EX6-051/055 hand-count branches and EX6-066 level-bound target. Q3821 is directly represented; no catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-071.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public positive path and Q3821 structural guard, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-072 — Mega Digimon Assembly!

#### Contract and evidence

- Catalog: White Option, play 4; while opponent has a level-6-or-higher Digimon color requirements may be ignored; Main uses one own level-6 Digimon plus one hand card to DNA digivolve into a level-7 card in hand; Security returns one own level-6-or-higher Digimon from trash then adds this card to hand.
- KB: Q3822 says this Main effect cannot ignore the destination's printed DNA requirements.
- IR mapping: opponent level gate for color waiver; array-zone DnaDigivolve with field and hand materials, level-7 hand destination, normal paid cost; Security return/add. Exclusive registration.
- Behavioral evidence: public DNA into EX6-062 using a legal Black+Green level-6 pair and public Security path; focused rerun deferred.
- Peer/stack: compared with EX6-062 recipes and EX6-074 end-turn DNA. Q3822 is enforced by normal `matchingDnaDigivolveCost`; no catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-072.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public legal DNA and Security paths, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-073 — Ogudomon

#### Contract and evidence

- Catalog: Purple Mega Lv.7, play 16, 16000 DP, Purple Lv.6 evolution cost 7; alternate Lv.5+ SGDL cost 6; When Digivolving/Attacking may place up to seven differently named SGDL cards from trash under itself, and if four or more were placed deletes one opponent Digimon/Tamer; When Attacking, must return seven differently named SGDL sources to deck bottom, delete seven opposing Digimon/Tamers, then trash seven opponent security minus one per actual deletion.
- KB: Q3823 allows Beelzemon and X Antibody as distinct names; Q3824 excludes ACE suffix; Q3825 is activation-local placement count; Q3826 requires all seven payment cards; Q3827 counts actual deletions including prevention; Q6040 keeps the tail live if source leaves during resolution.
- IR mapping: generated effects are corrected with activation-local distinct-name tracking for placements/payment, self-stack bottom return, `namedCountAtLeast` 4 gate, actual-deletion count, and `max(0,7-deleted)` security trash. Exclusive registration.
- Behavioral evidence: public three-deletion/four-security proof, four-placement gate, and focused loose-card stack/duplicate-name scope tests exist; focused rerun deferred.
- Peer/stack: strongest range stack proof; helper tests isolate this host from unrelated stacks and deduplicate names. Q3823/Q3824 name semantics are represented by `distinctNames`; no catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-073.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public Q3825/Q3827-style paths and stack guards, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

### EX6-074 — Mirei Mikagura

#### Contract and evidence

- Catalog: Purple/Yellow Tamer, play 4; Your Turn when an own Holy Beast/Archangel/Fallen Angel Digimon is played, suspend this Tamer to gain 1 memory, then one own Digimon may digivolve into exact Angewomon/LadyDevimon from trash at -1; End of Your Turn once per turn two own Digimon may DNA digivolve into a hand Digimon; Security plays itself.
- KB query: no entries.
- IR mapping: YourTurn trait watcher with self-suspend and arbitrary own Digivolve-from-trash exact-name filter; EndOfYourTurn optional paid DnaDigivolve with `OncePerTurn`; Security self-play. Exclusive registration.
- Behavioral evidence: public Holy Beast memory/suspend, post-play alternate-host trash evolution, once-per-turn DNA, and Security self-play tests exist; focused rerun deferred.
- Peer/stack: compared with EX6-053 exact Mirei condition, EX6-063 Angel-family watcher, and EX6-072 DNA material-zone model. No catalog discrepancy or engine seam found.

Focused command (deferred): `pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-074.test.ts --maxWorkers=1 --no-file-parallelism`. Pending.

Score: Catalog/rules 2/2; IR trace 2/2; behavioral proof 2/2 (public trigger/evolution/DNA/Security paths, rerun pending); peer/stack 2/2; delivery gates 0/2. Provisional total: 8/10.

## Mechanisms

### OPPONENT-TURN-FREQUENCY-MECHANISM

#### Seam

EX6-052's inherited `[Opponent's Turn][Once Per Turn]` watcher listens for an opponent Digimon deletion and may play one Purple level-4-or-lower Digimon from trash. The frequency belongs to the inherited source copy and must reject later matching deletions during that same opponent turn, then re-arm when the next opponent turn begins.

The shared implementation is the `UseTracker` subtrigger ledger. The turn machine calls `clearDurations("ownerTurnStart")` at every real Active phase; `GameEngine` resets that ledger there, before the turn's timing windows and public effect verbs run.

#### Red → green evidence

The card lane originally carried the unresolved seam as a named skipped test: `resets the inherited revival on the next opponent turn (engine turn-boundary seam)`.

The restored test drives the production `runOneTurn()` loop for the first opponent turn, deletes two opposing Digimon through the effect-driven public verb, completes a full owner turn, and drives the next opponent turn. The first deletion revives one Purple level-4 Digimon, the second same-turn deletion is refused, and a deletion on the next opponent turn revives the remaining Purple level-4 Digimon.

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-052.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 7 tests

pnpm --filter @aegis/api exec vitest run src/engine/opponentTurnFrequency.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 1 test
```

The red diagnostic removed `this.tracker.resetForNewTurn()` from the `ownerTurnStart` hook. Both focused tests then failed at the next-opponent-turn revival assertion. Restoring that production line returned both tests to green.

#### Scope decision

No production engine behavior required correction: the existing `ownerTurnStart` reset already follows the real turn machine and the restored behavioral proof is green. The delivered change closes the stale skipped seam with a card-level turn-loop assertion, a reusable engine regression, and this mechanism record.

### RETURN-PLAY-MECHANISM

#### Seam

EX6-031's `wouldBeReturned` watcher resolves two optional `PlayWithoutCost`
actions from the leaving permanent's digivolution stack. `returnToHand` must
await that watcher and its nested play entry windows before collecting the
permanent; the same ordering is used by `returnToDeck`.

#### Red → green evidence

The initial public hand test omitted the testkit's optional-decision responder:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-031.test.ts --maxWorkers=1 --no-file-parallelism
→ 1 failed: "publicly plays exact named cards from its stack after returning to hand"
  Test timed out in 15000ms
```

The watcher is printed as optional. Without an answer, the serialized return
coroutine correctly remains suspended at the optional decision, which made the
timeout look like a hand/deck engine divergence. The deck fixture already
configured `autoAcceptOptional`, so it was green.

The smallest reusable correction is to give the hand fixture the same decision
driver and to retain a mechanism-level regression around the awaited primitive:

```text
pnpm --filter @aegis/api exec vitest run src/cards/EX6/EX6-031.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 13 tests

pnpm --filter @aegis/api exec vitest run src/engine/returnPlaySerialization.test.ts --maxWorkers=1 --no-file-parallelism
→ PASS — 1 file, 1 test
```

The regression asserts that `await returnToHand(...)` does not complete until
both EX6-025 and EX6-023 are on the battle area and EX6-031 is in hand. This
proves the shared serialized `wouldBeReturned` → `PlayWithoutCost` → On Play
chain, rather than substituting a return-to-deck-only check.

#### Scope decision

No production engine behavior was changed: the hand and deck primitives already
share the required awaited `wouldBeReturned` path. The observable defect was an
incomplete hand-test decision fixture; the new engine regression guards the
reusable behavior and the public hand/deck tests now exercise both destinations.

### Review notes and closed investigations

#### Coordinator decisions

- Printed catalog text and local KB/rules are the behavior contract.
- Card modules must register exclusively through `registerIrCard(cardId, compiled)`.
- Existing audit claims are context only; this run requires fresh per-card evidence and fresh gates.

#### Engine seam queue

No seams reported yet.

#### Fixture traps

- No Digi-Egg cards in deck or security fixtures.
- No injected timing (`advance.fire`, `fireTiming`, or `fireSubTrigger`) as behavioral proof.
- Evolution proof must assert cost and resulting stack, not only `{ ok: true }`.
- Once-per-turn proof must include same-turn refusal and next-turn reset.

### Source reconciliation

Catalog discrepancies against authoritative source evidence are recorded here by the coordinator.

No discrepancies recorded yet.

## Knowledge base index

Freshly generated with `node tools/kb/query.mjs card <ID>` on 2026-09-09. An em dash means the query returned no card-specific Q&A identifier; it is not a claim that no general rule applies.

- `EX6-001`: —
- `EX6-002`: —
- `EX6-003`: Q3692, Q3693
- `EX6-004`: —
- `EX6-005`: —
- `EX6-006`: Q3694, Q3695, Q3696, Q3697, Q3698, Q3699, Q3700
- `EX6-007`: Q3701
- `EX6-008`: Q3702
- `EX6-009`: Q3703
- `EX6-010`: Q3704, Q3705, Q3706
- `EX6-011`: Q3707
- `EX6-012`: —
- `EX6-013`: Q3708
- `EX6-014`: —
- `EX6-015`: Q3709, Q3710, Q3711
- `EX6-016`: —
- `EX6-017`: Q3712, Q3713
- `EX6-018`: Q3714, Q3715, Q3716, Q5002
- `EX6-019`: —
- `EX6-020`: Q3717, Q3718
- `EX6-021`: Q3719
- `EX6-022`: —
- `EX6-023`: Q3720, Q3721, Q3722, Q3723, Q3724, Q3725
- `EX6-024`: Q3726, Q3727, Q3728, Q3729, Q3730, Q3731
- `EX6-025`: Q3732, Q3733, Q3734, Q3735, Q3736, Q3737
- `EX6-026`: Q3738, Q3739, Q3740, Q3741, Q3742, Q3743
- `EX6-027`: Q3744, Q3745, Q3746
- `EX6-028`: Q3747
- `EX6-029`: —
- `EX6-030`: Q3748, Q3749, Q3750
- `EX6-031`: Q3751, Q3752, Q3753, Q3754
- `EX6-032`: —
- `EX6-033`: —
- `EX6-034`: Q3755
- `EX6-035`: Q3756, Q3757, Q5726, Q5727
- `EX6-036`: Q3758, Q3759
- `EX6-037`: Q3760
- `EX6-038`: Q3761
- `EX6-039`: —
- `EX6-040`: Q3762
- `EX6-041`: Q3763
- `EX6-042`: Q3764, Q3765, Q3766, Q3767, Q3768, Q3816
- `EX6-043`: Q3769
- `EX6-044`: Q3770, Q3771
- `EX6-045`: Q3772, Q3773, Q3774, Q3775, Q3776
- `EX6-046`: Q3777
- `EX6-047`: Q3778, Q3779, Q3780
- `EX6-048`: Q3781, Q3782, Q3783, Q3784, Q3785, Q3786
- `EX6-049`: —
- `EX6-050`: —
- `EX6-051`: —
- `EX6-052`: —
- `EX6-053`: —
- `EX6-054`: Q3084, Q3787, Q3788, Q3789, Q3790
- `EX6-055`: —
- `EX6-056`: Q3791, Q3792
- `EX6-057`: Q3793, Q3794, Q3795
- `EX6-058`: Q3796, Q3797, Q3798
- `EX6-059`: Q3169, Q3799, Q3800
- `EX6-060`: Q3801, Q3802
- `EX6-061`: Q3803, Q3804, Q3805
- `EX6-062`: Q3806, Q3807, Q4736
- `EX6-063`: Q3808
- `EX6-064`: Q3809, Q3810
- `EX6-065`: Q3815, Q3816
- `EX6-066`: Q3817
- `EX6-067`: —
- `EX6-068`: Q3818
- `EX6-069`: Q3819
- `EX6-070`: Q3820, Q4255
- `EX6-071`: Q3821
- `EX6-072`: Q3822
- `EX6-073`: Q3823, Q3824, Q3825, Q3826, Q3827, Q6040
- `EX6-074`: Q3811, Q3812, Q3813, Q3814

## Open items

- No card is below 10/10; the engine seam queue is empty and `docs/audits/EX6-reaudit/SOURCE-RECONCILIATION.md` recorded no catalog discrepancy (`0c3b8f6a1`).
- Contradiction, resolved in favour of the newer source: `docs/audits/EX6-LUNA-REAUDIT.md` (2026-08-27, `d9d57ae08`) states that its five card corrections (EX6-001, EX6-004, EX6-005, EX6-057, EX6-074) and the matching test updates were never executed, so it claims no behavioral gate. The 2026-09-09 re-audit executed every EX6 test and is the current evidence.
- Contradiction, resolved in favour of the newer source: `docs/audits/EX6-AUDIT.md` (2026-09-04, `3bf5a5466`) closes at 74/74 files and 365/365 tests, while the winning re-audit closes at 74/74 files and 404/404 tests. The higher count is the later run, which added the missing public negative, once-per-turn and evolution-stack proofs that report reconciliation found lacking on 15 cards.
- Investigations closed during the run rather than left open: EX6-018's optional no-target evolution now preserves its mandatory security cost; EX6-031's return-to-hand hang was diagnosed as an incomplete hand fixture with no production engine divergence; EX6-062 now declares the four printed DNA recipes.
- Deferred command that was later run: the collection gate in `docs/audits/EX6-TEST-QUEUE.md` was embargoed behind unrelated Vitest process groups. The final gates above show it completed.

## History

- `docs/audits/EX6-AUDIT.md` — last at `3bf5a5466`, 2026-09-04. Card-ID-ordered evidence ledger with per-card declaration counts; superseded by the 2026-09-09 re-audit.
- `docs/audits/EX6-LUNA-REAUDIT.md` — last at `d9d57ae08`, 2026-08-27. Three-agent static reaudit with five card corrections and no executed tests.
- `docs/audits/EX6-REAUDIT-LEDGER.md` — last at `0c3b8f6a1`, 2026-09-09. Winning scoring table; merged into the Card ledger section above.
- `docs/audits/EX6-TEST-QUEUE.md` — last at `eb1a58b75`, 2026-09-05. Runtime and collection gate checklist with the embargo conditions and the exact collection command; its command and outcome are recorded under Gates.
- `docs/audits/EX6-reaudit/` — last at `0c3b8f6a1`, 2026-09-09. 74 per-card reports plus `KB-INDEX.md`, `RUN.md`, `REVIEW-NOTES.md`, `SOURCE-RECONCILIATION.md`, `WORKER-BRIEF.md`, two `*-MECHANISM.md` reports, and a stray `TEST-ME.md` placeholder. All merged above except the worker brief and the placeholder.
- `docs/audits/collections-summary.md` — never committed (untracked), generated 2026-08-22. Cross-set status table, deleted in favour of the generated index in `docs/audits/README.md`. It was the only record of this delivery evidence for EX6: commit `0580457dc`.
