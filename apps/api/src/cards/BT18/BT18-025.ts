import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Korikakumon — BT18-025 (Blue Lv.5 Digimon).
//
// The declarative effect record had TWO behavioral errors on the [On Play] / [When Digivolving] clause:
//
//    `permanent.UntilOwnerTurnEndEffects`, where the "owner" is the AFFECTED
//    permanent's controller (the opponent). This expires at the end of the
//    OPPONENT's turn — i.e., `EffectDuration.UntilOpponentTurnEnd` from the
//    perspective of this card's effect source.
//
// 2. The target filter did not restrict to Digimon with NO digivolution cards.
//    Without this filter, the effect would target ANY opponent Digimon, not just
//    Digimon with empty digivolution stacks.
//
// Additionally, the declarative effect record's `digivolutionRequirement` entries (cost 4 / 3 / 1)
// form to any blue-or-red tamer; cost-3 to Tommy Himi; cost-1 to Kumamon). The engine
// does not yet enforce per-requirement conditions at runtime, so the digivolutionRequirement
// metadata remains as-is in the shared IR; this port focuses only on the behavioral
// effects.
//
// KB (node tools/kb/query.mjs card BT18-025):
//   Q2943: The Tamer that becomes a digivolution card is NOT treated as a Digimon.
//   Q2944: "when a Digimon would digivolve" effects do NOT trigger for Tamer-digi.
//   Q2945: "when a Digimon digivolves" effects do NOT trigger for Tamer-digi.
const cardId = "BT18-025";

/** Candidate opponent Digimon with NO digivolution cards. */
function selectableOpponentDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (p) =>
        p.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(p.topCard)) &&
        p.stack.length === 0, // HasNoDigivolutionCards
    );
}

/**
 * Shared [On Play] / [When Digivolving] body:
 * "1 of your opponent's Digimon with no digivolution cards can't suspend until the
 * end of their turn."
 * maxCount 1, then rule implementation added to UntilOwnerTurnEndEffects (= opponent's
 * turn end).
 */
async function restrictSuspendOnOpponentDigimon(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = selectableOpponentDigimon(ctx, source);
  if (candidates.length === 0) return;

  const picks = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((p) => p.permanentId),
    min: 1,
    max: 1,
  });
  const targetId = picks[0];
  if (targetId === undefined) return;

  // "can't suspend until the end of their turn" — their turn = opponent's turn.
  // UntilOpponentTurnEnd is framed from the source's perspective = until the source's
  // opponent's (the affected card's controller's) turn ends.
  ctx.fx.restrict(targetId, "suspend", EffectDuration.UntilOpponentTurnEnd);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Jamming＞ — printed keyword (not inherited).
    // Continuous keyword grant (the EX11-074 pattern); re-granted each recompute pass.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/jamming`,
          description: "＜Jamming＞",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),

        // ＜Jamming＞ — inherited ESS (stack-inherited keyword).
        staticModifier({
          source,
          effectKey: `${cardId}/jamming-ess`,
          description: "＜Jamming＞ (inherited)",
          isInherited: true,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    // [On Play] 1 of your opponent's Digimon with no digivolution cards can't suspend
    // until the end of their turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-cant-suspend`,
          description:
            "[On Play] 1 of your opponent's Digimon with no digivolution cards can't " +
            "suspend until the end of their turn.",
          canActivate: (ctx) =>
            source.isOnBattleArea() &&
            selectableOpponentDigimon(ctx, source).length > 0,
          resolve: async (ctx) => restrictSuspendOnOpponentDigimon(ctx, source),
        }),
      ];
    }

    // [When Digivolving] (identical body).
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-cant-suspend`,
          description:
            "[When Digivolving] 1 of your opponent's Digimon with no digivolution cards " +
            "can't suspend until the end of their turn.",
          canActivate: (ctx) =>
            source.isOnBattleArea() &&
            selectableOpponentDigimon(ctx, source).length > 0,
          resolve: async (ctx) => restrictSuspendOnOpponentDigimon(ctx, source),
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
