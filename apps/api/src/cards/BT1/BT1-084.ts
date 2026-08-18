import { EffectTiming, isDigimon, type CardInstance, type Permanent, type Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT1-084";

/**
 * An opponent battle-area Digimon, mirroring the source guard
 * the effect runtime.IsPermanentExistsOnOpponentBattleAreaDigimon (opponent's side,
 * on the battle area, top card is a Digimon).
 */
function isOpponentBattleAreaDigimon(
  ctx: EffectContext,
  source: CardSource,
  permanent: Permanent,
): boolean {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  if (permanent.controllerSeat !== opponent || permanent.topCard == null) {
    return false;
  }
  return isDigimon(ctx.game.definitionOf(permanent.topCard));
}

/** Every opponent battle-area Digimon permanent. */
function opponentDigimons(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  return Array.from(ctx.game.player(opponent).battleArea).filter((permanent) =>
    isOpponentBattleAreaDigimon(ctx, source, permanent),
  );
}

/**
 * A digivolution-stack card of this Digimon that is a level-6 Digimon (source
 * CanSelectCardCondition: IsDigimon && Level == 6 && HasLevel). `HasLevel` maps to
 * `definition.level !== undefined`.
 */
function isLevel6DigivolutionCard(ctx: EffectContext, card: CardInstance): boolean {
  const def = ctx.game.definitionOf(card);
  return isDigimon(def) && def.level === 6;
}

/** This Digimon's digivolution-source cards that satisfy the level-6 filter. */
function selectableDigivolutionCards(ctx: EffectContext, source: CardSource): CardInstance[] {
  const self = source.permanent();
  if (self === undefined) return [];
  return Array.from(self.stack).filter((card) => isLevel6DigivolutionCard(ctx, card));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Choose 1 of your opponent's Digimon. Delete all of your
    // opponent's Digimon that share a name with it.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/delete-same-name`,
          description:
            "[When Digivolving] Choose 1 of your opponent's Digimon. " +
            "Delete all of your opponent's Digimon that share a name with it.",
          optional: false,
          canActivate: (ctx) => source.isOnBattleArea() && opponentDigimons(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = opponentDigimons(ctx, source);
            if (candidates.length === 0) return;

            // decision keyed to the permanent, so duplicate top cards remain tied to the
            // stack/source-count metadata rendered by the client.
            const permanentById = new Map<string, Permanent>(
              candidates.map((permanent) => [permanent.permanentId, permanent]),
            );
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: Array.from(permanentById.keys()),
              min: 1,
              max: 1,
            });
            const chosenPermanentId = chosen[0];
            if (chosenPermanentId === undefined) return;
            const chosenPermanent = permanentById.get(chosenPermanentId);
            if (chosenPermanent === undefined) return;

            // Delete every opponent Digimon sharing the chosen one's name (HasSameCardName
            // compares card names, not ids). The chosen permanent shares a name with itself.
            const chosenName = ctx.game.definitionOf(chosenPermanent.topCard).nameEn;
            const toDelete = opponentDigimons(ctx, source)
              .filter((permanent) => ctx.game.definitionOf(permanent.topCard).nameEn === chosenName)
              .map((permanent) => permanent.permanentId);
            await ctx.fx.deletePermanent(toDelete);
          },
        }),
      ];
    }

    // [When Attacking] You can unsuspend this Digimon by returning 1 of this Digimon's
    // level 6 digivolution cards to your hand.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/return-lv6-unsuspend`,
          description:
            "[When Attacking] You can unsuspend this Digimon by returning 1 of this " +
            "Digimon's level 6 digivolution cards to your hand.",
          optional: true,
          canActivate: (ctx) =>
            source.isOnBattleArea() && selectableDigivolutionCards(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const candidates = selectableDigivolutionCards(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 1,
              max: 1,
            });
            const chosenInstanceId = chosen[0];
            if (chosenInstanceId === undefined) return;

            await ctx.fx.returnToHand([chosenInstanceId]);
            ctx.fx.unsuspend([self.permanentId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
