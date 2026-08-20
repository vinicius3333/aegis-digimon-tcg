# EX12-052 Audit Wave

## EX12-052 — Diarbbitmon — 10/10

Catalog and KB evidence: the committed catalog was checked for both alternate level-5 evolution routes, Piercing, Vortex, the When Digivolving immunity clause, and the shared When Digivolving/When Attacking/Counter +3000 DP-then-battle clause. The local card query returned the relevant EX12 knowledge-base material; no unresolved card-specific ambiguity remains.

Implementation and proof: the immunity effect remains a separate unlimited When Digivolving clause. The three routes for the +3000 DP/battle ability now use one stable `effectKey` and `maxPerTurn: 1`, so activating one route consumes the printed once-per-turn limit for the other routes as well. The existing direct module retains the exact own-Digimon and opponent-Digimon target boundaries, optional battle, and costless Use Requirement waiver.

Verification: a colocated test asserts the shared key and once-per-turn budget across all three timings and confirms the immunity clause is separate. Static inspection and `git diff --check` pass. Focused Vitest remains unavailable because the workspace has no installed Vitest binary.
