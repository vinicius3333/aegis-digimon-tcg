import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-088 — Hiroko Sagisaka (BT26, Red Tamer, TS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-088 as of this port
// (`node tools/kb/query.mjs card BT26-088` against the refreshed knowledge base returned no
// entries). Implemented from the printed card text only.
//
// [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
// [Your Turn] When any [Boss] or [TS] trait Digimon cards would be played, by suspending this
//   Tamer, reduce the costs by 1. If you have no Digimon, instead reduce the costs by 2.
//
// Clause 1 follows BT26-093's start-of-main gate: `OnStartMainPhase` fires board-wide, so the
// card checks `isOnBattleArea() && isOwnersTurn()` itself. "If your opponent has a Digimon" is
// an activation condition, so it gates both `when` and the resolve body (the board can change
// between the two). The clause states no cost, so it is mandatory.
//
// RESIDUAL — the [Your Turn] play-cost reduction: this needs the `wouldBePlayed` replacement
//   event to be consulted at play-cost time, and NOTHING consults it. `costReductionFor` is
//   only ever called with `"wouldDigivolve"` (primitives.ts's digivolve cost step and
//   GameEngine's), so a `subscribeReplacement({ event: "wouldBePlayed", mode: "reduceCost" })`
//   install would be a dead letter — the same engine gap BT22-080 documents for its own ESS
//   reduction. The passive `changePlayCost` ledger is NOT a substitute: this reduction has a
//   printed cost ("by suspending this Tamer") and a live condition ("if you have no Digimon,
//   instead ... by 2"), so it must be a per-play decision, not an always-on modifier. Omitted
//   rather than half-modeled (BT26-038's convention for an engine-blocked clause). Port once
//   play-cost calculation consults `wouldBePlayed`.

const cardId = "BT26-088";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

function opponentHasDigimon(ctx: EffectContext, ownerSeat: Seat): boolean {
  const opponentSeat = ctx.game.opponentOf(ownerSeat);
  return Array.from(ctx.game.player(opponentSeat).battleArea).some(
    (permanent) =>
      !permanent.inBreeding && permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-gain-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) =>
            ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn() && opponentHasDigimon(ctx, source.ownerSeat),
          resolve: async (ctx) => {
            if (!opponentHasDigimon(ctx, source.ownerSeat)) return;
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
