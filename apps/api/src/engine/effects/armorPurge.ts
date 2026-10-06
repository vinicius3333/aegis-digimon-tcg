import type { CardInstance, Permanent } from "@aegis/shared";
import type { ReplacementSubscriptionPrevent } from "./subtriggers.js";

/** CR §16-19: order the top-card payment with the other reactions to this deletion. */
export function armorPurgeLeaveReplacements(
  permanentIds: readonly string[],
  deps: {
    permanentById(id: string): Permanent | undefined;
    hasArmorPurge(id: string): boolean;
    purge(id: string): Promise<CardInstance | undefined>;
  },
): ReplacementSubscriptionPrevent[] {
  return permanentIds.flatMap((id, index) => {
    const holder = deps.permanentById(id);
    if (holder?.topCard === undefined || holder.inBreeding || holder.stack.length === 0 || !deps.hasArmorPurge(id))
      return [];
    const sourceInstanceId = holder.topCard.instanceId;
    return [
      {
        id: -(2_000_000 + index + 1),
        event: "wouldBeDeleted" as const,
        mode: "prevent" as const,
        sourcePermanentId: id,
        sourceInstanceId,
        activationIdentity: "keyword-armor-purge",
        preventionKeyword: "Armor Purge",
        description: "＜Armor Purge＞: you may trash this Digimon's top card to prevent its deletion.",
        yieldsToEarlierPrevention: true,
        protects: (_ctx, leavingId) => leavingId === id,
        preventCheck: async (ctx) => {
          const live = deps.permanentById(id);
          if (live?.topCard?.instanceId !== sourceInstanceId || live.stack.length === 0 || !deps.hasArmorPurge(id))
            return false;
          const description = "＜Armor Purge＞: trash this Digimon's top card to prevent its deletion?";
          const accept =
            ctx.presetOptionalAnswer ??
            (
              await ctx.ask.selectCards(
                { ...ctx, activeEffectText: description },
                { candidates: [sourceInstanceId], min: 0, max: 1 },
              )
            ).includes(sourceInstanceId);
          if (!accept) return false;
          return (await deps.purge(id)) !== undefined;
        },
      },
    ];
  });
}
