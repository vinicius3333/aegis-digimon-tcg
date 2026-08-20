import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-233";

function hasTrait(def: CardDefinition, trait: string): boolean {
  return (def.types ?? []).some((t) => t === trait);
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
            "[On Play] Reveal the top 3 cards of your deck. Add 1 [Game] trait card and 1 " +
            "[Invincible]/[Life]/[Entertainment] trait card among them to the hand. Return the " +
            "rest to the bottom of the deck.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const deckCards = Array.from(owner.deck).slice(0, 3);
            if (deckCards.length === 0) return;
            const gameCards = deckCards.filter((c) => hasTrait(ctx.game.definitionOf(c), "Game"));
            const otherCards = deckCards.filter((c) => {
              const def = ctx.game.definitionOf(c);
              return hasTrait(def, "Invincible") || hasTrait(def, "Life") || hasTrait(def, "Entertainment");
            });
            const added: string[] = [];
            if (gameCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: gameCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              added.push(...chosen);
            }
            if (otherCards.length > 0) {
              const remaining = otherCards.filter((c) => !added.includes(c.instanceId));
              if (remaining.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: remaining.map((c) => c.instanceId),
                  min: 0,
                  max: 1,
                });
                added.push(...chosen);
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

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/linked-trigger`,
          description:
            "[Your Turn] When any of your Digimon get linked to a [Game]/[Life]/[Entertainment] " +
            "trait card, by suspending this Tamer, gain 1 memory.",
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When linked, suspend to gain memory.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                // ENGINE-GAP: linkCardInstanceId not available on TriggerInfo;
                // check the subject permanent's linked cards for matching traits instead.
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const host = subCtx.game.permanentById(subjectId);
                if (host === undefined) return false;
                return host.linked.some((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return hasTrait(def, "Game") || hasTrait(def, "Life") || hasTrait(def, "Entertainment");
                });
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                subCtx.fx.gainMemory(1);
              },
            });
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
