import { requireCardDefinition, type AttackTarget } from "@aegis/shared";
import type { Primitives } from "../EffectContext.js";
import { canAttackerDeclare, canAttackTarget } from "../../combat/legality.js";

import type { PrimitivesContext } from "./context.js";

/**
 * Redirecting, adding to and ending an attack in flight.
 */

export function createCombatVerbs(pc: PrimitivesContext) {
  const { engine, access, continuous, player, state } = pc;

  const forceAttack = async (
    attackerPermanentId: string,
    opts?: {
      withoutSuspending?: boolean;
      attackPlayer?: boolean;
      attackPlayerOnly?: boolean;
      vortex?: boolean;
      attackMechanic?: string;
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
  ): Promise<void> => {
    const combat = engine.combat;
    if (combat === undefined) return; // no combat port (test engine): narrate nothing
    if (combat.isAttacking) return; // do not nest an effect-driven attack inside another
    const attacker = access.permanentById(attackerPermanentId);
    if (attacker === undefined) return;
    const controllerSeat = attacker.controllerSeat;
    if (
      canAttackerDeclare(access, controllerSeat, attacker, continuous, opts?.vortex, opts?.withoutSuspending) !== null
    ) {
      return;
    }
    const opponentSeat = access.opponentOf(controllerSeat);

    // Reuse declared-attack target legality so forced attacks cannot offer a
    // protected defender, an unsuspended defender without a matching grant, or a
    // player forbidden by the effect/restriction (BT9-100, KB Q1904/Q1905).
    const PLAYER = "player";
    const playerTarget: AttackTarget = { kind: "player" };
    const legalEnemyIds = access
      .battleAreaPermanents(opponentSeat)
      .filter(
        (permanent) =>
          canAttackTarget(
            access,
            controllerSeat,
            attacker,
            { kind: "permanent", permanentId: permanent.permanentId },
            continuous,
            opts?.vortex,
          ) === null,
      )
      .map((permanent) => permanent.permanentId);
    const candidates = [
      ...(opts?.attackPlayer !== false &&
      canAttackTarget(access, controllerSeat, attacker, playerTarget, continuous, opts?.vortex) === null
        ? [PLAYER]
        : []),
      ...(opts?.attackPlayerOnly === true ? [] : legalEnemyIds),
    ];
    if (candidates.length === 0) return;
    const chosen = await engine.ask.selectInstances(
      controllerSeat,
      candidates,
      1,
      1,
      "Choose the attack target for the forced attack.",
      {
        ...opts?.decisionProvenance,
        // The clause's source remains available through sourceCardId/effectText, but
        // the board arrow for this second decision must leave from the Digimon that
        // was selected to attack, not from the permanent owning the effect.
        sourcePermanentId: attacker.permanentId,
        selectionContext: "attackTarget",
      },
    );
    const pick = chosen[0] ?? candidates[0]!;
    const target: AttackTarget = pick === PLAYER ? { kind: "player" } : { kind: "permanent", permanentId: pick };

    await combat.resolveAttack(controllerSeat, attacker, target, {
      withoutTap: opts?.withoutSuspending ?? false,
      attackMechanic: opts?.attackMechanic,
      afterAttackDeclaration: opts?.afterAttackDeclaration,
      afterAttackTriggers: async () => {
        await opts?.afterAttackTriggers?.();
        const option = player(controllerSeat).resolvingOption;
        if (option !== undefined && option.instanceId === opts?.artsDigivolveOptionInstanceId) {
          const definition = requireCardDefinition(option.cardId);
          if (definition.isDualCard && !state.gameOver) {
            await engine.artsDigivolve?.(controllerSeat, option, definition, true);
          }
        }
      },
      // An attack ordered from inside a resolving body parks the attacker's [When Attacking]
      // triggers in the nested pending pool (§15-4-4), where they pool with whatever else that
      // body triggered — a DNA-produced attacker orders its When Digivolving and When Attacking
      // effects together from exactly this pool (Q3944). §11-1 still requires the pool to resolve
      // BEFORE Counter Timing and the security check, which the enclosing timing window's drain
      // does. A watcher body has no such window, so without the fallback nothing drained the pool
      // until the security check's own resolver did, and the attacker's inherited draw resolved
      // on top of the flipped card (match 89641815: BT26-015 ordering an attack by BT26-009's
      // host).
      drainTimingWindow: ((): (() => Promise<void>) | undefined => {
        const drain = opts?.drainTimingWindow ?? engine.drainPendingAttackTriggers;
        if (drain === undefined) return undefined;
        return () => engine.resolveAttackTimingWindow?.(drain) ?? drain();
      })(),
      // Counter Timing through End of Attack interrupt the ordering effect (§11-1), so the
      // triggers each step produces resolve as their own windows instead of being parked in
      // the nested pending pool until after combat.
      ...(engine.runAttackSteps === undefined ? {} : { runAttackSteps: engine.runAttackSteps }),
      // Inside that pause, a battle deletion's [On Deletion] window is still parked behind the
      // ordering effect's open window token, so each step boundary flushes it explicitly —
      // §11-1-4 puts those deletions before End of Attack, not after the whole attack.
      ...(engine.settleBetweenAttackSteps === undefined ? {} : { settleBetweenSteps: engine.settleBetweenAttackSteps }),
    });
  };

  const isAttackResolving = (): boolean => engine.combat?.isAttacking === true;

  /**
   * Redirect the currently-resolving attack onto one of `candidatePermanentIds`
   * (chosen by the source's controller). The reserved id `"player"` represents the
   * opponent player, allowing cards that say "another opponent's Digimon or the player".
   */
  const redirectAttack: Primitives["redirectAttack"] = async (candidatePermanentIds, opts) => {
    const combat = engine.combat;
    if (combat === undefined || !combat.isAttacking) return;
    const candidates = candidatePermanentIds.filter((id) => id === "player" || access.permanentById(id) !== undefined);
    if (candidates.length === 0) return;
    // The chooser is the source's controller by default; BT4-075 passes the opponent seat so
    // the DEFENDING player picks among their own unsuspended Digimon. When `optional`, the
    // chooser may decline (min 0) and the attack proceeds unchanged.
    const chooserSeat = opts?.chooserSeat ?? engine.controllerSeat();
    const optional = opts?.optional ?? false;
    let chosen: string[];
    if (candidates.length === 1 && !optional) {
      chosen = candidates;
    } else {
      chosen = await engine.ask.selectInstances(
        chooserSeat,
        candidates,
        optional ? 0 : 1,
        1,
        "Choose the new target of the attack.",
      );
    }
    const pick = chosen[0];
    if (pick === undefined) return; // declined (or no pick): attack proceeds unchanged
    const attackerId = combat.currentAttackerId;
    combat.redirectTarget(pick === "player" ? { kind: "player" } : { kind: "permanent", permanentId: pick });
    // The attack target was just switched — notify reactive watchers ("when this Digimon's
    // attack target is switched", BT11-008). The attacker is the event subject; a watcher's
    // sourceFilter isSelfRef gates it to its own attack.
    if (attackerId !== undefined) {
      await engine.fireSubTrigger?.("whenAttackTargetSwitched", {
        subjectPermanentId: attackerId,
        attackerPermanentId: attackerId,
      });
    }
  };

  return { forceAttack, isAttackResolving, redirectAttack };
}
