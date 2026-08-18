import { CardColor, CardKind, EffectDuration, EffectTiming, type Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { activated, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT13-008 — Marsmon (BT13, Red Lv.6 Digimon).
 *
 * Hand-written override: the declarative effect record could not express the
 * BecomeDigimonThatCantDigivolve effect because the engine lacked a
 * continuous KindGrant primitive (HARD-01 / HARD-02). Now that grantKind
 * and effectiveKinds() are implemented, the card is faithfully modelled.
 *
 *   1. EffectTiming.None — digivolve requirement: can digivolve onto [Koromon]
 *      for 0 cost.
 *   2. EffectTiming.OnDeclaration — [Main][Once Per Turn] select 1 of your
 *      [Marcus Damon]-name Tamers: grant Digimon kind + set base DP to 3000
 *      + restrict digivolve (all UntilEachTurnEnd). BecomeDigimonThatCantDigivolve.
 *   3. EffectTiming.None, isInherited — [Your Turn][Once Per Turn][Inherited]
 *      when a red or yellow Tamer suspends, delete opponent Digimon with
 *      3000 DP or less.
 */

const cardId = "BT13-008";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) Static digivolution requirement: can digivolve onto [Koromon] for 0 cost
    // (3) [Inherited] SubTrigger whenSuspended → delete opponent Digimon ≤3000 DP
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/self-digivolve-onto-koromon`,
          description: "Digivolve onto [Koromon] for 0 cost.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.changeEvoCost(
              ({ target }) => target.permanentId === self.permanentId,
              0,
              { setFixed: true },
            );
          },
        }),
        // (3) [Inherited] When a red or yellow Tamer suspends → delete opponent Digimon ≤3000
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-delete-on-tamer-suspension`,
          description:
            "[Your Turn][Once Per Turn][Inherited] When one of your red or yellow Tamers " +
            "becomes suspended, delete 1 of your opponent's Digimon with 3000 DP or less.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => hasRedOrYellowTamer(ctx.game, source),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger?.({
              event: "whenSuspended",
              sourcePermanentId: self.permanentId,
              once: false,
              matches: (subCtx) => {
                const susId = subCtx.trigger?.suspendedPermanentId;
                if (susId === undefined) return false;
                const suspPerm = subCtx.game.permanentById(susId);
                if (suspPerm === undefined) return false;
                if (suspPerm.controllerSeat !== ctx.source.ownerSeat) return false;
                const top = suspPerm.topCard;
                if (top === undefined) return false;
                const def = subCtx.game.definitionOf(top);
                if (!def.kinds.includes(CardKind.Tamer)) return false;
                return def.colors.includes(CardColor.Red) || def.colors.includes(CardColor.Yellow);
              },
              run: async (subCtx) => {
                const oppSeat = subCtx.game.opponentOf(ctx.source.ownerSeat);
                const oppPlayer = subCtx.game.player(oppSeat);
                const targets = oppPlayer.battleArea
                  .filter((p) => {
                    if (p.inBreeding) return false;
                    if (!p.topCard) return false;
                    const def = subCtx.game.definitionOf(p.topCard);
                    if (!def.kinds.includes(CardKind.Digimon)) return false;
                    return p.currentDP <= 3000;
                  })
                  .map((p) => p.permanentId);
                if (targets.length === 0) return;
                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: targets,
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) await subCtx.fx.deletePermanent(chosen);
              },
              description: "BT13-008 inherited delete on Tamer suspend",
            });
          },
        }),
      ];
    }

    // (2) [Main][Once Per Turn] BecomeDigimonThatCantDigivolve — activated ability
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/become-digimon`,
          description:
            "[Main][Once Per Turn] For the turn, 1 of your [Marcus Damon]s is also treated as " +
            "a 3000 DP Digimon and can't digivolve.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          canActivate: (ctx) => hasMarcusDamon(ctx.game, source),
          resolve: async (ctx) => {
            const candidates = listMarcusDamon(ctx.game, source);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: candidates.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;
            const targetId = chosen[0]!;
            ctx.fx.grantKind?.(targetId, [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
            ctx.fx.setBaseDP?.(targetId, 3000, EffectDuration.UntilEachTurnEnd);
            ctx.fx.restrict(targetId, "digivolve", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    return [];
  },
};

function hasMarcusDamon(game: GameAccess, source: CardSource): boolean {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea.some((p) => !p.inBreeding && isMarcusDamon(p, game));
}

function listMarcusDamon(game: GameAccess, source: CardSource) {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea.filter((p) => !p.inBreeding && isMarcusDamon(p, game));
}

function isMarcusDamon(p: Permanent, game: GameAccess): boolean {
  if (p.topCard === undefined) return false;
  const def = game.definitionOf(p.topCard);
  const name = (def.nameEn ?? "").toLowerCase();
  return name.includes("marcus damon") || name.includes("marcusdamon");
}

function hasRedOrYellowTamer(game: GameAccess, source: CardSource): boolean {
  const owner = game.player(source.ownerSeat);
  return owner.battleArea.some((p) => {
    if (p.inBreeding) return false;
    const top = p.topCard;
    if (top === undefined) return false;
    const def = game.definitionOf(top);
    if (!def.kinds.includes(CardKind.Tamer)) return false;
    return def.colors.includes(CardColor.Red) || def.colors.includes(CardColor.Yellow);
  });
}

registerCard(module);
export default module;
