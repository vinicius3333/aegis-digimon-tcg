# EX12-051–050 Audit Wave

## EX12-051 — Lamortmon — 10/10

The catalog and direct handwritten module were checked for Reboot, Blocker, the On Play/When Digivolving suspend-then-De-Digivolve sequence, and the inherited battle-win security trash watcher. The module installs a live `whenBattleWon` watcher scoped to the current permanent and filters the source's Angoramon-in-text/NSp trait before trashing the opponent's top security. Existing colocated behavioral tests cover the static keywords and battle-win watcher. Static inspection and `git diff --check` pass; focused Vitest/typecheck are unavailable because the workspace lacks installed pnpm/Vitest executables.

## EX12-050 — SymbareAngoramon — 10/10

The catalog and generated IR were checked for both alternate evolution routes, the once-per-turn Main choice to play or use an Angoramon-in-text/NSp card with cost reduced by 2, and inherited +1000 DP. The two action branches retain the exact Digimon/Option distinction and optionality. A colocated test now asserts the shared timing, both reduced-cost branches, evolution requirements, and inherited DP effect. Static inspection and `git diff --check` pass; focused Vitest/typecheck remain environment-blocked only.
