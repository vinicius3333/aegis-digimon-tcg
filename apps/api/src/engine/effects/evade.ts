import type { Permanent, Seat } from "@aegis/shared";
import type { ReplacementSubscriptionPrevent } from "./subtriggers.js";

export const EVADE_EFFECT_TEXT = "＜Evade＞: suspend this Digimon to prevent its deletion.";

/**
 * CR §16-22: ＜Evade＞ as a deletion prevention inside the leave consult, so the affected player
 * orders it with the other reactions to the same deletion (＜Decode＞, "would leave" effects —
 * KB Q6789, Q6884) instead of it always resolving after them.
 */
export function evadeLeaveReplacements(
  permanentIds: readonly string[],
  deps: {
    permanentById(id: string): Permanent | undefined;
    hasEvade(id: string): boolean;
    canSuspend(permanent: Permanent): boolean;
    /** Ask the controller through the evadePrompt/respondEvade window. */
    decide(seat: Seat, permanentId: string): Promise<boolean>;
    /** Suspend as the controller's effect; true when the Digimon actually suspended. */
    suspend(permanentId: string, seat: Seat): Promise<boolean>;
  },
): ReplacementSubscriptionPrevent[] {
  return permanentIds.flatMap((id, index) => {
    const holder = deps.permanentById(id);
    if (holder?.topCard === undefined || !deps.hasEvade(id) || !deps.canSuspend(holder)) return [];
    const holderInstanceId = holder.topCard.instanceId;
    const ownerSeat = holder.controllerSeat;
    const liveHolder = () => {
      const live = deps.permanentById(id);
      return live?.topCard?.instanceId === holderInstanceId && deps.hasEvade(id) ? live : undefined;
    };
    return [
      {
        // Negative ids stay clear of the registry's; this band stays clear of Detach and Guard.
        id: -(1_000_000 + index + 1),
        event: "wouldBeDeleted" as const,
        mode: "prevent" as const,
        sourcePermanentId: id,
        sourceInstanceId: holderInstanceId,
        activationIdentity: "keyword-evade",
        description: EVADE_EFFECT_TEXT,
        yieldsToEarlierPrevention: true,
        protects: (_ctx, leavingId) => leavingId === id,
        preventCheck: async () => {
          const live = liveHolder();
          if (live === undefined || !deps.canSuspend(live)) return false;
          if (!(await deps.decide(ownerSeat, id))) return false;
          return deps.suspend(id, ownerSeat);
        },
      },
    ];
  });
}
