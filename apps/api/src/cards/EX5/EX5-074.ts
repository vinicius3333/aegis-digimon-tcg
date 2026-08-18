import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX5-074";

function isDevaOrFourSovereigns(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return (
    types.includes("Deva") ||
    types.includes("Four Sovereigns") ||
    types.includes("FourSovereigns")
  );
}

function isFourSovereignsDigimon(def: CardDefinition): boolean {
  if (!isDigimon(def)) return false;
  const types = def.types ?? [];
  return types.includes("Four Sovereigns") || types.includes("FourSovereigns");
}

/** Shared logic: return up to 4 Deva/Four Sovereigns from trash to deck bottom,
 *  then for each returned, apply -4000 DP to all opponent Digimon for the turn. */
async function returnTrashAndReduceDP(ctx: EffectContext, source: CardSource): Promise<void> {
  const player = ctx.game.player(source.ownerSeat);
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const opponentPlayer = ctx.game.player(opponent);

  const qualifying = Array.from(player.trash)
    .filter((c) => isDevaOrFourSovereigns(ctx.game.definitionOf(c)))
    .map((c) => c.instanceId);

  if (qualifying.length === 0) return;

  const willDo = await ctx.ask.optional(
    ctx,
    "By returning up to 4 [Deva]/[Four Sovereigns] from your trash to the bottom of the deck, reduce all opponent's Digimon's DP by 4000 for each returned?",
  );
  if (!willDo) return;

  const chosen = await ctx.ask.selectCards(ctx, { candidates: qualifying, min: 0, max: 4 });
  if (chosen.length === 0) return;

  await ctx.fx.returnToDeck(chosen, { toTop: false });

  const n = chosen.length;
  const delta = -4000 * n;

  const opponentDigimon = Array.from(opponentPlayer.battleArea)
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);

  for (const permanentId of opponentDigimon) {
    ctx.fx.modifyDP(permanentId, delta, EffectDuration.UntilEachTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] optional return up to 4 Deva/Four Sovereigns → -4000 DP each.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-return-reduce-dp`,
          description:
            "[On Play] By returning up to 4 cards with the [Deva]/[Four Sovereigns] trait " +
            "from your trash to the bottom of the deck, for each one, all of your opponent's " +
            "Digimon get -4000 DP for the turn.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const player = ctx.game.player(source.ownerSeat);
            return Array.from(player.trash).some((c) =>
              isDevaOrFourSovereigns(ctx.game.definitionOf(c)),
            );
          },
          resolve: async (ctx) => {
            await returnTrashAndReduceDP(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAllyAttack) {
      return [
        // [When Attacking] same optional return → -4000 DP scaling.
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-return-reduce-dp`,
          description:
            "[When Attacking] By returning up to 4 cards with the [Deva]/[Four Sovereigns] " +
            "trait from your trash to the bottom of the deck, for each one, all of your " +
            "opponent's Digimon get -4000 DP for the turn.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const player = ctx.game.player(source.ownerSeat);
            return Array.from(player.trash).some((c) =>
              isDevaOrFourSovereigns(ctx.game.definitionOf(c)),
            );
          },
          resolve: async (ctx) => {
            await returnTrashAndReduceDP(ctx, source);
          },
        }),
        // [When Attacking] for each of your [Four Sovereigns] Digimon, trash top security.
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-four-sovereigns-security`,
          description:
            "[When Attacking] For each of your Digimon with the [Four Sovereigns] trait, " +
            "trash the top card of your opponent's security stack.",
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const player = ctx.game.player(source.ownerSeat);
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opponentPlayer = ctx.game.player(opponent);
            if (opponentPlayer.security.length === 0) return false;
            return Array.from(player.battleArea).some((p) => {
              if (p.topCard === undefined) return false;
              return isFourSovereignsDigimon(ctx.game.definitionOf(p.topCard));
            });
          },
          resolve: async (ctx) => {
            const player = ctx.game.player(source.ownerSeat);
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const count = Array.from(player.battleArea).filter((p) => {
              if (p.topCard === undefined) return false;
              return isFourSovereignsDigimon(ctx.game.definitionOf(p.topCard));
            }).length;
            if (count === 0) return;
            await ctx.fx.trashFromSecurity(opponent, count, { fromTop: true });
          },
        }),
      ];
    }

    // [All Turns] This Digimon isn't affected by your opponent's Digimon effects.
    // Modeled as staticModifier applying restrict("beAffected") scoped to Digimon sources
    // from the opponent.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/all-turns-immune-opponent-digimon-effects`,
          description:
            "[All Turns] This Digimon isn't affected by the effects of your opponent's Digimon.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            // Only scoped to opponent's Digimon effects (fromSourceKind: ["Digimon"]).
            ctx.fx.restrict(perm.permanentId, "beAffected", EffectDuration.UntilEachTurnEnd, {
              fromSourceKind: ["Digimon"],
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
