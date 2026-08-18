import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT20-090";

function hasDarkOrEvilDragonTrait(def: CardDefinition): boolean {
  const types = def.types as string[] | undefined;
  return types?.some((t) => t === "Dark Dragon" || t === "Evil Dragon") ?? false;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If memory <= 2, set it to 3.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-set-memory`,
          description: "[Start of Your Turn] If you have 2 or less memory, set it to 3.",
          optional: false,
          when: (ctx) => (ctx.source.isOwnersTurn?.() ?? false) && ctx.source.isOnBattleArea(),
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            if (ctx.game.state.memory <= 2) {
              ctx.fx.setMemory(3);
            }
          },
        }),
      ];
    }

    // [End of Your Turn] If <= 4 cards in hand, by suspending this Tamer, 1 of your
    // [Dark Dragon]/[Evil Dragon] Digimon attacks a player.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-attack`,
          description:
            "[End of Your Turn] If you have 4 or fewer cards in your hand, by suspending " +
            "this Tamer, 1 of your Digimon with the [Dark Dragon]/[Evil Dragon] trait attacks a player.",
          optional: true,
          when: (ctx) => {
            if (!(ctx.source.isOwnersTurn?.() ?? false)) return false;
            if (!ctx.source.isOnBattleArea()) return false;
            return ctx.game.player(ctx.source.ownerSeat).hand.length <= 4;
          },
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            if (self?.isSuspended) return false;
            const seat = ctx.source.ownerSeat;
            return ctx.game.player(seat).battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              if (p.isSuspended) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return (def.kinds as string[]).includes("Digimon") && hasDarkOrEvilDragonTrait(def);
            });
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            await ctx.fx.suspend([self.permanentId]);

            const seat = ctx.source.ownerSeat;
            const candidates = ctx.game
              .player(seat)
              .battleArea.filter((p) => {
                if (p.topCard === undefined) return false;
                if (p.isSuspended) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return (def.kinds as string[]).includes("Digimon") && hasDarkOrEvilDragonTrait(def);
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen =
              candidates.length === 1
                ? candidates[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 }))[0];

            if (chosen !== undefined) {
              await ctx.fx.forceAttack(chosen);
            }
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
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
