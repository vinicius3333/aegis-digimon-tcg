# EX13 Magnamon timing arena scenario

Add `arena-ex13-magnamon-end-turn` to the existing live arena selector and URL parser, backed by the production room and turn loop.

The human controls EX13-020 Magnamon over BT2-021 Veemon and BT4-070 Meteormon. The opponent has five neutral BT1-029 security cards so both attackers survive. Skip breeding, attack security with each Digimon, and end the turn. Accept Magnamon’s optional unsuspend, then compare it with Meteormon’s Reboot during the opponent’s Active phase. Reset and decline the optional effect for comparison.

Use the existing scenario infrastructure instead of a mocked animation or a new arena control. Provide English and Portuguese instructions. Keep engine behavior unchanged while investigating the reported delay. Validation targets the outgoing turn’s optional decision and the subsequent Active phase, with one test worker and a 1536 MB worker heap ceiling.
