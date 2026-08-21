import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT24-056 — Dezipmon (Black Lv.5 Digimon).
 *
 *
 * ＜Blocker＞ (definitional keyword — handled by card definition).
 * Alternative digivolution + Link condition (definitional — handled by card definition).
 *
 * [On Play] [When Digivolving] Until your opponent's turn ends, their effects can't
 * return 1 of your Digimon with the [System], [Life] or [Transmutation] trait to hands
 * or decks.
 *
 * [When Linking] Delete 1 of your opponent's play cost 5 or lower Digimon.
 */
const cardId = "BT24-056";

function hasSystemLifeTransmutationTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "System" || t === "Life" || t === "Transmutation");
}

function hasAppmonTrait(def: CardDefinition): boolean {
  return [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])].some((trait) => trait === "Appmon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Bounce immunity for [System]/[Life]/[Transmutation] Digimon.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-bounce-immunity`,
          description:
            "[On Play] Until your opponent's turn ends, their effects can't return 1 of " +
            "your Digimon with [System]/[Life]/[Transmutation] to hands or decks.",
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const appmon = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => hasAppmonTrait(ctx.game.definitionOf(card)));
            if (appmon.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: appmon.map((card) => card.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
            }
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && hasSystemLifeTransmutationTrait(def);
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: Math.min(1, candidates.length),
            });
            if (chosen.length === 0) return;

            ctx.fx.restrict(chosen[0]!, "beReturned", EffectDuration.UntilOpponentTurnEnd, {
              byOpponentEffectsOnly: true,
            });
          },
        }),
      ];
    }

    // [When Digivolving] Same bounce immunity effect.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/wd-bounce-immunity`,
          description:
            "[When Digivolving] Until your opponent's turn ends, their effects can't return 1 of " +
            "your Digimon with [System]/[Life]/[Transmutation] to hands or decks.",
          canActivate: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const appmon = ctx.game
              .player(source.ownerSeat)
              .trash.filter((card) => hasAppmonTrait(ctx.game.definitionOf(card)));
            if (appmon.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: appmon.map((card) => card.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
            }
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = owner.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) && hasSystemLifeTransmutationTrait(def);
              })
              .map((p) => p.permanentId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: Math.min(1, candidates.length),
            });
            if (chosen.length === 0) return;

            ctx.fx.restrict(chosen[0]!, "beReturned", EffectDuration.UntilOpponentTurnEnd, {
              byOpponentEffectsOnly: true,
            });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
