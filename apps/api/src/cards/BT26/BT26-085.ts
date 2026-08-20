import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardInstance, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-085 — Giant Slayer (BT26, White Digimon, TS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-085 as of this port
// (`node tools/kb/query.mjs card BT26-085` returned no knowledge-base entries). Implemented
// from the printed card text only.
//
// [Assembly -5] 5 different-level cards w/[Chronomon] in text or w/[Shaman] trait
// ＜Collision＞ ＜Reboot＞ ＜Blocker＞ — printed keywords, auto-parsed from effectText by
//   combat/keywords.ts; no module clause (BT26-013's convention).
// [On Play] Until your opponent's turn ends, your opponent's effects can't reduce this
//   Digimon's DP or trash its stacked cards.
// [All Turns] When this Digimon would leave the battle area, by digivolving it into
//   [Chronomon: Destroy Mode] in the hand or trash without paying the cost, it doesn't leave.
//
// The [Assembly -5] recipe is supplied by the shared hand-authored
// `ASSEMBLY_REQUIREMENT_OVERRIDES` table because BT26's effect modules are hand-written.
//
// Clause 1: "your opponent's effects can't reduce this Digimon's DP" is
//   `restrict(..., "dpImmune", ..., { byOpponentEffectsOnly: true })` — the interpreter's own
//   mapping for the printed `dpReduction` protection — paired with `stackTrashLock` for
//   "or trash its stacked cards" (EX12-059's precedent, including its optional-primitive
//   guard: `stackTrashLock` is optional on Primitives and absent from lightweight fakes).
// Clause 2: BT26-033/BT26-058's leave-prevention idiom. This one guards only THIS Digimon
//   ("when this Digimon would leave"), and the cost is the free digivolution itself — the
//   prevention succeeds only when a [Chronomon: Destroy Mode] card was actually placed.

const cardId = "BT26-085";
const DESTROY_MODE_NAME = "Chronomon: Destroy Mode";

function destroyModeCandidates(ctx: EffectContext, ownerSeat: Seat): string[] {
  const owner = ctx.game.player(ownerSeat);
  const fromZones: CardInstance[] = [...owner.hand, ...owner.trash];
  return fromZones
    .filter((card) => ctx.game.definitionOf(card).nameEn === DESTROY_MODE_NAME)
    .map((card) => card.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-dp-and-stack-protection`,
          description:
            "[On Play] Until your opponent's turn ends, your opponent's effects can't reduce " +
            "this Digimon's DP or trash its stacked cards.",
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            ctx.fx.restrict(self.permanentId, "dpImmune", EffectDuration.UntilOpponentTurnEnd, {
              byOpponentEffectsOnly: true,
            });
            ctx.fx.stackTrashLock?.(self.permanentId, EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/prevent-leave-digivolve-into-destroy-mode`,
          description:
            "[All Turns] When this Digimon would leave the battle area, by digivolving it into " +
            "[Chronomon: Destroy Mode] in the hand or trash without paying the cost, it doesn't " +
            "leave.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: selfId,
              mode: "prevent",
              description:
                "[All Turns] By digivolving this Digimon into [Chronomon: Destroy Mode] in the " +
                "hand or trash without paying the cost, it doesn't leave the battle area.",
              protects: (_subCtx, leavingPermanentId) => leavingPermanentId === selfId,
              preventCheck: async (subCtx) => {
                const candidates = destroyModeCandidates(subCtx, ownerSeat);
                if (candidates.length === 0) return false;

                const wantToPay = await subCtx.ask.optional(
                  subCtx,
                  "Digivolve this Digimon into [Chronomon: Destroy Mode] from your hand or trash " +
                    "without paying the cost to keep it on the battle area?",
                );
                if (!wantToPay) return false;

                const chosen =
                  candidates.length === 1
                    ? candidates
                    : await subCtx.ask.selectCards(subCtx, { candidates, min: 1, max: 1 });
                if (chosen.length === 0) return false;

                const result = await subCtx.fx.digivolveFromInstance(selfId, chosen[0]!, {
                  ignoreRequirements: true,
                });
                return result !== undefined;
              },
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
