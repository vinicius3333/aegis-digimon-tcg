# ST2 proof audit

Date: 2026-09-05. All 16 starter cards retain exclusive direct IR registration.
The current review covers committed catalog clauses, local rulings and observable
test outcomes. This supersedes historical completion claims for this collection.

| Card | Reviewed evidence | Score |
| --- | --- | --- |
| ST2-01 | Exact battle bonus against source-less opponents, blocked attack survival, opponent-turn negative; corrected blocker event subjects | 10/10 |
| ST2-02 | Vanilla identity and printed costs | 10/10 |
| ST2-03 | Bottom-source removal and level boundary | 10/10 |
| ST2-04 | Vanilla identity and printed costs | 10/10 |
| ST2-05 | Vanilla identity and printed costs | 10/10 |
| ST2-06 | Exact bottom-source attack removal | 10/10 |
| ST2-07 | Blocker combat and attack memory cost | 10/10 |
| ST2-08 | Source-less opponent gate; actual extra security check after stripping the final source | 10/10 |
| ST2-09 | Exact two-bottom-source evolution removal | 10/10 |
| ST2-10 | Vanilla identity and printed costs | 10/10 |
| ST2-11 | Real attack unsuspend, second-attack once-per-turn restriction, legal evolution stack | 10/10 |
| ST2-12 | Start-turn memory and actual Security play | 10/10 |
| ST2-13 | Main and Security memory outcomes | 10/10 |
| ST2-14 | Source-less target, retained restrictions after source addition, separate duration boundaries | 10/10 |
| ST2-15 | Exact host/source identity, printed Option cost, free source play, DP isolation, unsuspended entry, attack prohibition, Security | 10/10 |
| ST2-16 | Opponent return-to-hand and source trash | 10/10 |

The new evolution-line proof evolves Gabumon through Garurumon and WereGarurumon
into MetalGarurumon, paying 2/3/4 memory and drawing three exact instances. Two
completed attacks strip both opposing sources, apply the extra security check only
after the last source leaves, and respect MetalGarurumon's once-per-turn unsuspend.

Tsunomon's `whenBlocked` watcher previously matched the original attacker as an
opponent and checked the wrong battle participant. It now binds its own attacking
host and checks the source-less opposing blocker. Real printed 7000-DP combat
proves the inherited +1000 changes the outcome; on the opponent's turn the tied
battle instead deletes both Digimon.

Kaiser Nail pays exactly its printed cost of 4. The new Digimon has printed DP and
does not inherit the old host's temporary +4000 DP. Egg/Tamer sources remain under
the host, and the selected physical Digimon instance enters play unsuspended.

Serial validation (`--pool=forks --maxWorkers=1 --no-file-parallelism`):

- Full ST2: 18 files, 53 tests passed.
- Tsunomon plus affected Vortex/mechanism regression: 10 files, 79 tests passed.
- Changed-file lint, format and diff checks passed at integration.

The overall 343-card audit and pending shared-engine changes remain incomplete.
