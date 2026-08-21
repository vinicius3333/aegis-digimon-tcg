// @ts-nocheck
import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, colorWaiverStatic, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT19-089 — Healing After the Battle is Over (Red Option). Waive color if opponent has white Digimon/Tamer. [Main] Grant 1 of your Digimon immunity to opponent Option effects + DP immunity. [Security] Add to hand. */
const cardId = "BT19-089";
const opponentHasWhite = (ctx: EffectContext, source: CardSource): boolean =>
  ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.some((permanent) => {
    if (permanent.topCard === undefined) return false;
    const definition = ctx.game.definitionOf(permanent.topCard);
    return definition.colors.includes("White");
  });
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/opponent-white-waiver`,
          description:
            "While your opponent has a white Digimon or Tamer, you may ignore this card's color requirements.",
          optional: false,
          when: (ctx) => opponentHasWhite(ctx, source),
          resolve: async (ctx) => ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd),
        }),
      ];
    }
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-grant`,
          description:
            "[Main] 1 of your Digimon becomes immune to opponent Option effects and gains DP immunity until end of opponent's turn.",
          optional: false,
          canActivate: (ctx: any) =>
            ctx.game
              .player(source.ownerSeat)
              .battleArea.some((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard))),
          resolve: async (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            const c = owner.battleArea
              .filter((p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p: any) => p.permanentId);
            if (!c.length) return;
            const s = await ctx.ask.selectPermanents(ctx, { candidates: c, min: 1, max: 1 });
            if (s.length) {
              ctx.fx.restrict(s[0], "beAffected", EffectDuration.UntilOpponentTurnEnd, {
                fromSourceKind: ["Option"],
                byOpponentEffectsOnly: true,
              });
              ctx.fx.restrict(s[0], "dpImmune", EffectDuration.UntilOpponentTurnEnd, { byOpponentEffectsOnly: true });
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
          description: "[Security] Add this card to your hand.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }
    return [];
  },
};
registerCard(module);
export default module;
