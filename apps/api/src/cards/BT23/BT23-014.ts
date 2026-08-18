import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT23-014";

/**
 * Dynamic DP threshold: 8000 + (opponent's battle-area Digimon/Tamer count × 2000).
 *   .Filter(x => x.IsDigimon || x.IsTamer).Count * 2000 + 8000.
 */
function dpThreshold(ctx: EffectContext, source: CardSource): number {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const count = opponent.battleArea.filter((p: Permanent) => {
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) || isTamer(def);
  }).length;
  return 8000 + count * 2000;
}

/**
 * Opponent battle-area Digimon permanents with DP ≤ threshold.
 * permanent.DP comparison.
 */
function deleteCandidates(ctx: EffectContext, source: CardSource): Permanent[] {
  const threshold = dpThreshold(ctx, source);
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  return ctx.game.player(opponentSeat).battleArea.filter((p: Permanent) => {
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    return isDigimon(def) && p.currentDP <= threshold;
  });
}

/**
 * Shared delete body: select and delete 1 opponent Digimon with DP ≤ threshold.
 */
async function runDelete(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = deleteCandidates(ctx, source);
  if (candidates.length === 0) return;

  const candidateIds = candidates.map((p) => p.permanentId);
  const chosen =
    candidates.length === 1
      ? candidateIds
      : await ctx.ask.chooseTargets(ctx, { candidates: candidateIds, min: 1, max: 1 });
  if (chosen.length === 0) return;

  await ctx.fx.deletePermanent(chosen);
}

/**
 * Shared floodgate: opponent's effects can't play Digimon or Tamers until their
 * turn ends. Duration: until opponent's turn ends (documented behavior UntilOwnerTurnEndEffects on
 * Enemy, i.e. until the restricted player's own turn ends = UntilOpponentTurnEnd
 * from the source's perspective).
 *
 * NOTE: due to the engine zone-filter gap described in the module header, this
 * currently restricts the opponent from playing from ANY zone, not just trash.
 */
function applyFloodgate(ctx: EffectContext, source: CardSource): void {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  ctx.fx.restrictPlay(
    opponentSeat,
    source.ownerSeat,
    { kinds: ["Digimon", "Tamer"] },
    "play",
    EffectDuration.UntilOpponentTurnEnd,
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ----- Alternative digivolution requirement marker ----------------------
    // No fx verb adds an alternate digivolve path; recorded as a static marker
    // (see AD1-010 for the same pattern). Trait filter is blocked by missing
    // types data in the current card database.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/alt-digi-lv5-cs-cost3`,
          description: "[Digivolve] Lv.5 w/[CS] trait: Cost 3.",
          optional: false,
          resolve: async () => {
            // TODO(static-continuous-effects / digivolve action): no primitive for an
            // alternate digivolution requirement. Inert marker.
          },
        }),
      ];
    }

    // ----- [On Play] floodgate + delete -------------------------------------
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-floodgate`,
          description:
            "[On Play] Until your opponent's turn ends, their effects can't play Digimon or Tamers from the trash.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            applyFloodgate(ctx, source);
          },
        }),
        onPlay({
          source,
          effectKey: `${cardId}/on-play-delete`,
          description:
            "[On Play] Delete 1 of your opponent's Digimon with 8000 DP or less. For each of their Digimon and Tamers, add 2000 to this DP deletion effect's maximum.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await runDelete(ctx, source);
          },
        }),
      ];
    }

    // ----- [When Digivolving] floodgate + delete ----------------------------
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-floodgate`,
          description:
            "[When Digivolving] Until your opponent's turn ends, their effects can't play Digimon or Tamers from the trash.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            applyFloodgate(ctx, source);
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-delete`,
          description:
            "[When Digivolving] Delete 1 of your opponent's Digimon with 8000 DP or less. For each of their Digimon and Tamers, add 2000 to this DP deletion effect's maximum.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await runDelete(ctx, source);
          },
        }),
      ];
    }

    // ----- [When Attacking] delete only (NO floodgate) ----------------------
    // there is NO floodgate in the WhenAttacking timing per the source.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-delete`,
          description:
            "[When Attacking] Delete 1 of your opponent's Digimon with 8000 DP or less. For each of their Digimon and Tamers, add 2000 to this DP deletion effect's maximum.",
          optional: false,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await runDelete(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
