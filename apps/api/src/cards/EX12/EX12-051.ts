import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * EX12-051 — Lamortmon (EX12, Purple Lv.6 Digimon).
 *
 *
 * Alt digivolve: from Lv.4 [Angoramon] text or [NSp] trait at cost 3 (in digivolutionRequirement).
 *
 * [Static] ＜Reboot＞
 * [Static] ＜Blocker＞
 * [On Play] / [When Digivolving]:
 *   Suspend 1 of your opponent's Digimon or Tamers.
 *   Then, de-digivolve 1 of your opponent's Digimon by 1.
 * [All Turns][Once Per Turn] (inherited):
 *   When this Digimon with [Angoramon] in its text or the [NSp] trait wins a battle,
 *   trash your opponent's top security card.
 *
 * `whenBattleWon` is now a live SubTrigger event (combat/controller.ts's resolveDigimonBattle
 * fires it for the winning side, CR §14-2-1), so this is a real hand-installed watcher, not a
 * dead-letter placeholder. Installed from EffectTiming.None (mirroring the ＜Reboot＞/＜Blocker＞
 * statics above) so it re-arms on the CURRENT top/host permanent every recompute — matching
 * "this Digimon" for both the un-buried self case and the inherited/buried case.
 */
const cardId = "EX12-051";

/** Shared body for [On Play] and [When Digivolving]. */
async function suspendAndDeDigivolve(ctx: Parameters<Effect["resolve"]>[0]): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  const opponentArea = ctx.game.player(opponentSeat).battleArea;

  const targets = opponentArea
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      const kinds = def.kinds as string[];
      return kinds.includes("Digimon") || kinds.includes("Tamer");
    })
    .map((p) => p.permanentId);

  if (targets.length === 0) return;

  const suspendIds =
    targets.length === 1
      ? [targets[0]!]
      : await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });

  if (suspendIds.length > 0) {
    await ctx.fx.suspend(suspendIds);
  }

  // De-digivolve 1 opponent Digimon by 1.
  const digimonIds = opponentArea
    .filter((p) => {
      if (p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return (def.kinds as string[]).includes("Digimon");
    })
    .map((p) => p.permanentId);

  if (digimonIds.length === 0) return;

  const ddTargets =
    digimonIds.length === 1
      ? [digimonIds[0]!]
      : await ctx.ask.chooseTargets(ctx, { candidates: digimonIds, min: 1, max: 1 });

  if (ddTargets.length > 0 && ddTargets[0] !== undefined) {
    ctx.fx.deDigivolve(ddTargets[0], 1);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Reboot＞ and ＜Blocker＞ static grants.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/reboot`,
          description: "＜Reboot＞ — unsuspend at start of each opponent turn.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/when-battle-won-trash-security`,
          description:
            "[All Turns][Once Per Turn] When this Digimon with [Angoramon] in its text or the " +
            "[NSp] trait wins a battle, trash your opponent's top security card.",
          isInherited: false,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenBattleWon",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/when-battle-won-trash-security`,
              description: `${cardId}: When this Digimon wins a battle, trash opponent's top security.`,
              matches: (subCtx) => {
                const winnerId = subCtx.trigger?.subjectPermanentId;
                if (winnerId === undefined || winnerId !== self.permanentId) return false;
                const winnerPerm = subCtx.game.permanentById(winnerId);
                if (winnerPerm === undefined || winnerPerm.topCard === undefined) return false;
                const def = subCtx.game.definitionOf(winnerPerm.topCard);
                return (
                  matchNameOrTrait(def, { tokens: ["Angoramon"], match: "text" }) ||
                  matchNameOrTrait(def, { tokens: ["NSp"], match: "trait" })
                );
              },
              run: async (subCtx) => {
                const opponentSeat = subCtx.game.opponentOf(source.ownerSeat);
                await subCtx.fx.trashFromSecurity(opponentSeat, 1, { fromTop: true });
              },
            });
          },
        }),
      ];
    }

    // [On Play]: suspend 1 opponent Digimon/Tamer, then de-digivolve 1 opponent Digimon by 1.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-suspend-dedigivolve`,
          description:
            "[On Play] Suspend 1 of your opponent's Digimon or Tamers, then de-digivolve 1 of " +
            "your opponent's Digimon by 1.",
          resolve: suspendAndDeDigivolve,
        }),
      ];
    }

    // [When Digivolving]: same as [On Play].
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-suspend-dedigivolve`,
          description:
            "[When Digivolving] Suspend 1 of your opponent's Digimon or Tamers, then de-digivolve " +
            "1 of your opponent's Digimon by 1.",
          resolve: suspendAndDeDigivolve,
        }),
      ];
    }

    // [All Turns][Once Per Turn] (inherited):
    // When this Digimon wins a battle, trash opponent's top security.
    // RESIDUAL: whenBattleWon has ZERO engine callers — this watcher can never fire.
    // The subscription is omitted to avoid a dead-letter watcher.

    return [];
  },
};

registerCard(module);
export default module;
