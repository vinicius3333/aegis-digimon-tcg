import type { AttackTarget, IntentResult, Seat } from "@aegis/shared";
import type { AttackIntent } from "../actions/index.js";
import type { AttackDecisionProvenance } from "../effects/context/primitives/index.js";
import type { GameEngine } from "../GameEngine.js";

/** An activated ＜Blitz＞ whose resolving effect is waiting for the attack declaration. */
export interface PendingBlitzAttack {
  readonly seat: Seat;
  readonly attackerPermanentId: string;
  /** "player" or opponent permanent ids the attack may target. */
  readonly targetIds: readonly string[];
  readonly settle: (targetId: string | undefined) => void;
}

/**
 * ＜Blitz＞ (CR §16-16): the controller may activate it, then declares the attack like any
 * other attack. The effect that processes it stays paused until that declaration arrives.
 */
export async function awaitBlitzAttackDeclaration(
  engine: GameEngine,
  seat: Seat,
  attackerPermanentId: string,
  targetIds: readonly string[],
  provenance?: AttackDecisionProvenance,
): Promise<string | undefined> {
  const response = await engine.decisions.request({
    seat,
    kind: "optional",
    promptText: "Activate Blitz?",
    ...(provenance?.sourceCardId === undefined ? {} : { sourceCardId: provenance.sourceCardId }),
    options: { promptKey: "activateBlitz" },
  });
  if (engine.state.gameOver || response.kind !== "optional" || !response.accept) return undefined;
  const targetId = await new Promise<string | undefined>((resolve) => {
    engine.pendingBlitzAttack = {
      seat,
      attackerPermanentId,
      targetIds,
      settle: (chosen) => {
        engine.pendingBlitzAttack = undefined;
        resolve(chosen);
      },
    };
    engine.projection.syncAttackTargets();
  });
  engine.projection.syncAttackTargets();
  return targetId;
}

/** Route the attack intent that declares a pending ＜Blitz＞ attack. */
export function declareBlitzAttack(
  engine: GameEngine,
  pending: PendingBlitzAttack,
  seat: Seat,
  intent: AttackIntent,
): IntentResult {
  if (seat !== pending.seat) return { ok: false, reason: "not-your-turn" };
  const targetId = attackTargetId(intent.target);
  if (
    intent.attackerPermanentId !== pending.attackerPermanentId ||
    intent.vortex === true ||
    !pending.targetIds.includes(targetId)
  ) {
    return { ok: false, reason: "illegal-target" };
  }
  pending.settle(targetId);
  return { ok: true };
}

function attackTargetId(target: AttackTarget): string {
  return target.kind === "player" ? "player" : target.permanentId;
}
