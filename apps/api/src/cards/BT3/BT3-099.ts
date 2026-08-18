import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT3-099";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Neither player's Digimon can be deleted in battle for the turn.
    //
    //   applies to ALL battle-area permanents that are Digimon (both players),
    //   fires for the attacker or defender in a given battle, but the "for the turn"
    //   clause makes it board-wide. Per Q1133: only prevents battle-deletion.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-no-battle-deletion`,
          description:
            "[Main] Neither player's Digimon can be deleted in battle for the turn.",
          optional: false,
          resolve: async (ctx) => {
            // Apply beDeletedInBattle restriction to every battle-area Digimon on both sides.
            for (const seat of [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)]) {
              for (const permanent of ctx.game.player(seat).battleArea) {
                if (permanent.topCard === undefined) continue;
                if (!isDigimon(ctx.game.definitionOf(permanent.topCard))) continue;
                ctx.fx.restrict(
                  permanent.permanentId,
                  "beDeletedInBattle",
                  EffectDuration.UntilOwnerTurnEnd,
                );
              }
            }
          },
        }),
      ];
    }

    // [Security] Add this card to its owner's hand.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-add-to-hand`,
          description: "[Security] Add this card to its owner's hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([ctx.source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
