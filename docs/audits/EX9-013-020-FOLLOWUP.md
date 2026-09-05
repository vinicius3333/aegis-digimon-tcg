# EX9-013 / EX9-020 Follow-up

Final validation: **77 EX9 files / 924 tests**, **13 mechanism files / 504 tests**, **106 shared evolution tests**, shared/API/web serial typecheck, effects check and scoped style checks passed. See [EX9-AUDIT.md](EX9-AUDIT.md) for authoritative final gates; smaller counts below are historical focused runs.

## EX9-013 BlitzGreymon

Catalog clauses were reconciled: alternate evolution from Lv.5 Greymon-name or
DM, hand Counter Blast Digivolve, Alliance, Blocker, On Play/When Digivolving
De-Digivolve 3, end-of-turn optional DNA into Omnimon Alter-S followed by an
optional attack, and inherited Security Attack +1. The module already encoded
all clauses through `registerIrCard`; no module correction was necessary.

`EX9-013.test.ts` now includes a real opponent attack, Counter response, free
Blast Digivolve into an existing host, hand movement, and unchanged memory.
Existing coverage also exercises a real end-of-turn DNA evolution and follow-up
attack, including Alter-S's resulting material/security state. New combat
coverage proves Alliance suspension/DP/security behavior and Blocker
interception. Inherited Security Attack +1 is proven by comparing a legal
EX9-013→BT5-086 evolution (two checks) with direct BT5-086 (one check).
Boundary cases prove De-Digivolve 3 on a full level 6→5→4→3
stack and the shorter-stack stop. Optional DNA refusal is also proven. Score:
**10/10**.

## EX9-020 CresGarurumon

Catalog clauses were reconciled: alternate evolution from Lv.5 Garurumon-name
or DM, Counter Blast Digivolve, Alliance, Blocker, On Play/When Digivolving
bottom-deck of an opposing level-5-or-lower Digimon, inherited Your Turn attack
target lock, and All Turns replacement DNA when a level-6 Digimon leaves other
than in battle. The module already encoded these clauses through
`registerIrCard`; no module correction was necessary.

`EX9-020.test.ts` proves real On Play bottom-deck behavior and distinguishes
battle deletion (no DNA replacement) from non-battle deletion (DNA replacement
into Omnimon Alter-S). Structural assertions cover both alternate evolution
routes, keywords, target level ceiling, and inherited restriction. The
non-battle test also verifies the resulting DNA host. New combat coverage proves
Alliance suspension/DP/security behavior and Blocker interception. The
inherited target-lock interaction is proven on a real EX9-021 DNA host whose
stack contains EX9-020; the same card played without inheritance remains
redirectable. Level-5 inclusion and level-6 exclusion boundaries, plus the
hand-triggered Blast route, are also proven. Score: **10/10**.

## Commands

Focused EX9-013 and EX9-020 runs were green after these additions. The
combined count is omitted because the two files were not rerun together after
the last incremental additions.

`git diff --check` — passed. No files were staged or committed.
