import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT5-091";

const GRANTED_TOKEN = "[When Attacking] Lose 1 memory.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] When one of your Digimon digivolves, you may suspend this Tamer
    // to trigger <Draw 1>.
    //
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        activated({
          source,
          effectKey: `${cardId}/when-digivolve-suspend-draw`,
          description:
            "[Your Turn] When one of your Digimon digivolves, you may suspend " +
            "this Tamer to trigger <Draw 1>.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            // Verify the subject (entering permanent) is a friendly Digimon.
            const subject = ctx.game.player(source.ownerSeat).battleArea.find(
              (p) => p.permanentId === subjectId,
            );
            if (subject === undefined) return false;
            if (subject.topCard === undefined) return false;
            return isDigimon(ctx.game.definitionOf(subject.topCard));
          },
          canActivate: (ctx) => {
            const self = source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined || self.isSuspended) return;
            await ctx.fx.suspend([self.permanentId]);
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    // [All Turns] All level 3 Digimon gain "[When Attacking] Lose 1 memory."
    //
    //   GetEffects: returns an rule implementation at OnAllyAttack that loses 1 memory.
    //   Mapped to staticModifier that grants the text effect via grantCustomEffect.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/grant-lv3-lose-memory`,
          description:
            "[All Turns] All level 3 Digimon gain \"[When Attacking] Lose 1 memory.\"",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const seats = [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)];
            for (const seat of seats) {
              for (const permanent of ctx.game.player(seat).battleArea) {
                if (permanent.inBreeding) continue;
                if (permanent.topCard === undefined) continue;
                const def = ctx.game.definitionOf(permanent.topCard);
                if (!isDigimon(def)) continue;
                if (def.level !== 3) continue;
                ctx.fx.grantCustomEffect?.(
                  permanent.topCard.instanceId,
                  seat,
                  GRANTED_TOKEN,
                  EffectDuration.UntilEachTurnEnd,
                );
              }
            }
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          optional: false,
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
