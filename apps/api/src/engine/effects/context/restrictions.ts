/**
 * Continuous "can't ..." prohibitions a permanent can carry that the engine actually HONORS
 * (static-continuous-effects). Defined here (the primitives contract) so both the ledger impl
 * and the verbs agree.
 *
 * `restrict()` accepts only these. That is the point of the split: five members of this union
 * once had zero consumers, so 41 card modules recorded protection the engine never read — a
 * type-safe call that silently did nothing. `restrictionConsumers.guard.test.ts` fails the
 * build if a member ever loses its consumer again, and a kind with no consumer belongs in
 * {@link DeprecatedRestriction} where `restrict()` cannot reach it.
 */
export type EnforcedRestriction =
  | "attack"
  | "attackPlayers"
  | "cantAttackDigimon"
  | "attackOnlySuspendedDigimon"
  | "block"
  | "cantBeBlocked"
  | "cantBeBlockedByNoDigivolution"
  | "suspend"
  | "unsuspend"
  | "unsuspendDuringOwnUnsuspendPhase"
  | "unsuspendDuringUnsuspendPhase"
  | "unsuspendHandTrashCost"
  | "beDeletedInBattle"
  | "beDeleted"
  | "beSuspended" // "can't be suspended" by effects; combat self-suspend is exempt (BT19-101 KB Q3185)
  | "beTrashed"
  | "beReturned"
  | "stackReturn" // Individual stacked-card returns, independently of whole-Digimon bounce.
  | "leaveBattleAreaExceptByDeletion"
  | "digivolve"
  | "digivolveToLevel7"
  | "attackTargetChange"
  | "cantBeAttacked"
  | "dpImmune"
  | "beAffected"
  | "cantBeDeDigivolved"
  | "cannotActivateWhenDigivolving" // "can't activate [When Digivolving] effects" (BT19-038 KB Q5541–Q5545)
  | "activateOnPlay"; // "can't activate [On Play] effects" (EX8-029)

/**
 * Kinds the ledger still stores but nothing honors. `restrict()` rejects them, so a card
 * cannot record one; they exist only so the ~32 not-yet-re-classified IR card records keep
 * type-checking against {@link Restriction}.
 *
 * `activateEffects` is superseded by the dedicated disableSecurityEffect /
 * disableTimingEffect verbs.
 */
export type DeprecatedRestriction = "activateEffects";

/** Every restriction value the ledger can hold, enforced or not. */
export type Restriction = EnforcedRestriction | DeprecatedRestriction;
