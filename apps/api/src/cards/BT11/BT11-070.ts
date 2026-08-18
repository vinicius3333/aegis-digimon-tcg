import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-070";
const named = (name: string, value: string): boolean => name.toLowerCase().includes(value.toLowerCase());
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/reveal`,
          description: "Reveal 3, place Vemmon under this Digimon, then delete a Tamer with 5 Vemmon.",
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const shown = await ctx.fx.reveal(source.ownerSeat, 3);
            const vemmon = shown
              .filter((card) => named(ctx.game.definitionOf(card).nameEn, "Vemmon"))
              .map(({ instanceId }) => instanceId);
            const chosen = await ctx.ask.selectCards(ctx, { candidates: vemmon, min: 0, max: 1 });
            if (chosen.length > 0) await ctx.fx.placeUnder(self.permanentId, chosen, { belowTop: false });
            const rest = shown.filter((card) => !chosen.includes(card.instanceId)).map(({ instanceId }) => instanceId);
            if (rest.length > 0) await ctx.fx.trash(rest);
            const current = ctx.game.permanentById(self.permanentId);
            if (
              current === undefined ||
              current.stack.filter((card) => named(ctx.game.definitionOf(card).nameEn, "Vemmon")).length < 5
            )
              return;
            const targets = ctx.game
              .player(ctx.game.opponentOf(source.ownerSeat))
              .battleArea.filter((p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard)))
              .map(({ permanentId }) => permanentId);
            const picked = await ctx.ask.chooseTargets(ctx, {
              candidates: targets,
              min: Math.min(1, targets.length),
              max: 1,
            });
            if (picked.length > 0) await ctx.fx.deletePermanent(picked, "byEffect");
          },
        }),
      ];
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-redirect`,
          isInherited: true,
          description: "Inherited: bottom-deck 2 Vemmon from Galacticmon to redirect an attack.",
          when: () => !source.isOwnersTurn(),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOpponentAttacks",
              sourcePermanentId: host.permanentId,
              once: false,
              oncePerTurnKey: `${source.instanceId}/${cardId}/redirect`,
              description: "BT11-070 inherited",
              matches: () => !source.isOwnersTurn(),
              run: async (subCtx) => {
                const galaxies = subCtx.game
                  .player(source.ownerSeat)
                  .battleArea.filter(
                    (p) =>
                      p.topCard !== undefined &&
                      isDigimon(subCtx.game.definitionOf(p.topCard)) &&
                      named(subCtx.game.definitionOf(p.topCard).nameEn, "Galacticmon"),
                  );
                const usable = galaxies
                  .map((p) => ({
                    p,
                    cards: p.stack.filter((card) => named(subCtx.game.definitionOf(card).nameEn, "Vemmon")),
                  }))
                  .find(({ cards }) => cards.length >= 2);
                if (usable === undefined) return;
                if (!(await subCtx.ask.optional(subCtx, "Bottom-deck 2 Vemmon to redirect the attack?"))) return;
                const ids = usable.cards.slice(0, 2).map(({ instanceId }) => instanceId);
                const moved = await subCtx.fx.returnToDeck(ids, { toTop: false });
                if (moved.length === 2) await subCtx.fx.redirectAttack([host.permanentId]);
              },
            });
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
