import { EffectDuration, EffectTiming, CardKind } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT13-020";

const isMarcusDamon = (def: CardDefinition): boolean =>
  def.nameEn === "Marcus Damon" || def.nameEn === "MarcusDamon";

const isTamerDef = (def: CardDefinition): boolean =>
  (def.kinds as string[]).includes(CardKind.Tamer as string);

/** Owner's hand instance ids that are [Marcus Damon]. */
const marcusDamonHandInstances = (ctx: EffectContext, source: CardSource): string[] => {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const instance of owner.hand as Iterable<CardInstance>) {
    if (isMarcusDamon(ctx.game.definitionOf(instance))) ids.push(instance.instanceId);
  }
  return ids;
};

/** Owner's battle-area Tamer permanents. */
const ownerTamerPermanents = (game: GameAccess, source: CardSource): Permanent[] => {
  const owner = game.player(source.ownerSeat);
  const tamers: Permanent[] = [];
  for (const p of owner.battleArea as Iterable<Permanent>) {
    if (p.topCard === undefined) continue;
    if (isTamerDef(game.definitionOf(p.topCard))) tamers.push(p);
  }
  return tamers;
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] You may play 1 [Marcus Damon] from your hand without paying the cost.
    // For the turn, that Tamer is also treated as a 12000 DP Digimon, can't digivolve, gains <Rush>.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-play-marcus`,
          description:
            "[When Digivolving] You may play 1 [Marcus Damon] from your hand without paying the " +
            "cost. For the turn, that Tamer is also treated as a 12000 DP Digimon, can't " +
            "digivolve, and gains ＜Rush＞.",
          optional: true,
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() && marcusDamonHandInstances(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = marcusDamonHandInstances(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
            if (chosen.length === 0) return;

            const played = await ctx.fx.playInstances(chosen, { payCost: false });
            if (played.length === 0) return;

            const permanentId = played[0]!.permanentId;

            // Treat the played Tamer as also a Digimon for the turn (KB Q2278-Q2279).
            ctx.fx.grantKind?.(permanentId, [CardKind.Digimon], EffectDuration.UntilEachTurnEnd);
            ctx.fx.setBaseDP(permanentId, 12000, EffectDuration.UntilEachTurnEnd);
            ctx.fx.restrict(permanentId, "digivolve", EffectDuration.UntilEachTurnEnd);
            ctx.fx.grantKeyword(permanentId, "Rush", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [Your Turn][Once Per Turn] When one of your Tamers becomes suspended, trash the top card of
    // your opponent's security stack.
    if (timing === EffectTiming.OnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-tamer-suspended-trash-security`,
          description:
            "[Your Turn][Once Per Turn] When one of your Tamers becomes suspended, trash the top " +
            "card of your opponent's security stack.",
          maxPerTurn: 1,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const suspendedId = ctx.trigger.suspendedPermanentId;
            if (suspendedId === undefined) return false;
            return ownerTamerPermanents(ctx.game, source).some(
              (p) => p.permanentId === suspendedId,
            );
          },
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            await ctx.fx.trashFromSecurity(opponent, 1, { fromTop: true });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
