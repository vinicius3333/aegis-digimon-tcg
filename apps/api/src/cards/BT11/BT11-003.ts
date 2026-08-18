import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT11-003 — Tokomon (BT11, Yellow Lv.2 DigiEgg).
//
//   EffectTiming.OnEnterFieldAnyone — rule implementation (maxCountPerTurn=1, isInherited=true):
//     PermanentCondition = IsPermanentExistsOnOwnerBattleAreaDigimon(p, card) &&
//       (CardTraits.Contains("Angel") || CardTraits.Contains("Archangel") ||
//        CardTraits.Contains("Fallen Angel") || CardTraits.Contains("FallenAngel"))
//     HashString = "Draw1_BT11_003"
//
// The trigger fires when another of the owner's Digimon with [Angel], [Archangel], or
// [Fallen Angel] in its traits (def.types) is played onto the owner's battle area.
// The trigger subject (the entered permanent) is read via ctx.trigger.subjectPermanentId.
//
// digivolution stack.

const cardId = "BT11-003";

const ANGEL_TRAITS = new Set(["Angel", "Archangel", "Fallen Angel", "FallenAngel"]);

function hasAngelTrait(types: string[] | undefined): boolean {
  if (!types) return false;
  return types.some((t) => ANGEL_TRAITS.has(t));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn][Once Per Turn] When you play a Digimon with [Angel], [Archangel], or
    // [Fallen Angel] in its traits, <Draw 1>.
    //
    // Fires at OnEnterFieldAnyone: a Digimon entered the field. ctx.trigger.subjectPermanentId
    // is the permanent that just entered (pattern from BT19-080.ts / EX6-061.ts).
    // IsPermanentExistsOnOwnerBattleAreaDigimon requires the subject to be one of the
    // owner's own battle-area Digimon (not the opponent's).
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/draw-1-on-angel-play`,
          description:
            "[Your Turn] [Once Per Turn] When you play a Digimon with [Angel], [Archangel], or [Fallen Angel] in its traits, <Draw 1>.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            // Must be one of the owner's own battle-area Digimon.
            if (subject.controllerSeat !== source.ownerSeat) return false;
            const def = ctx.game.definitionOf(subject.topCard);
            if (!isDigimon(def)) return false;
            return hasAngelTrait(def.types);
          },
          canActivate: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
