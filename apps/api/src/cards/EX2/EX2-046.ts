import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX2-046 — ADR-02 Searcher (EX2, White Lv.2 Digimon).
 *
 * Static: Play cost -2 if you don't have another [ADR-02 Searcher] in play.
 * [Your Turn]: This Digimon cannot attack players.
 * [On Play]: Draw 1.
 * Inherited [Your Turn]: Your D-Reaper trait Digimon get +1000 DP.
 */
const cardId = "EX2-046";

function hasDReaperTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "D-Reaper" || t === "DReaper");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // Static: Play cost -2 if no other ADR-02 Searcher in play.
    if (timing === EffectTiming.None) {
      out.push({
        effectKey: `${cardId}/play-cost-2`,
        description:
          "You may play this card at a cost of 2 less if you don't have another [ADR-02 Searcher] in play.",
        optional: false,
        isInherited: false,
        isSecurity: false,
        isLinked: false,
        maxPerTurn: -1,
        canTrigger: (ctx) => {
          const hand = ctx.game.player(source.ownerSeat).hand;
          if (!hand.some((c) => c.instanceId === ctx.source.instanceId)) return false;
          const battle = ctx.game.player(source.ownerSeat).battleArea;
          return !battle.some((p) => {
            if (p.topCard === undefined) return false;
            if (p.permanentId === ctx.source.instanceId) return false;
            const def = ctx.game.definitionOf(p.topCard);
            return def.nameEn.includes("ADR-02 Searcher");
          });
        },
        canActivate: () => true,
        resolve: async (ctx) => {
          ctx.fx.changePlayCost(
            (facts) => facts.def.cardId === source.cardId,
            -2,
          );
        },
      });
    }

    // [Your Turn]: Cannot attack players.
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/cant-attack-players`,
          description: "[Your Turn] This Digimon can't attack players.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;
            ctx.fx.restrict(self.permanentId, "attackPlayers", EffectDuration.Permanent);
          },
        }),
      );
    }

    // [On Play]: Draw 1.
    if (timing === EffectTiming.OnPlay) {
      out.push(
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw`,
          description: "[On Play] Draw 1 card from your deck.",
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      );
    }

    // Inherited [Your Turn]: D-Reaper trait Digimon +1000 DP.
    if (timing === EffectTiming.None) {
      out.push(
        staticModifier({
          source,
          effectKey: `${cardId}/inh-d-reaper-dp`,
          description: "Inherited: [Your Turn] Your Digimon with [D-Reaper] in their traits get +1000 DP.",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            for (const perm of ctx.game.player(source.ownerSeat).battleArea) {
              if (perm.topCard === undefined) continue;
              if (!isDigimon(ctx.game.definitionOf(perm.topCard))) continue;
              const def = ctx.game.definitionOf(perm.topCard);
              if (hasDReaperTrait(def)) {
                ctx.fx.modifyDP(perm.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
              }
            }
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
