import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext, GameAccess } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { Permanent } from "@aegis/shared";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";


const cardId = "BT7-024";
const RESTRICTED_LEVEL = 3;

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] For each Digimon your opponent has with no digivolution cards,
    // <Draw 1>. (documented behavior.)
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/draw-per-opponent-bare-digimon`,
          description:
            "[When Digivolving] For each Digimon your opponent has with no digivolution " +
            "cards, <Draw 1>.",
          optional: false,
          // opponent Digimon, and at least one card to draw.
          canActivate: (ctx: EffectContext) =>
            ctx.source.isOnBattleArea() &&
            bareOpponentDigimonCount(ctx.game, source) >= 1 &&
            ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx: EffectContext) => {
            // is re-read at resolution time (it may have changed since activation).
            const count = bareOpponentDigimonCount(ctx.game, source);
            if (count > 0) await ctx.fx.draw(source.ownerSeat, count);
          },
        }),
      ];
    }

    // [Opponent's Turn] While a card with [Hybrid] in its traits is in this Digimon's
    // digivolution cards, your opponent's level 3 Digimon can't attack.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opp-lv3-cant-attack-while-hybrid`,
          description:
            "[Opponent's Turn] While a card with [Hybrid] in its traits is in this " +
            "Digimon's digivolution cards, your opponent's level 3 Digimon can't attack.",
          optional: false,
          // card is in this Digimon's digivolution cards. IsOpponentTurn => !IsOwnerTurn.
          when: (ctx: EffectContext) =>
            ctx.source.isOnBattleArea() &&
            !ctx.source.isOwnersTurn() &&
            stackHasHybridTrait(ctx),
          resolve: async (ctx: EffectContext) => {
            // with Level == 3 and a leveled top card can't attack. Re-recorded each
            // continuous recompute (auto-tagged `continuous`), framed UntilOwnerTurnEnd to
            // mirror the [Opponent's Turn] window.
            for (const id of restrictedOpponentAttackers(ctx.game, source)) {
              ctx.fx.restrict(id, "attack", EffectDuration.UntilOwnerTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

/**
 * Count of the opponent's battle-area Digimon that have no digivolution cards (documented behavior
 * MatchConditionOpponentsPermanentCount(card, p => p.IsDigimon && p.HasNoDigivolutionCards);
 * HasNoDigivolutionCards => DigivolutionCards.Count == 0).
 */
function bareOpponentDigimonCount(game: GameAccess, source: CardSource): number {
  const opponent = game.player(game.opponentOf(source.ownerSeat));
  let count = 0;
  for (const permanent of opponent.battleArea) {
    if (permanent.inBreeding) continue;
    if (!isDigimon(game, permanent)) continue;
    if (permanent.stack.length === 0) count++;
  }
  return count;
}

/**
 * The opponent's battle-area Digimon that can't attack under this static: Level == 3 with a
 * leveled top card (documented behavior AttackerCondition: IsPermanentExistsOnOpponentBattleAreaDigimon &&
 * Level == 3 && TopCard.HasLevel). A top card with no level has `level === undefined` and is
 * excluded, covering both the level-equality and HasLevel checks.
 */
function restrictedOpponentAttackers(game: GameAccess, source: CardSource): string[] {
  const opponent = game.player(game.opponentOf(source.ownerSeat));
  const ids: string[] = [];
  for (const permanent of opponent.battleArea) {
    if (permanent.inBreeding) continue;
    if (!isDigimon(game, permanent)) continue;
    if (topCardLevel(game, permanent) === RESTRICTED_LEVEL) ids.push(permanent.permanentId);
  }
  return ids;
}

/** Whether a permanent's top card is a Digimon. */
function isDigimon(game: GameAccess, permanent: Permanent): boolean {
  const top = permanent.topCard;
  if (top === undefined) return false;
  return game.definitionOf(top).kinds.includes(CardKind.Digimon);
}

/** A permanent's top-card level, or undefined when it has none. */
function topCardLevel(game: GameAccess, permanent: Permanent): number | undefined {
  const top = permanent.topCard;
  if (top === undefined) return undefined;
  return game.definitionOf(top).level;
}

/**
 * Whether a card with [Hybrid] in its traits is in this Digimon's digivolution cards (documented behavior
 * card.PermanentOfThisCard().DigivolutionCards.Count(c => c.CardTraits.Contains("Hybrid")) >= 1).
 * The engine analogue of CardSource.CardTraits is the UNION Form ∪ Attribute ∪ Type
 * (documented behavior) — the same union the shared `selfDigivolutionStackHasTrait` Condition
 * and `matchNameOrTrait` use. The [Hybrid] tag lives in `CardDefinition.forms` (e.g. AD1-002,
 * BT12-009), so reading only `.types` (the prior behavior) left this always-false; the union
 * fixes it. The static still lapses cleanly when no stack card carries the trait.
 */
function stackHasHybridTrait(ctx: EffectContext): boolean {
  const self = ctx.source.permanent();
  if (self === undefined) return false;
  return self.stack.some((c) => hasHybridTrait(ctx.game, c));
}

function hasHybridTrait(game: GameAccess, card: Parameters<GameAccess["definitionOf"]>[0]): boolean {
  const def = game.definitionOf(card);
  const traits = [...(def.types ?? []), ...(def.forms ?? []), ...(def.attributes ?? [])];
  return traits.some((t) => t.toLowerCase() === "hybrid");
}

registerCard(module);
export default module;
