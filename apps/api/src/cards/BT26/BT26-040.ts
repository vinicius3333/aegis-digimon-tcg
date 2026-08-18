import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-040 — Drimogemon (BT26, Green Lv.4 Digimon).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-040 as of this port
// (`node tools/kb/query.mjs card BT26-040` returned no knowledge-base entries). implemented
// from the printed card text only.
//
// [Digivolve] Lv.3 w/[DM] trait: Cost 2 — a digivolution-cost requirement, not an
//   effect clause; already carried by CardDefinition.evoCosts in cards.json, so it
//   needs no entry here.
// <Training> <Piercing> — <Piercing> is inherited (inheritedEffectText); the printed
//   keyword text is picked up automatically by the engine's printed-keyword parse, so
//   it needs no hand-written entry here. <Training> has no engine-consumer keyword of
//   that exact name found in this port and is likewise left to the printed-keyword
//   parse rather than hand-coded.
// [When Moving] [On Play] Suspend 1 of your opponent's Digimon. Then, by placing 1
//   card in your hand face down as this Digimon's bottom digivolution card, this
//   Digimon gets +1000 DP until your opponent's turn ends for each of its face-down
//   digivolution cards.
//
// Modeled on BT26-025's shared OnPlay/OnMove clause shape (one resolve function,
// `when: isSelfMove` gating the OnMove entry — §15-16-16-1, the engine's OnMove
// window). "Suspend 1 of your opponent's Digimon" is mandatory (no "may" in the
// printed text): it targets when a legal target exists and is skipped otherwise,
// same convention as BT26-030's mandatory clauses. "By placing ... this Digimon gets
// +1000 DP ... for each of its face-down digivolution cards" is a cost-gated bonus
// (optional: true, matching BT26-030/BT26-025's uncosted "By ..." clauses — the
// player always may decline to pay a stated cost); placement uses ctx.fx.placeUnder
// with its default "bottom of the stack" behavior (per its own doc comment) onto the
// Digimon itself, which also sets the placed card's faceUp to false. The DP bonus is
// scaled by the number of stack cards with faceUp === false — normal digivolution
// (ctx.fx.digivolveFromInstance / the player's digivolve action) does not clear
// faceUp on the demoted card, so only cards placed face-down under this Digimon (by
// this effect or another placeUnder-style effect) count, matching the printed
// "face-down digivolution cards" wording rather than the whole stack.

const cardId = "BT26-040";

/** Whether this permanent is the one that just moved from breeding to battle. */
function isSelfMove(ctx: EffectContext, source: CardSource): boolean {
  const movedId = ctx.trigger?.movedPermanentId;
  if (movedId === undefined) return false;
  return movedId === source.permanent()?.permanentId;
}

/**
 * "Suspend 1 of your opponent's Digimon. Then, by placing 1 card in your hand face
 * down as this Digimon's bottom digivolution card, this Digimon gets +1000 DP until
 * your opponent's turn ends for each of its face-down digivolution cards." Shared by
 * the [On Play] and [When Moving] windows.
 */
async function resolveSuspendThenPlaceForDP(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponentDigimon = Array.from(ctx.game.player(opponentSeat).battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
  );
  if (opponentDigimon.length > 0) {
    let targetId: string;
    if (opponentDigimon.length === 1) {
      targetId = opponentDigimon[0]!.permanentId;
    } else {
      const chosen = await ctx.ask.chooseTargets(ctx, {
        candidates: opponentDigimon.map((p) => p.permanentId),
        min: 1,
        max: 1,
      });
      if (chosen.length === 0) return;
      targetId = chosen[0]!;
    }
    await ctx.fx.suspend([targetId]);
  }

  const self = source.permanent();
  if (self === undefined) return;
  const handIds = Array.from(ctx.game.player(source.ownerSeat).hand).map((c) => c.instanceId);
  if (handIds.length === 0) return;

  const toPlace = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 0, max: 1 });
  if (toPlace.length === 0) return;

  await ctx.fx.placeUnder(self.permanentId, toPlace);

  const updated = ctx.game.permanentById(self.permanentId);
  if (updated === undefined) return;
  const faceDownCount = updated.stack.filter((c) => !c.faceUp).length;
  if (faceDownCount > 0) {
    ctx.fx.modifyDP(self.permanentId, faceDownCount * 1000, EffectDuration.UntilOpponentTurnEnd);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] Suspend 1 of your opponent's Digimon. Then, by placing 1 card in your
    // hand face down as this Digimon's bottom digivolution card, this Digimon gets
    // +1000 DP until your opponent's turn ends for each of its face-down digivolution
    // cards.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-then-place-for-dp`,
          description:
            "[On Play] Suspend 1 of your opponent's Digimon. Then, by placing 1 card in " +
            "your hand face down as this Digimon's bottom digivolution card, this Digimon " +
            "gets +1000 DP until your opponent's turn ends for each of its face-down " +
            "digivolution cards.",
          optional: false,
          resolve: async (ctx) => {
            await resolveSuspendThenPlaceForDP(ctx, source);
          },
        }),
      ];
    }

    // [When Moving] Same clause, fired when this Digimon itself moves from the
    // breeding area to the battle area (§15-16-16-1; engine's OnMove window).
    if (timing === EffectTiming.OnMove) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/when-moving-suspend-then-place-for-dp`,
          description:
            "[When Moving] Suspend 1 of your opponent's Digimon. Then, by placing 1 card " +
            "in your hand face down as this Digimon's bottom digivolution card, this " +
            "Digimon gets +1000 DP until your opponent's turn ends for each of its " +
            "face-down digivolution cards.",
          optional: false,
          when: (ctx) => isSelfMove(ctx, source),
          resolve: async (ctx) => {
            await resolveSuspendThenPlaceForDP(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
