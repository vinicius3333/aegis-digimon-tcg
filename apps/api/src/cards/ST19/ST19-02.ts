import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST19-02 — Angewomon (X Antibody), ST19, Yellow Lv.5 Digimon.
 *
 * source: documented behavior.
 *
 * Two WhenPermanentWouldBeDeleted clauses:
 *   1. Decoy ([Puppet] trait) — When another friendly Puppet-trait Digimon would be deleted by
 *      an opponent's effect, you may delete THIS Digimon to prevent that deletion.
 *   2. Barrier (inherited) — Once per turn, negate an effect that would delete this Digimon.
 *
 * (the replacement subscriptions are installed as static/continuous effects, and are consulted
 * by the leave-prevention subsystem when a permanent would be deleted).
 */
const cardId = "ST19-02";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        // (1) Decoy ([Puppet] trait) — install replacement subscription.
        staticModifier({
          source,
          effectKey: `${cardId}/decoy-puppet`,
          description:
            "<Decoy ([Puppet] trait)> (When one of your other [Puppet] trait Digimon would " +
            "be deleted by an opponent's effect, you may delete this Digimon to prevent that deletion.)",
          optional: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            ctx.fx.subscribeReplacement({
              event: "wouldBeDeleted",
              mode: "prevent",
              description: "Decoy: prevent Puppet Digimon deletion by deleting this Digimon",
              sourcePermanentId: source.permanent()?.permanentId,
              causeAllows: (cause, resolvingSeat) => {
                if (cause !== "byEffect") return false;
                return resolvingSeat !== undefined && resolvingSeat !== source.ownerSeat;
              },
              protects: (_checkCtx, leavingPermanentId) => {
                const self = source.permanent();
                if (self === undefined) return false;
                // Protect other Puppet-trait Digimon (not self)
                if (leavingPermanentId === self.permanentId) return false;
                const leaving = ctx.game.permanentById(leavingPermanentId);
                if (leaving === undefined || leaving.topCard === undefined) return false;
                if (!isDigimon(ctx.game.definitionOf(leaving.topCard))) return false;
                return ctx.game.definitionOf(leaving.topCard).types?.includes("Puppet") ?? false;
              },
              preventCheck: async (checkCtx, _leavingPermanentId) => {
                const self = source.permanent();
                if (self === undefined) return false;

                const wantToDecoy = await checkCtx.ask.optional(
                  checkCtx,
                  `Delete ST19-02 to prevent deletion of your Puppet Digimon?`,
                );
                if (!wantToDecoy) return false;

                await checkCtx.fx.deletePermanent([self.permanentId], "byEffect");
                // Waste this replacement so it's only consumed once.
                return true;
              },
              affectsAll: true,
            });
          },
        }),

        // (2) Barrier (inherited) — Once per turn, prevent this Digimon's deletion.
        staticModifier({
          source,
          effectKey: `${cardId}/barrier-ess`,
          description:
            "<Barrier> (Once per turn, when this Digimon would be deleted, negate that deletion.)",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            ctx.fx.subscribeReplacement({
              event: "wouldBeDeleted",
              mode: "prevent",
              description: "Barrier: negate this Digimon's deletion (Once per turn)",
              sourcePermanentId: source.permanent()?.permanentId,
              // ＜Barrier＞ is ONCE PER TURN: a stable per-permanent key the consult honors so a
              // second deletion the same turn is no longer negated (the static effect's maxPerTurn
              // only limits installs during the continuous pass, not the replacement firing).
              oncePerTurnKey: `${source.permanent()?.permanentId}/barrier`,
              protects: (_checkCtx, leavingPermanentId) => {
                const self = source.permanent();
                if (self === undefined) return false;
                return leavingPermanentId === self.permanentId;
              },
              preventCheck: async (checkCtx, _leavingPermanentId) => {
                const self = source.permanent();
                if (self === undefined) return false;

                const wantToBarrier = await checkCtx.ask.optional(
                  checkCtx,
                  "Activate <Barrier> to prevent this Digimon's deletion?",
                );
                if (!wantToBarrier) return false;

                // Barrier simply negates the deletion — no additional cost.
                return true;
              },
              affectsAll: true,
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
