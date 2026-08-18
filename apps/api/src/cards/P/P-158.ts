import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-158";

function hasDReaper(def: CardDefinition): boolean {
  // The catalog stores card traits in `forms` (and some legacy entries in
  // `types`); checking only `types` made every real D-Reaper card invisible.
  return (def.forms ?? []).some((trait) => trait === "D-Reaper")
    || (def.types ?? []).some((trait) => trait === "D-Reaper");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] Reveal the top 4 cards of your deck. Add 1 card with the [D-Reaper] " +
            "trait among them to the hand. Return the rest to the bottom of the deck.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const deckCards = Array.from(owner.deck).slice(0, 4);
            if (deckCards.length === 0) return;
            const candidates = deckCards.filter((c) => hasDReaper(ctx.game.definitionOf(c)));
            let added: string[] = [];
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              added = chosen;
              if (added.length > 0) {
                // The selected revealed card must leave the deck for the hand.
                // `selectCards` only records the decision; it does not move the
                // instance.  Without this explicit move the printed "add 1"
                // clause silently discarded the selection when the remaining
                // cards were returned to the bottom.
                await ctx.fx.returnToHand(added);
              }
            }
            const rest = deckCards.filter((c) => !added.includes(c.instanceId));
            if (rest.length > 0) {
              await ctx.fx.returnToDeck(rest.map((c) => c.instanceId), { toTop: false });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] By returning this Tamer to the bottom of the deck, you may play 1 [D-Reaper] " +
            "trait Digimon from your hand with a play cost of 3 + the number of digivolution cards " +
            "under [Mother D-Reaper] or less.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            let motherCards = 0;
            for (const p of owner.battleArea) {
              if (p.topCard !== undefined && ctx.game.definitionOf(p.topCard).nameEn.includes("Mother D-Reaper")) {
                motherCards = p.stack.length;
                break;
              }
            }
            const maxCost = 3 + motherCards;
            const candidates = Array.from(owner.hand).filter((c) => {
              const def = ctx.game.definitionOf(c);
              return isDigimon(def) && hasDReaper(def) && (def.playCost ?? 99) <= maxCost;
            });
            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: candidates.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.returnToDeck([source.instanceId], { toTop: false });
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
