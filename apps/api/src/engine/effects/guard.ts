import { CardKind, type Permanent } from "@aegis/shared";
import type { ReplacementSubscriptionPrevent } from "./subtriggers.js";

/** CR §16-45: each live Guard holder protects its controller's OTHER Digimon. */
export function guardLeaveReplacements(
  holderIds: readonly string[],
  deps: {
    /** Keep generated IDs disjoint from the same consult's Detach reactions. */
    idOffset: number;
    permanentById(id: string): Permanent | undefined;
    isBattleAreaDigimon(permanent: Permanent | undefined): boolean;
    hasGuard(id: string): boolean;
  },
): ReplacementSubscriptionPrevent[] {
  return holderIds.flatMap((id, index) => {
    const holder = deps.permanentById(id);
    if (holder?.topCard === undefined || !deps.isBattleAreaDigimon(holder) || !deps.hasGuard(id)) return [];
    const holderInstanceId = holder.topCard.instanceId;
    const ownerSeat = holder.controllerSeat;
    const liveHolder = () => {
      const live = deps.permanentById(id);
      return live?.topCard?.instanceId === holderInstanceId &&
        live.controllerSeat === ownerSeat &&
        deps.isBattleAreaDigimon(live) &&
        deps.hasGuard(id)
        ? live
        : undefined;
    };
    return [
      {
        id: -(deps.idOffset + index + 1),
        event: "wouldLeavePlay" as const,
        mode: "prevent" as const,
        sourcePermanentId: id,
        sourceInstanceId: holderInstanceId,
        activationIdentity: "keyword-guard",
        description: "＜Guard＞: delete this Digimon to prevent your other Digimon from leaving.",
        affectsAll: true,
        causeAllows: (cause, resolvingSeat) =>
          cause === "byEffect" && resolvingSeat !== undefined && resolvingSeat !== ownerSeat,
        protects: (_ctx, leavingId) => {
          const leaving = deps.permanentById(leavingId);
          // Eligibility/payment below require a live holder. After a successful payment,
          // the same event's protected set must survive that holder (or its grantor) leaving.
          return leavingId !== id && deps.isBattleAreaDigimon(leaving) && leaving?.controllerSeat === ownerSeat;
        },
        preventCheck: async (ctx) => {
          if (liveHolder() === undefined) return false;
          const askCtx = { ...ctx, activeTiming: "AllTurns", activeEffectText: "＜Guard＞" };
          if (!(await askCtx.ask.optional(askCtx, "Delete this Digimon to use Guard?"))) return false;
          if (liveHolder() === undefined) return false;
          // This is the holder's Digimon effect, including when its keyword came from an
          // Option in security. The opposing effect must not own the nested payment.
          ctx.fx.enterEffectResolution?.(ownerSeat, [CardKind.Digimon], id);
          try {
            return (await ctx.fx.deletePermanent([id], "byEffect")) === 1;
          } finally {
            ctx.fx.leaveEffectResolution?.();
          }
        },
      },
    ];
  });
}
