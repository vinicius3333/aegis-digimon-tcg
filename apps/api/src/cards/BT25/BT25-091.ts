import { CardKind,  EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, onPlay, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT25-091 — Black Tamer (BT25, Monica Simmons).
//
// [Start of Your Turn] If you have 2 or less memory, set your memory to 3.
// [On Play] You may return 1 [TS] trait Option card from your trash to the hand. If this
//   effect didn't return, <Draw 1>.
// [Your Turn] When you use [TS] trait Option cards, by suspending this Tamer, 1 of your
//   opponent's Digimon can't attack until their turn ends.
// [Security] Play this card without paying the cost.

const cardId = "BT25-091";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description:
            "[Start of Your Turn] If you have 2 or less memory, set your memory to 3.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const m = ctx.game.state.memory;
            const myMemory = ctx.source.ownerSeat === 0 ? m : -m;
            return myMemory <= 2;
          },
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] You may return 1 [TS] trait Option card from your trash to the hand. " +
            "If this effect didn't return, <Draw 1>.",
          optional: true,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const tsOptions = Array.from(owner.trash).filter((card) => {
              const def = ctx.game.definitionOf(card);
              return (def.types ?? []).includes("TS") && def.kinds?.includes(CardKind.Option);
            });

            let returned = false;

            if (tsOptions.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: tsOptions.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                returned = true;
                await ctx.fx.returnToHand(chosen);
              }
            }

            if (!returned) {
              await ctx.fx.draw(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    // BLOCKED: [Your Turn] whenOptionUsed SubTrigger with TS trait gate + suspend Tamer cost
    //   + restrict opponent Digimon from attacking. Requires OnUseOption timing support.

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
