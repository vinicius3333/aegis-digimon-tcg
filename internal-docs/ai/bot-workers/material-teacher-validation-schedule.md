# Validation seat-1 effect DigiXros: schedule diagnosis

What is proven: every 880-game block starts at producer index 0, and the validation fold follows the original `index % 5 == 0` rule. So every block replays the same four validation seat-1 cells for the only two recipes that can produce effect DigiXros; only the seed changes. That restriction is proven. What caused zero labels in those cells is not: the four matchups may be unfavorable, or the zero may be chance. This note does not clear or blame the expert helper.

This is a source and receipt diagnosis only. I made no remote reads or mutations and ran no jobs or models. The `collect.py`, `bridge.py`, `learning_mechanisms.py`, qualified source and expert entry/policy are all unchanged.

## Inputs (read-only)

- **ROOT scripts.** `bridge.py` `scheduled_episode`: learner = `i % 44`, opponent = `(learner + i // 88) % 44`, seat = `(i // 44) % 2`. `collect.py`: config seed = `--seed + i`, `--games N`. Its only options are `--worker --output --node --games --seed --workers --curriculum --checkpoint --device`; there is no start-index or cohort option. `learning_mechanisms.py`: fold = validation iff the episode file index `% 5 == 0`.
- **Recipe order.** From the qualified `--describe-curriculum` (44 recipes). Only two recipes hold EX13-064 together with EX10-031 and both of its materials, EX10-026 and EX10-027:
  - 18 `ex13-lordknightmon-royal-knights@1` (4 / 3 / 3 / 3 copies)
  - 40 `curriculum-bagra-darkknightmon@1` (2 / 4 / 4 / 4 copies)
- **ROOT closed receipts.** `closed-learning-r2-{contexts,contexts-1..4}.actual.json` and `closed-learning-gap-contexts-{5,6}.actual.json`. Contexts-6's full consumer passed (completion `36daa7f1…`, report `39adad43…`). Across the 5716 closed teacher games, only validation `effectDigiXrosMaterial:seat1` is still missing.

## Actual effect DigiXros labels per closure

| Closure | Games, seed | TRAIN seat 0 | TRAIN seat 1 | VAL seat 0 | VAL seat 1 |
| --- | --- | --- | --- | --- | --- |
| contexts | 436, 6202500 | 0 | 0 | 0 | 0 |
| contexts-1 | 880, 6000000 | 0 | 0 | 0 | 0 |
| contexts-2 | 880, 6000880 | 0 | 1 (row 854 = i 854: learner 18 vs DATA SQUAD Ravemon) | 0 | 0 |
| contexts-3 | 880, 6001760 | 0 | 2 | 2 | 0 |
| contexts-4 | 880, 6002640 | 5 | 1 | 0 | 0 |
| contexts-5 | 880, 6003520 | 3 | 3 | 0 | 0 |
| contexts-6 | 880, 6004400 | 1 | 6 | 2 | **0** |

Counts are labelled rows, not games.

## Schedule cells for recipes 18 and 40 (identical in every 880 block)

| Index i | Learner | Seat | Offset k | Opponent | Fold |
| --- | --- | --- | --- | --- | --- |
| 150 | 18 | 1 | 1 | EX13 Gallantmon | **VAL** |
| 260 | 40 | 1 | 2 | Appmon Sociamon / Gossipmon / Charismon | **VAL** |
| 590 | 18 | 1 | 6 | EX13 Examon | **VAL** |
| 700 | 40 | 1 | 7 | BT26 Toho Braves | **VAL** |
| 40, 370, 480, 810 | 40, 18, 40, 18 | 0 | 0, 4, 5, 9 | Bagra (mirror), EX13 Kentaurosmon, BT26 Abbadomon, DATA SQUAD Ravemon | VAL seat 0 |
| 16 other seat-1 cells | 18 and 40 | 1 | 0–9 | offsets 0–9 only | TRAIN |

An 880-game block only reaches opponent offsets 0–9. Across all six 880 blocks, validation seat 1 for recipes 18 and 40 was these same four matchups, 24 games in total; 16 of them came from contexts-3 onward. The 436-game block added cells 150 and 260 again. Episode 260 in the earlier refusal fixture is cell 260 (Bagra vs Appmon), as expected.

## Longer single block vs repeated 880 blocks

| `--games` | VAL seat-1 games (recipes 18 + 40) | Distinct matchups | TRAIN seat-1 games | Per 1000 games |
| --- | --- | --- | --- | --- |
| 880 | 4 | 4 (always the same) | 16 | 4.55 |
| 1760 | 8 | 8 (adds Purple BEATBREAK, BT26 Chronomon, DS Sangomon, EX13 Mamemon) | 32 | 4.55 |
| 2640 | 12 | 12 | 48 | 4.55 |
| 3872 (= 88 × 44; rejected, see below) | 18 | 18 | 70 | 4.65 |
| **3960 (= 9 × 440, ROOT's choice)** | 18 | 18 (14 never scheduled before) | 72 | 4.55 |
| 4400 | 20 | 20 | 80 | 4.55 |

The yield per game is the same for every block length. A longer block does not make validation seat-1 games cheaper; it spreads them over new opponents instead of replaying the four that have given zero across about 16 expert-era games. At 3872 games or more, each learner meets every opponent at least once per seat.

**A targeted cohort is not possible with the unchanged CLI.** There is no start-index, learner or opponent filter, and selecting games by seed would change only the seed, not the cell. Any cohort would need new producer code, which is outside this scope.

## Next producer (ROOT decides and launches)

**Correction.** My earlier recommendation of `--games 3872` was invalid. The original operator's `blocks()` guard requires every context expansion to be a multiple of 440, so that the original schedule and `index % 5` fold periods are preserved. 3872 is not a multiple of 440.

ROOT chose **3960**, the next multiple of 440 that is at least 3872. It still covers all 44 opponent offsets for both learner recipes and seats. The block is contexts-7: seed 6005280, games 3960, seeds 6005280–6009239. It stays clear of 6202400+ and the reserved final 6210000–6213871. ROOT's fresh seed scanner must still confirm the interval before launch.

**What it keeps:**

- **Folds.** Natural games and the original `index % 5` folds.
- **Coverage.** Indices 0–879 contain every cell of an 880-game block, so earlier coverage, including the 181 training identities and the eight families, is a superset.
- **Unchanged inputs.** The qualified source and fingerprint, the four checkpoints and the expert entry/policy are unchanged, and no model is imported.

The operator is `tools/bot-training/operators/material-teacher-rotation-learning.py`; see `material-teacher-rotation-learning.md`.

**A targeted cohort is still not possible with the unchanged CLI.** There is no start-index, learner or opponent option.

## Evidence limits

- **Rows vs games.** Coverage counts rows, not games, and I did not read raw episodes.
- **Chance of success.** From contexts-3 to contexts-6, training seat 1 produced 12 labelled rows across 64 scheduled games, while the 16 repeated validation games produced none. Rows and games are not equivalent, so I make no probability claim. A 3960-game block offers 14 new validation matchups; it carries no guarantee of a validation seat-1 label.
- **Expert phases.** I assumed the expert entry was active from contexts-3 on, which matches the adapter's expert phases. The receipts record the driver as `teacher` and do not name the entry.
