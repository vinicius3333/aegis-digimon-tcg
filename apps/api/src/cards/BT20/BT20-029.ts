import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT20-029";

/** "[Pulsemon] in its text" (KB Q4322) OR the [SEEKERS] trait — the documented behavior `HasText("Pulsemon") || HasSeekersTraits`. */
const isPulsemonTextOrSeekers = (def: CardDefinition): boolean => {
  if (!isDigimon(def)) return false;
  const traits: string[] = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  if (traits.includes("SEEKERS")) return true;
  const text = [
    def.nameEn,
    def.effectText ?? "",
    def.inheritedEffectText ?? "",
    def.securityEffectText ?? "",
    ...traits,
  ].join(" ");
  return text.includes("Pulsemon");
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] When this Digimon would digivolve into a [Pulsemon]-text / [SEEKERS] Digimon,
    // reduce the digivolution cost by 1.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-evo-cost-minus-1`,
          description:
            "[Your Turn] When this Digimon would digivolve into a Digimon card with [Pulsemon] " +
            "in its text or the [SEEKERS] trait, reduce the digivolution cost by 1.",
          when: () => source.isOwnersTurn() && source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.changeEvoCost(
              (m) => {
                // Base being digivolved is THIS permanent.
                if (m.target.permanentId !== self.permanentId) return false;
                if (m.into === undefined) return false;
                // INTO a [Pulsemon]-text / [SEEKERS] Digimon.
                return isPulsemonTextOrSeekers(m.into);
              },
              -1,
            );
          },
        }),
      ];
    }

    // (Inherited) [All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon
    // in battle, gain 1 memory.
    if (timing === EffectTiming.OnBattleDeleteOpponent) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/ess-gain-memory-on-battle-delete`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon deletes your opponent's Digimon in " +
            "battle, gain 1 memory.",
          isInherited: true,
          optional: false,
          maxPerTurn: 1,
          // Fire only when the host (carrying this in its stack) is the surviving battle winner
          // that deleted the opponent's Digimon (Q4324 — host must survive).
          when: (ctx) => {
            const self = source.permanent();
            return self !== undefined && ctx.trigger.attackerPermanentId === self.permanentId;
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
