import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Jamming",
          raw: "＜Jamming＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["DS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

const cardId = "EX8-021";
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/attack-memory`,
          description: "[When Attacking] Gain 1 memory.",
          maxPerTurn: 1,
          isInherited: true,
          resolve: async (ctx) => ctx.fx.gainMemoryForSeat(source.ownerSeat, 1),
        }),
      ];
    }
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-jamming`,
          description: "Inherited ＜Jamming＞.",
          isInherited: true,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.Permanent);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
