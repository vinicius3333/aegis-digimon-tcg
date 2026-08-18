import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Vilemon — BT15-072 (Purple Lv.3 Digimon).
//
// The declarative effect record had TWO behavioral errors on the leave-prevention clause:
//
//    timing has NO maxCountPerTurn limit (the rule implementation call passes `1` as the
//    priority integer, NOT the per-turn count — the count is omitted, defaulting to
//    unlimited). This Digimon can therefore protect multiple Apocalymon/Dark-Masters
//    Digimon per turn by paying its deletion cost each time.
//
// 2. The `trigger: "AllTurns"` mapping is correct (documented behavior WhenRemoveField -> EffectTiming.None
//    in the engine's continuous/static tier), but the IR's `AllTurns` went through
//    the `staticModifier` builder — which is right — yet the `frequency: "OncePerTurn"`
//    parameter (from the IR) gets applied to the built Effect and caps the replacement
//    at 1 activation per turn. Without it, the replacement fires for every qualifying
//    permanent that would leave.
//
//
//   timing == None      -> Blocker (static, self, non-inherited)
//   timing == WhenRemoveField -> prevent-leave replacement, [All Turns], NO once-per-turn cap,
//                               optional (canNoSelect: true), cost = delete this Digimon,
//                               protects your Apocalymon-named or Dark-Masters-trait Digimon
//                               (not self), "other than by your effects".
//
// KB (node tools/kb/query.mjs card BT15-072):
//   Q2560: "would leave the battle area" includes going to trash, hand/deck bounce,
//          to security, to breeding area, or placed under another card.
const cardId = "BT15-072";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // <Blocker> — static keyword, this Digimon (not inherited).
    // Modeled as a staticModifier that re-grants Blocker each recompute pass
    // (the EX11-074 continuous-keyword pattern).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blocker`,
          description: "＜Blocker＞",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),

        // [All Turns] When one of your [Apocalymon] or Digimon with the [Dark Masters]
        // trait would leave the battle area other than by one of your effects, by
        // deleting this Digimon, prevent 1 of those Digimon from leaving.
        //
        //   PermanentCondition: your battle-area Digimon (not self) named "Apocalymon" or
        //   optional (canNoSelect: true), cost: delete this Digimon.
        //
        // Mapped to a subscribeReplacement (wouldLeavePlay) registered in the static/continuous
        // pass. causeAllows = "otherThanYourEffect" (not by the owner's own effect).
        // protects: your battle-area Digimon (not self) named Apocalymon or Dark-Masters trait.
        // preventCheck: optional ask + pay by deleting this Digimon.
        staticModifier({
          source,
          effectKey: `${cardId}/protect-dark-masters`,
          description:
            "[All Turns] When one of your [Apocalymon] or Digimon with the [Dark Masters] " +
            "trait would leave the battle area other than by one of your effects, by deleting " +
            "this Digimon, prevent 1 of those Digimon from leaving.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const ownerSeat = source.ownerSeat;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              description:
                "[All Turns] When one of your [Apocalymon] or Digimon with the [Dark Masters] " +
                "trait would leave the battle area other than by one of your effects, by deleting " +
                "this Digimon, prevent 1 of those Digimon from leaving.",
              causeAllows: (cause, resolvingSeat) =>
                // "other than by one of YOUR effects"
                !(cause === "byEffect" && resolvingSeat === ownerSeat),
              protects: (subCtx, leavingId) => {
                const leaving = subCtx.game.permanentById(leavingId);
                if (leaving === undefined || leaving.topCard === undefined) return false;
                // Must be THIS owner's Digimon, not this Digimon itself.
                if (leaving.controllerSeat !== ownerSeat) return false;
                if (leaving.permanentId === self.permanentId) return false;
                if (!isDigimon(subCtx.game.definitionOf(leaving.topCard))) return false;
                const def = subCtx.game.definitionOf(leaving.topCard);
                const isApocalymon = def.nameEn === "Apocalymon";
                // Traits in CardDefinition live in `types` (card-module contract note F3; currently
                // empty for all cards in the DB, but structurally correct for when data lands).
                const hasDarkMasters = (def.types ?? []).some(
                  (t) => t === "Dark Masters" || t === "DarkMasters",
                );
                return isApocalymon || hasDarkMasters;
              },
              preventCheck: async (subCtx) => {
                // Optional: "by deleting this Digimon" — the cost is optional (canNoSelect:true).
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return false; // already deleted
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Delete this Digimon to prevent 1 Digimon from leaving the battle area?",
                );
                if (!yes) return false;
                await subCtx.fx.deletePermanent([self.permanentId]);
                return true;
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
