import { EffectTiming, EffectDuration, isDigimon, CardColor } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX5-043 — Leopardmon X (EX5, Green Lv.7 Digimon).
 *
 * Digivolution requirement: 1 from Leopardmon Lv.6 without X Antibody trait.
 * [When Digivolving][Once Per Turn] Play 1 Green Digimon from hand with play cost
 *   reduced by 4 (further -3 if Leopardmon or X Antibody in digivolution cards).
 * [Main][Once Per Turn] Same play effect.
 * [Your Turn][Once Per Turn] When one of your Digimon is played, return 1 opponent's
 *   Digimon with DP ≤5000 (or +3000 per your other Digimon) to hand.
 */
const cardId = "EX5-043";

function reducePlayCost(source: CardSource, ctx: EffectContext): number {
  let reduction = 4;
  const self = source.permanent();
  if (self) {
    const hasLeopardOrX = self.stack.some((c) => {
      const def = ctx.game.definitionOf(c);
      const n = def.nameEn;
      return n.includes("Leopardmon") || n === "X Antibody" || n === "XAntibody";
    });
    if (hasLeopardOrX) reduction += 3;
  }
  return reduction;
}

function isGreenDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  return def.colors.includes(CardColor.Green);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving][Once Per Turn] Play Green Digimon from hand.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-play`,
          description:
            "[When Digivolving][Once Per Turn] You may play 1 green Digimon card from your hand with the play cost reduced by 4. If a card with [Leopardmon] in its name or [X Antibody] is in this Digimon's digivolution cards, further reduce it by 3.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.length >= 1,
          resolve: async (ctx) => {
            const hand = ctx.game.player(source.ownerSeat).hand;
            const reduction = reducePlayCost(source, ctx);
            const candidates = hand
              .filter((c) => isGreenDigimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1, visible: candidates });
            if (chosen.length === 0) return;
            ctx.fx.changePlayCost(
              (facts) => facts.def.cardId === chosen[0]!,
              -reduction,
            );
            await ctx.fx.playInstances(chosen, { payCost: true });
          },
        }),
      ];
    }

    // [Main][Once Per Turn] Same play effect.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-play`,
          description:
            "[Main][Once Per Turn] You may play 1 green Digimon card from your hand with the play cost reduced by 4. If a card with [Leopardmon] in its name or [X Antibody] is in this Digimon's digivolution cards, further reduce it by 3.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return ctx.game.player(source.ownerSeat).hand.length >= 1;
          },
          resolve: async (ctx) => {
            const hand = ctx.game.player(source.ownerSeat).hand;
            const reduction = reducePlayCost(source, ctx);
            const candidates = hand
              .filter((c) => isGreenDigimon(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1, visible: candidates });
            if (chosen.length === 0) return;
            ctx.fx.changePlayCost(
              (facts) => facts.def.cardId === chosen[0]!,
              -reduction,
            );
            await ctx.fx.playInstances(chosen, { payCost: true });
          },
        }),
      ];
    }

    // [Your Turn][Once Per Turn] When Digimon played → return opponent's low-DP to hand.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        {
          effectKey: `${cardId}/on-ally-played-bounce`,
          description:
            "[Your Turn][Once Per Turn] When one of your Digimon is played, you may return 1 of your opponent's 5000 DP or lower Digimon to the hand. For each of your other Digimon, add 3000 to the maximum DP this effect can choose.",
          optional: true,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const playedId = ctx.trigger.subjectPermanentId;
            if (playedId === undefined) return false;
            const played = ctx.game.permanentById(playedId);
            if (!played || played.topCard === undefined) return false;
            if (played.controllerSeat !== source.ownerSeat) return false;
            return isDigimon(ctx.game.definitionOf(played.topCard));
          },
          canActivate: (ctx) => {
            const self = source.permanent();
            if (!self) return false;
            let maxDP = 5000;
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            for (const p of mine) {
              if (p.permanentId === (self?.permanentId ?? "")) continue;
              maxDP += 3000;
            }
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            return opp.battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
              return p.currentDP <= maxDP;
            });
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            const selfId = self.permanentId;
            let maxDP = 5000;
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            for (const p of mine) {
              if (p.permanentId === selfId) continue;
              maxDP += 3000;
            }
            const opp = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
            const targets = opp.battleArea
              .filter((p) => {
                if (p.topCard === undefined) return false;
                if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
                return p.currentDP <= maxDP;
              })
              .map((p) => p.permanentId);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
            if (chosen.length > 0) {
              await ctx.fx.returnToHand([chosen[0]!]);
            }
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
