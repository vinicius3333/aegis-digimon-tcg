/* An attack target decision (`selectionContext: "attackTarget"`) names its attacker in
   `sourcePermanentId`, while `sourceCardId` stays on the card whose effect allowed the
   attack. Players read the effect's "may attack" clause as still asking for an attacker
   (Discord 1555307552223264829), so the prompt says who attacks and, when the server
   offers a single target, which one it is. */

import type { DecisionRequest, Permanent } from "@aegis/shared";

const PLAYER_TARGET_IDS: ReadonlySet<string> = new Set(["player", "opponent"]);

export type OnlyAttackTarget = { kind: "player" } | { kind: "permanent"; cardId: string | undefined };

export interface AttackTargetPrompt {
  attackerCardId: string | undefined;
  /** Undefined when the viewer has more than one target to choose from. */
  onlyTarget: OnlyAttackTarget | undefined;
}

export function isPlayerAttackTarget(candidateId: string): boolean {
  return PLAYER_TARGET_IDS.has(candidateId);
}

export function attackTargetPrompt(
  decision: DecisionRequest | undefined,
  permanents: readonly Permanent[],
): AttackTargetPrompt | undefined {
  if (decision?.options?.selectionContext !== "attackTarget") return undefined;
  const cardIdOf = (permanentId: string) =>
    permanents.find((permanent) => permanent.permanentId === permanentId)?.topCard?.cardId;
  const candidates = decision.options.candidateInstanceIds ?? [];
  const only = candidates.length === 1 ? candidates[0] : undefined;
  return {
    attackerCardId: decision.sourcePermanentId === undefined ? undefined : cardIdOf(decision.sourcePermanentId),
    onlyTarget:
      only === undefined
        ? undefined
        : isPlayerAttackTarget(only)
          ? { kind: "player" }
          : { kind: "permanent", cardId: cardIdOf(only) },
  };
}

/** A mandatory attack with one legal target has nothing to choose, so it starts picked; the viewer still confirms. */
export function preselectedAttackTargets(decision: DecisionRequest | undefined): string[] {
  if (decision?.options?.selectionContext !== "attackTarget") return [];
  const candidates = decision.options.candidateInstanceIds ?? [];
  const only = candidates.length === 1 ? candidates[0] : undefined;
  return only !== undefined && (decision.options.min ?? 1) >= 1 ? [only] : [];
}
