# Validation seat-1 effect DigiXros: schedule diagnosis

**The gap is structural.** Every 880-game block starts at producer index 0. The validation fold follows the original `index % 5 == 0` rule. So every block replays the same four validation seat-1 cells for the only two recipes that can produce effect DigiXros. Only the seed changes. The helper is not at fault.

This is a source and receipt diagnosis only. I made no remote reads or mutations and ran no jobs or models. The `collect.py`, `bridge.py`, `learning_mechanisms.py`, qualified source and expert entry/policy are all unchanged.

## Inputs (read-only)

- **ROOT scripts.** `bridge.py` `scheduled_episode`: learner = `i % 44`, opponent = `(learner + i // 88) % 44`, seat = `(i // 44) % 2`. `collect.py`: config seed = `--seed + i`, `--games N`. Its only options are `--worker --output --node --games --seed --workers --curriculum --checkpoint --device`; there is no start-index or cohort option. `learning_mechanisms.py`: fold = validation iff the episode file index `% 5 == 0`.
- **Recipe order.** From the qualified `--describe-curriculum` (44 recipes). Only two recipes hold EX13-064 together with EX10-031 and both of its materials, EX10-026 and EX10-027:
  - 18 `ex13-lordknightmon-royal-knights@1` (4 / 3 / 3 / 3 copies)
  - 40 `curriculum-bagra-darkknightmon@1` (2 / 4 / 4 / 4 copies)
- **ROOT closed receipts.** `closed-learning-r2-{contexts,contexts-1..4}.actual.json` and `closed-learning-gap-contexts-5.actual.json`. `closed-learning-gap-contexts-6.actual.json` is **0 bytes** locally, so contexts-6 is known only from ROOT's provisional raw report `39adad43…`.

## Actual effect DigiXros labels per closure

| Closure | Games, seed | TRAIN seat 0 | TRAIN seat 1 | VAL seat 0 | VAL seat 1 |
| --- | --- | --- | --- | --- | --- |
| contexts | 436, 6202500 | 0 | 0 | 0 | 0 |
| contexts-1 | 880, 6000000 | 0 | 0 | 0 | 0 |
| contexts-2 | 880, 6000880 | 0 | 1 (row 854 = i 854: learner 18 vs DATA SQUAD Ravemon) | 0 | 0 |
| contexts-3 | 880, 6001760 | 0 | 2 | 2 | 0 |
| contexts-4 | 880, 6002640 | 5 | 1 | 0 | 0 |
| contexts-5 | 880, 6003520 | 3 | 3 | 0 | 0 |
| contexts-6 (provisional) | 880 | — | — | — | 0 per ROOT |

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
| 3872 (= 88 × 44) | 18 | 18 | 70 | 4.65 |
| 4400 | 20 | 20 | 80 | 4.55 |

The yield per game is the same for every block length. A longer block does not make validation seat-1 games cheaper; it spreads them over new opponents instead of replaying the four that have given zero across about 16 expert-era games. At 3872 games, each learner meets every opponent once per seat.

**A targeted cohort is not possible with the unchanged CLI.** There is no start-index, learner or opponent filter, and selecting games by seed would change only the seed, not the cell. Any cohort would need new producer code, which is outside this scope.

## Recommended next producer (ROOT decides and launches)

Run **one fresh block with the unchanged CLI and `--games 3872`**. Use the reviewed expert entry (`180c…`), `--curriculum`, a new contiguous seed interval, and no checkpoint or device.

**Why 3872:** it is the smallest block that rotates through all 44 opponent offsets. That gives 18 distinct validation seat-1 matchups for recipes 18 and 40, 14 of them never scheduled before.

**What it keeps:** natural games and original `index % 5` folds. Indices 0–879 include every cell an 880 block has, so it is a superset of earlier coverage, including the 181 training identities and the eight families. The qualified source, fingerprint, four checkpoints and expert behavior are unchanged, and no model is imported.

**Cheaper option:** `--games 1760` costs about half and adds 4 new matchups, but its chance of closing the gap is lower.

**Seeds:** if contexts-6 used 6004400–6005279, then 6005280–6009151 stays clear of 6202400+ and the final 6210000–6213871. ROOT's fresh scanner must confirm this, because the contexts-6 seed is not in a local receipt.

## Evidence limits

- **Contexts-6** is provisional; its local receipt file is empty.
- **Rows vs games.** Coverage counts rows, not games, and I did not read raw episodes.
- **Chance of success.** The TRAIN seat-1 rate after contexts-3 is about 6 rows in about 48 games. At that rate, zero in about 16 validation games is unlikely but possible by chance. The diagnosis therefore shows **limited opponent diversity**; it does not prove that those four matchups are unfavorable. Whether 3872 closes the gap remains a probability, roughly 2 expected rows, not a guarantee.
- **Expert phases.** I assumed the expert entry was active from contexts-3 on, which matches the adapter's expert phases. I did not verify contexts-5 or contexts-6 locally.
