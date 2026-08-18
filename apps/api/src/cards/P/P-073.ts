import { EffectDuration, EffectTiming, isDigimon, type CardKind, type Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { digivolveCostStatic, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-073";

function hasTamer(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some((permanent) =>
    permanent.topCard === undefined
      ? false
      : ctx.game.definitionOf(permanent.topCard).kinds.includes("Tamer" as CardKind),
  );
}

function opponentLevel3(ctx: EffectContext, source: CardSource): Permanent[] {
  return Array.from(ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea).filter(
    (permanent) => {
      if (permanent.topCard === undefined) return false;
      const definition = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(definition) && definition.level === 3;
    },
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/digivolve-from-weregarurumon-free`,
          description: "Digivolve from a Digimon named [WereGarurumon] for cost 0.",
          optional: false,
          resolve: async (ctx) => {
            ctx.fx.changeEvoCost(
              (match) => {
                if (match.into?.cardId !== cardId || match.target.topCard === undefined) {
                  return false;
                }
                return ctx.game.definitionOf(match.target.topCard).nameEn.includes("WereGarurumon");
              },
              0,
              { setFixed: true },
            );
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/name-rule`,
          description: "(Rule) Name: Also treated as [WereGarurumon].",
          optional: false,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantNameTrait(self.permanentId, "name", ["WereGarurumon"], EffectDuration.Permanent);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-prevent-battle-deletion`,
          description:
            "[All Turns] When this [Garurumon]/[Omnimon] Digimon would be deleted in " +
            "battle, trash 2 same-level digivolution cards to prevent the deletion.",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: hostId,
              mode: "prevent",
              description: `${cardId} inherited battle-deletion prevention`,
              causeAllows: (cause, _resolvingSeat, isBounce) => cause === "byBattle" && !isBounce,
              protects: (_subCtx, leavingId) => leavingId === hostId,
              preventCheck: async (subCtx, leavingId) => {
                const current = subCtx.game.permanentById(leavingId);
                if (current?.topCard === undefined) return false;
                const currentName = subCtx.game.definitionOf(current.topCard).nameEn;
                if (!/Garurumon|Omnimon/i.test(currentName)) return false;

                const cardsByLevel = new Map<number, string[]>();
                for (const card of current.stack) {
                  const level = subCtx.game.definitionOf(card).level;
                  if (level === undefined) continue;
                  const cards = cardsByLevel.get(level) ?? [];
                  cards.push(card.instanceId);
                  cardsByLevel.set(level, cards);
                }
                const eligibleLevels = Array.from(cardsByLevel.entries())
                  .filter(([, cards]) => cards.length >= 2)
                  .map(([level]) => level);
                if (eligibleLevels.length === 0) return false;

                const accepted = await subCtx.ask.optional(
                  subCtx,
                  "Trash 2 same-level digivolution cards to prevent this battle deletion?",
                );
                if (!accepted) return false;

                let selectedLevel = eligibleLevels[0]!;
                if (eligibleLevels.length > 1) {
                  const option = await subCtx.ask.chooseOption(
                    subCtx,
                    eligibleLevels.map((level) => `Level ${level}`),
                  );
                  selectedLevel = eligibleLevels[option] ?? selectedLevel;
                }
                const selected = await subCtx.ask.selectCards(subCtx, {
                  candidates: cardsByLevel.get(selectedLevel)!,
                  min: 2,
                  max: 2,
                });
                if (selected.length !== 2) return false;
                const trashed = await subCtx.fx.trash(selected);
                return trashed.length === 2;
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-return-level-3`,
          description:
            "[When Digivolving] If you have a Tamer, return up to 2 opponent level 3 Digimon to hand.",
          optional: false,
          canActivate: (ctx) => hasTamer(ctx, source) && opponentLevel3(ctx, source).length > 0,
          resolve: async (ctx) => {
            if (!hasTamer(ctx, source)) return;
            const candidates = opponentLevel3(ctx, source);
            if (candidates.length === 0) return;
            const maximum = Math.min(2, candidates.length);
            const selected = await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map((permanent) => permanent.permanentId),
              min: 0,
              max: maximum,
            });
            const topCards = selected
              .map((id) => ctx.game.permanentById(id)?.topCard?.instanceId)
              .filter((id): id is string => id !== undefined);
            if (topCards.length > 0) await ctx.fx.returnToHand(topCards);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
