# Piercing across direct and ordinary battles

BT25-020 Q6280/Q6281 and EX11-074 Q5957–Q5959 require one Piercing security check after a successful Digimon attack when that attacker deleted an opponent in an earlier direct effect battle. A later ordinary battle's deletion prevention does not erase that eligibility. A different Digimon's effect battle and a battle outside an attack do not qualify.

The ordinary Q6281 test failed before the fix: the protected ordinary victim survived, but `securityChecked` count was 0 instead of 1. The initial worker marked it `it.fails`; Astra restored a normal assertion, corrected the Barrier event wait, and accounted separately for Marsmon's security trash, Barrier payment, and the required security check. Red log: `/tmp/bt25-audit-logs/020-piercing-red.log`.

`combat/controller.ts` previously disabled Piercing for every direct effect battle. The minimal correction records eligibility on the current attack only when that same attacker wins and deletes an opponent with Piercing active. The normal attack flow consumes it once after a successful Digimon battle and before End of Attack. Current-attack cleanup clears it. Existing battle reactions and security-check processing remain the shared mechanisms.

Persistent proof:

- `BT25-020.test.ts`: direct-plus-ordinary deletion yields one check; a Barrier-protected ordinary loser still permits the earlier direct-battle Piercing; direct battle outside an attack yields none.
- `engine/directBattlePiercing.test.ts`: a different own Piercing Digimon cannot credit Marsmon's attack; removing the original attack target in the direct battle does not turn a failed attack into a security check; a second completed winning attack with Barrier and no battle deletion does not reuse the first attack's eligibility.

Astra strengthened the second-attack control to answer Barrier explicitly and wait for completed combat. Before that correction, its final assertions ran while combat was paused despite `pendingDecision` being empty.

Validation:

- `pnpm --filter @aegis/api exec vitest run src/cards/BT25/BT25-020.test.ts src/engine/directBattlePiercing.test.ts --maxWorkers=1 --no-file-parallelism`: **22 passed**.
- `pnpm --filter @aegis/api exec vitest run src/engine/directBattlePiercing.test.ts src/engine/combatBattle.test.ts src/engine/interactionAudit.test.ts src/engine/mechanic.test.ts src/engine/securityCheckAnnouncement.test.ts src/engine/security/securityCheck.test.ts src/engine/conformance/ch16a-security-blocker-draw.test.ts src/cards/EX11/EX11-074.test.ts src/cards/BT25/BT25-020.test.ts --maxWorkers=1 --no-file-parallelism`: **9 files, 222 passed**. Log: `/tmp/bt25-audit-logs/piercing-mechanisms.log`.
- Targeted Oxlint and Oxfmt pass. `pnpm typecheck` passed for shared, API and web (`/tmp/bt25-audit-logs/piercing-typecheck.log`). Final collection revalidation follows the latest card changes.

The subsequent Marsmon timing, non-TS winner, and duration additions pass: the five-file integration command recorded in VALIDATION.md passes 72 tests, including 22 Marsmon tests and three direct-battle controls. These results do not complete the collection audit.

Independent Luna review found no timing, attacker-identity, failed-attack, or deletion regressions. Current API typecheck also passes after resolving an unrelated in-progress BT25-030 cost field type error.
