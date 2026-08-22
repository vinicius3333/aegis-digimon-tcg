// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-074 (Meicoomon).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "selfColorCount",
            op: "gte",
            value: 2,
            raw: "this Digimon has 2 or more colors",
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-memory`,
          description: "[On Deletion] If this Digimon has 2 or more colors, gain 2 memory.",
          isInherited: true,
          canActivate: (ctx) => (ctx.trigger.deletedEffectiveColorsByInstanceId?.[source.instanceId]?.length ?? 0) >= 2,
          resolve: async (ctx) => {
            // [On Deletion] is unrestricted-turn (deletion can happen on either player's
            // turn, e.g. this Digimon dying in battle on the opponent's attack), so credit
            // this card's controller explicitly rather than the turn player.
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 2);
          },
        }),
      ];
    }

    return [];
  },
};

registerIrCard("BT9-074", compiled);
