import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { EffectDuration } from "@aegis/shared";
import { onPlay, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-053";

function isRoyalKnight(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("Royal Knight");
}

function isKingDrasil(def: CardDefinition): boolean {
  return def.nameEn === "King Drasil_7D6";
}

function isOmnimonXAntibody(def: CardDefinition): boolean {
  return isDigimon(def) && def.nameEn.includes("Omnimon") && (def.types ?? []).includes("X Antibody");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-place`,
          description:
            "[On Play] By placing 1 [Royal Knight] trait Digimon card from your hand as the " +
            "bottom digivolution card of any of your [King Drasil_7D6]s on the field, <Draw 1>.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const royalKnightCards = Array.from(owner.hand).filter((c) => isRoyalKnight(ctx.game.definitionOf(c)));
            if (royalKnightCards.length === 0) return;
            const kingDrasilPerms = Array.from(owner.battleArea).filter(
              (p) => p.topCard !== undefined && isKingDrasil(ctx.game.definitionOf(p.topCard)),
            );
            if (kingDrasilPerms.length === 0) return;
            const chosenCard = await ctx.ask.selectCards(ctx, {
              candidates: royalKnightCards.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosenCard.length === 0) return;
            const chosenHost = await ctx.ask.chooseTargets(ctx, {
              candidates: kingDrasilPerms.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosenHost.length === 0) return;
            await ctx.fx.placeUnder(chosenHost[0]!, chosenCard);
            ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play`,
          description:
            "[On Deletion] If you have 1 or fewer security cards, you may play 1 card with " +
            "[Omnimon X Antibody] from your hand or from under your [King Drasil_7D6] without " +
            "paying the cost. Place this card as its bottom digivolution card.",
          optional: true,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.security.length > 1) return;
            const omnimonCards = Array.from(owner.hand)
              .filter((card) => isOmnimonXAntibody(ctx.game.definitionOf(card)))
              .map((card) => ({ instanceId: card.instanceId }));
            const kingDrasilHosts = Array.from(owner.battleArea).filter(
              (permanent) => permanent.topCard !== undefined && isKingDrasil(ctx.game.definitionOf(permanent.topCard)),
            );
            for (const host of kingDrasilHosts) {
              for (const card of host.stack) {
                if (isOmnimonXAntibody(ctx.game.definitionOf(card))) {
                  omnimonCards.push({ instanceId: card.instanceId });
                }
              }
            }
            if (omnimonCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: omnimonCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                const played = await ctx.fx.playInstances(chosen, { payCost: false });
                if (played.length > 0) {
                  await ctx.fx.placeUnder(played[0]!.permanentId, [source.instanceId]);
                }
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rule-x-antibody`,
          description: "[Rule] This card is also treated as having [X Antibody] in its name.",
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantNameTrait(self.permanentId, "name", ["X Antibody"], EffectDuration.Permanent);
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
