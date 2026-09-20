import type { EffectDuration, Seat } from "@aegis/shared";

/**
 * The attack-and-block subsystem: redirect, add or end an attack while one is
 * in flight.
 */
export interface CombatPrimitives {
  /**
   * Effect-driven attack: make `attackerPermanentId` attack ("this Digimon attacks" /
   * "1 of your Digimon attacks"). Runs the full combat lifecycle through the
   * CombatController, asking the attacker's controller to choose the attack target
   * (the opponent player, or one of the opponent's suspended Digimon) per
   * Comprehensive Rules §11-2-7. `withoutSuspending` declares the attack without
   * tapping the attacker (the "attacks without suspending" form). Resolves when the
   * attack (and any block window / security check / battle) has fully resolved. A
   * no-op when the permanent cannot legally declare, or when one is already
   * mid-resolution and the engine cannot safely nest (the gap is then narrated).
   */
  forceAttack(
    attackerPermanentId: string,
    opts?: {
      withoutSuspending?: boolean;
      attackPlayer?: boolean;
      attackPlayerOnly?: boolean;
      vortex?: boolean;
      attackMechanic?: string;
      /** Resolve an attack-cost payload after attack declaration and before declaration-triggered effects. */
      afterAttackDeclaration?: () => Promise<void>;
      afterAttackTriggers?: () => Promise<void>;
      artsDigivolveOptionInstanceId?: string;
      drainTimingWindow?: () => Promise<void>;
      decisionProvenance?: {
        sourceCardId?: string;
        sourceInstanceId?: string;
        sourcePermanentId?: string;
        timing?: string;
        effectText?: string;
        effectTextPart?: string;
        isInherited?: boolean;
      };
    },
  ): Promise<void>;
  /** Whether combat is currently resolving an attack. */
  isAttackResolving?(): boolean;
  /**
   * Redirect the CURRENTLY-resolving attack onto a new target chosen by the source's
   * controller ("change the target of the attack to ..."). Consults the open attack
   * in the CombatController; a no-op when no attack is open. Used by the
   * RedirectAttack IR (e.g. a [Counter] that switches who is being attacked).
   *
   * `chooserSeat` is who picks the new target (default: the source's controller); BT4-075
   * passes the DEFENDING/opponent seat. `optional` lets the chooser decline (the attack then
   * proceeds unchanged). Absent opts => the controller chooses and the redirect is mandatory.
   */
  redirectAttack(candidatePermanentIds: string[], opts?: { chooserSeat?: Seat; optional?: boolean }): Promise<void>;

  /**
   * Grant a permanent the ability to ALSO attack the opponent's unsuspended Digimon
   * (rule implementation, e.g. ST12-08). Recorded on the continuous
   * ledger and read by combat/legality.canAttackTarget; lapses at its duration boundary.
   */
  grantCanAttackUnsuspended(
    permanentId: string,
    duration: EffectDuration,
    opts?: { noDigivolutionCards?: boolean; defenderLevelMax?: number },
  ): void;

  grantVortexCanAttackPlayers?(permanentId: string, duration: EffectDuration): void;

  /**
   * End the in-flight attack (BT23-069 "end that attack"): skip the block window and
   * battle, transition to end-of-attack. A no-op when no attack is open. Changes the
   * timing, not the attacking Digimon.
   */
  endAttack(): void;
}
