# ST1 proof audit

Coordinator review: 2026-09-05. The 16 committed ST1 catalog records, local KB
queries, direct IR modules and focused assertions were reviewed. All modules
retain exclusive `registerIrCard` registration. This report supersedes the
uniform `2/2` counts in the provisional ST1–ST8 report.

| Card                       | Behavioral evidence                                                                                                                                                   | Score |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| ST1-01 Koromon             | Three/four source boundary including the egg, owner-turn gate, and activation during a real evolution line.                                                           | 10/10 |
| ST1-02 Biyomon             | Observable printed DP and exact vanilla level/color/play/evolution contract.                                                                                          | 10/10 |
| ST1-03 Agumon              | Inherited +1000, opponent-turn removal, and source transition after legal evolution.                                                                                  | 10/10 |
| ST1-04 Dracomon            | Observable printed DP and exact vanilla level/color/play/evolution contract.                                                                                          | 10/10 |
| ST1-05 Birdramon           | Observable printed DP and exact vanilla level/color/play/evolution contract.                                                                                          | 10/10 |
| ST1-06 Coredramon          | Live Blocker; actual blocking in ST1-09; attack memory loss and attack completion after crossing memory (Q602).                                                       | 10/10 |
| ST1-07 Greymon             | Inherited check absent on top, present under a host; real additional security checks after evolution.                                                                 | 10/10 |
| ST1-08 Garudamon           | Legal evolution, self-selected +3000, unchanged ally, and turn-end expiry (Q603).                                                                                     | 10/10 |
| ST1-09 MetalGreymon        | Actual Blocker intervention gains 3; a direct Digimon attack does not (Q604); legal source transition.                                                                | 10/10 |
| ST1-10 Phoenixmon          | Observable printed DP and exact vanilla level/color/play/evolution contract.                                                                                          | 10/10 |
| ST1-11 WarGreymon          | Two/three/four source rounding, opponent-turn removal, and four actual checks with inherited Greymon (Q605).                                                          | 10/10 |
| ST1-12 Tai Kamiya          | Two copies stack only on own Digimon/turn; actual Security attack plays the Tamer (Q606).                                                                             | 10/10 |
| ST1-13 Shadow Wing         | Main +3000; Security grant also reaches later entrants and expires after the next own turn (Q607). Main uses the same turn-duration DP mechanism exercised by ST1-08. | 10/10 |
| ST1-14 Starlight Explosion | Main/Security +7000 security-DP ledger values and both distinct expiry boundaries.                                                                                    | 10/10 |
| ST1-15 Giga Destroyer      | Two eligible targets including 4000, stronger survivor, optional zero selection, Security activation and source trash (Q608).                                         | 10/10 |
| ST1-16 Gaia Force          | Selected high-DP opponent deleted, other opponent preserved, source trash and Security activation (Q609).                                                             | 10/10 |

The added historical-deck case legally evolves Agumon → Greymon → MetalGreymon
→ WarGreymon. It verifies each memory payment, draw, physical source order,
inherited DP/check activation and the completed four-check attack. The two
previous cases cover prebuilt stacks; they did not themselves prove the
multi-step evolution claimed by the provisional report.

Validation in the audit worktree, with `--pool=forks --maxWorkers=1
--no-file-parallelism`: focused historical deck 1 file / 3 tests passed; full
ST1 collection 18 files / 45 tests passed. The new test received independent
Luna review. Shared engine conformance passed 28 files / 387 tests, and all
workspace projects passed typechecking (API after the unrelated ST20 fixture
typing correction).

ST1 is 16/16 at the reviewed 10/10 evidence score. Overall completion still
requires the remaining 22 collections and final integrated validation.
