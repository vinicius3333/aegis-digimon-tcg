import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const module = registerIrCard("BT12-088", getCompiledCard("BT12-088")!);
const compiledEffectsForTiming = module.effectsForTiming.bind(module);

module.effectsForTiming = (timing, source: CardSource) => {
  if (timing === EffectTiming.OnLoseSecurity)
    return [
      turnTiming({
        source,
        effectKey: "BT12-088/inherited-security-memory",
        description: "When this Digimon checks security at 10000 or more DP, gain 2 memory.",
        isInherited: true,
        maxPerTurn: 1,
        when: (ctx) => {
          const host = source.permanent();
          return (
            source.isOwnersTurn() &&
            host !== undefined &&
            host.currentDP >= 10000 &&
            ctx.trigger.attackerPermanentId === host.permanentId
          );
        },
        resolve: async (ctx) => ctx.fx.gainMemory(2),
      }),
    ];
  return compiledEffectsForTiming(timing, source);
};

export default module;
