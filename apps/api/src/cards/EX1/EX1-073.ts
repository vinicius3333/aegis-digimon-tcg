import { EffectDuration, EffectTiming, type CardDefinition } from "@aegis/shared";
import type { CardColor } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "EX1-073";
const CYBORG = "Cyborg";

function canSelectCard(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Digimon")) return false;
  if (def.level !== 5) return false;
  if (!(def.types as string[] | undefined)?.includes(CYBORG)) return false;
  const colors = def.colors as string[];
  if (!colors.includes("Red" as CardColor) && !colors.includes("Black" as CardColor))
    return false;
  return true;
}

function canSelectCardForPrevention(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes("Digimon")) return false;
  if (def.level !== 5) return false;
  return true;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // ----- STATIC: Immune from DP Minus (documented behavior) ----------------
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/dp-immune`,
          description: "Can't have DP reduced (documented behavior)",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.restrict(self.permanentId, "dpImmune", EffectDuration.UntilEachTurnEnd);
          },
        }),
      );
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/prevent-deletion`,
          description: "Trash 2 level 5 sources to prevent this Digimon's deletion",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldBeDeleted",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              description: `${cardId} deletion prevention`,
              protects: (_subCtx, leavingId) => leavingId === self.permanentId,
              preventCheck: async (subCtx, leavingId) => {
                if (leavingId !== self.permanentId) return false;
                const eligible = self.stack.filter((card) =>
                  canSelectCardForPrevention(subCtx.game.definitionOf(card)),
                );
                if (eligible.length < 2) return false;
                const accepted = await subCtx.ask.optional(
                  subCtx,
                  "Trash 2 level 5 digivolution cards to prevent deletion?",
                );
                if (!accepted) return false;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: eligible.map((card) => card.instanceId),
                  min: 2,
                  max: 2,
                });
                if (chosen.length !== 2) return false;
                const trashed = await subCtx.fx.trashDigivolutionCards(self.permanentId, chosen, {
                  byEffectSeat: source.ownerSeat,
                });
                return trashed.length === 2;
              },
            });
          },
        }),
      );
    }

    // ----- [On Play] Place cards in digivolution cards, gain memory (documented behavior)
    if (timing === EffectTiming.OnPlay) {
      const onPlay: Effect = {
        effectKey: `${cardId}/on-play`,
        description:
          "[On Play] Place up to 5 level 5 Red/Black Cyborg cards from hand and/or trash in this Digimon's digivolution cards to gain 1 memory for each (documented behavior)",
        optional: true,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => ctx.source.isOnBattleArea(),
        canActivate: (ctx) => {
          const player = ctx.game.player(ctx.source.ownerSeat);
          const handHas = player.hand.some((c) => canSelectCard(ctx.game.definitionOf(c)));
          const trashHas = player.trash.some((c) => canSelectCard(ctx.game.definitionOf(c)));
          return handHas || trashHas;
        },
        resolve: async (ctx) => {
          const self = ctx.source.permanent();
          if (self === undefined) return;

          const owner = ctx.game.player(ctx.source.ownerSeat);
          const handCards = owner.hand.filter((c) =>
            canSelectCard(ctx.game.definitionOf(c)),
          );
          const trashCards = owner.trash.filter((c) =>
            canSelectCard(ctx.game.definitionOf(c)),
          );

          if (handCards.length === 0 && trashCards.length === 0) return;

          // Collect all eligible candidates from hand + trash
          const allCandidates = [...handCards, ...trashCards];
          // Cap at 5
          const allIds = allCandidates.map((c) => c.instanceId);

          const chosen = await ctx.ask.selectCards(ctx, {
            candidates: allIds,
            min: 0,
            max: Math.min(5, allIds.length),
            visibleCards: allCandidates.map((card) => ({
              instanceId: card.instanceId,
              cardId: card.cardId,
            })),
            distinctCardIds: true,
          });
          if (chosen.length === 0) return;

          const seen = new Set<string>();
          const unique: string[] = [];
          for (const id of chosen) {
            const card = allCandidates.find((c) => c.instanceId === id);
            if (card === undefined) continue;
            const _def = ctx.game.definitionOf(card);
            if (!seen.has(card.cardId)) {
              seen.add(card.cardId);
              unique.push(id);
            }
          }
          if (unique.length === 0) return;

          // Reverse because the engine's placeUnder adds to top; we place in reverse order
          // so that the bottom is what the player selected first
          ctx.fx.placeUnder(self.permanentId, unique, { belowTop: true });

          ctx.fx.gainMemory(unique.length);
        },
      };
      out.push(onPlay);
    }

    return out;
  },
};

registerCard(module);
export default module;
