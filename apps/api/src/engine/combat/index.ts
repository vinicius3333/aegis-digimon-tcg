/**
 * Combat resolution and the block window (subsystem: attack-and-block;
 * source: documented behavior, documented behavior, documented behavior IBattle).
 *
 * `resolve.ts` holds the pure DP-comparison resolver (shared with
 * security-and-win-check); `legality.ts` holds the attack/block legality
 * predicates. The attack ACTION flow (block window, timings, suspend, hand-off to
 * security-and-win-check) lives in engine/actions (attack-and-block).
 */
export {
  compareDP,
  resolvePermanentBattle,
  resolveSecurityBattle,
} from "./resolve.js";
export type {
  CombatComparison,
  Combatants,
  CombatOutcome,
  SecurityBattle,
  SecurityBattleOutcome,
} from "./resolve.js";
export {
  canAttackerDeclare,
  canAttackTarget,
  canBlock,
  eligibleBlockers,
} from "./legality.js";
export { CombatController } from "./controller.js";
export type { CombatHooks, CombatTrigger } from "./controller.js";
