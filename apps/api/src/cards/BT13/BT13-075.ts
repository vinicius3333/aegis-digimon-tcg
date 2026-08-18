import { EffectDuration, EffectTiming, CardKind, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT13-075 — Alphamon (BT13, Black Lv.7 Digimon).
 *
 *
 *   [On Play] By placing 1 Digimon card with the [X Antibody] or [Royal Knight] trait from your
 *     trash as this Digimon's bottom digivolution card, all of your opponent's Digimon with a play
 *     cost of 10 or higher can't attack players until the end of their turn.
 *   [When Digivolving] Same effect via a second OnEnterFieldAnyone block.
 *   [All Turns][Once Per Turn] When an effect would remove this Digimon from the battle area, by
 *     returning 1 card with the [X Antibody] or [Royal Knight] trait from this Digimon's
 *     digivolution cards to the bottom of the deck, prevent that removal.
 *
 * Residuals:
 *   - [All Turns][Once Per Turn] prevention — engine has no WhenRemoveField-style replacement
 *     event that carries the removed permanent AND fires the preventing permanent's effect with
 *     access to its own digivolution cards. The `subscribeReplacement("wouldLeavePlay")` path
 *     carries `cause` but cannot pick a digivolution card and send it to deck bottom within the
 *     prevent check. Marking residual; the cost+prevent chain is inert.
 *
 * KB Q2312: the restriction applies to Digimon that had cost ≥10 at time the effect resolves,
 *   even if they later digivolve to a lower-cost card (the ruling confirms it re-applies).
 * KB Q2313: if the attack was already declared (the attack step started), the attack continues
 *   even if the restriction was applied during that attack.
 */
const cardId = "BT13-075";

const hasXAntibodyOrRoyalKnight = (def: CardDefinition): boolean => {
  const types = def.types as string[] | undefined;
  if (!types) return false;
  return types.includes("X Antibody") || types.includes("Royal Knight");
};

const isEligibleTrashCard = (def: CardDefinition): boolean =>
  isDigimon(def) && hasXAntibodyOrRoyalKnight(def);

const isHighCostOpponentDigimon = (game: GameAccess, p: Permanent, source: CardSource): boolean => {
  if (p.topCard === undefined) return false;
  const owner = p.topCard.ownerSeat;
  if (owner === source.ownerSeat) return false;
  const def = game.definitionOf(p.topCard);
  if (!isDigimon(def)) return false;
  return (def.playCost ?? 0) >= 10;
};

/** Shared resolve body for both [On Play] and [When Digivolving]. */
async function resolveAttackRestrict(ctx: EffectContext, source: CardSource): Promise<void> {
  const self = ctx.source.permanent();
  if (self === undefined) return;

  const owner = ctx.game.player(source.ownerSeat);
  const trashCandidates: CardInstance[] = [];
  for (const c of owner.trash as Iterable<CardInstance>) {
    if (isEligibleTrashCard(ctx.game.definitionOf(c))) trashCandidates.push(c);
  }

  if (trashCandidates.length === 0) return;

  const wantToPlace = await ctx.ask.optional(
    ctx,
    "Place 1 [X Antibody] or [Royal Knight] Digimon from your trash as this Digimon's bottom " +
    "digivolution card to restrict opponent's Digimon from attacking players?",
  );
  if (!wantToPlace) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: trashCandidates.map((c) => c.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;

  await ctx.fx.placeUnder(self.permanentId, chosen);

  // Restrict all opponent Digimon with play cost >= 10 from attacking players.
  const opp = ctx.game.opponentOf(source.ownerSeat);
  for (const p of ctx.game.player(opp).battleArea as Iterable<Permanent>) {
    if (!isHighCostOpponentDigimon(ctx.game, p, source)) continue;
    ctx.fx.restrict(p.permanentId, "attackPlayers", EffectDuration.UntilOpponentTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] By placing 1 [X Antibody] or [Royal Knight] Digimon from trash as this Digimon's
    // bottom digivolution card, all opponent Digimon with play cost >= 10 can't attack players.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-place-restrict-attack-players`,
          description:
            "[On Play] By placing 1 Digimon card with the [X Antibody] or [Royal Knight] trait " +
            "from your trash as this Digimon's bottom digivolution card, all of your opponent's " +
            "Digimon with a play cost of 10 or higher can't attack players until the end of their turn.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            for (const c of owner.trash as Iterable<CardInstance>) {
              if (isEligibleTrashCard(ctx.game.definitionOf(c))) return true;
            }
            return false;
          },
          resolve: async (ctx) => resolveAttackRestrict(ctx, source),
        }),
      ];
    }

    // [When Digivolving] Same effect as [On Play].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-place-restrict-attack-players`,
          description:
            "[When Digivolving] By placing 1 Digimon card with the [X Antibody] or [Royal Knight] " +
            "trait from your trash as this Digimon's bottom digivolution card, all of your " +
            "opponent's Digimon with a play cost of 10 or higher can't attack players until the " +
            "end of their turn.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const owner = ctx.game.player(source.ownerSeat);
            for (const c of owner.trash as Iterable<CardInstance>) {
              if (isEligibleTrashCard(ctx.game.definitionOf(c))) return true;
            }
            return false;
          },
          resolve: async (ctx) => resolveAttackRestrict(ctx, source),
        }),
      ];
    }

    // [All Turns][Once Per Turn] When an effect would remove this Digimon from the battle area,
    // by returning 1 [X Antibody] or [Royal Knight] digivolution card to deck bottom, prevent it.
    // RESIDUAL: the WhenRemoveField replacement + preventCheck + digivolution-card-to-deck-bottom
    // chain is not expressible through the current subscribeReplacement API. Registered as an
    // inert placeholder so the timing window is present but returns no active effect.
    if (timing === EffectTiming.None) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/all-turns-prevent-removal-residual`,
          description:
            "[All Turns][Once Per Turn] When an effect would remove this Digimon from the battle " +
            "area, by returning 1 card with the [X Antibody] or [Royal Knight] trait from this " +
            "Digimon's digivolution cards to the bottom of the deck, prevent that removal. " +
            "(RESIDUAL: WhenRemoveField replacement not yet expressible — inert.)",
          maxPerTurn: 1,
          when: () => false,
          canActivate: () => false,
          resolve: async () => {},
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
