import { EffectTiming, EffectDuration, isDigimon, CardColor, type CompiledCard } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming } from "../../engine/effects/builders.js";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * EX4-037 — Rapidmon X (EX4, Green Lv.5 Digimon).
 *
 * Digivolution requirement: 4 from level 5 Green multicolor or Rapidmon (handled by engine).
 * [End of Your Turn][Once Per Turn] 2 of your green/black Digimon gain <Blocker> and
 *   <Reboot> until opponent's end of turn.
 * [All Turns][Once Per Turn] When another Digimon becomes suspended, you may
 *   unsuspend this Digimon.
 */
const cardId = "EX4-037";

function isGreenOrBlack(def: ReturnType<EffectContext["game"]["definitionOf"]>): boolean {
  const colors = def.colors as CardColor[] | undefined;
  if (!colors) return false;
  return colors.includes(CardColor.Green) && colors.includes(CardColor.Black);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [End of Your Turn][Once Per Turn] Grant Blocker + Reboot to 2 green/black Digimon.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-buff`,
          description:
            "[End of Your Turn][Once Per Turn] Until the end of your opponent's turn, 2 of your green and black Digimon gain <Blocker> and <Reboot>.",
          optional: false,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            return mine.filter((p) => {
              if (p.topCard === undefined) return false;
              if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
              return isGreenOrBlack(ctx.game.definitionOf(p.topCard));
            }).length >= 2;
          },
          resolve: async (ctx) => {
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            const candidates = mine
              .filter((p) => {
                if (p.topCard === undefined) return false;
                if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
                return isGreenOrBlack(ctx.game.definitionOf(p.topCard));
              })
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const max = Math.min(2, candidates.length);
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max });
            for (const id of chosen) {
              ctx.fx.grantKeyword(id, "Blocker", EffectDuration.UntilOpponentTurnEnd);
              ctx.fx.grantKeyword(id, "Reboot", EffectDuration.UntilOpponentTurnEnd);
            }
          },
        }),
      ];
    }

    // [All Turns][Once Per Turn] When another Digimon suspended → unsuspend this.
    if (timing === EffectTiming.OnUnTappedAnyone) {
      return [
        {
          effectKey: `${cardId}/unsuspend-self`,
          description:
            "[All Turns][Once Per Turn] When another Digimon becomes suspended, you may unsuspend this Digimon.",
          optional: true,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const suspendedId = ctx.trigger.suspendedPermanentId;
            if (suspendedId === undefined) return false;
            if (suspendedId === ctx.source.instanceId) return false;
            const suspended = ctx.game.permanentById(suspendedId);
            if (!suspended) return false;
            return suspended.topCard !== undefined && isDigimon(ctx.game.definitionOf(suspended.topCard));
          },
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return self !== undefined && self.isSuspended;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (!self) return;
            await ctx.fx.unsuspend([self.permanentId]);
          },
        },
      ];
    }

    return [];
  },
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
      actions: [{ kind: "GainKeyword", target: { filter: { controller: "mine", kind: ["Digimon"], colors: ["Green", "Black"] }, count: 2 }, keywords: [{ keyword: "Blocker" }, { keyword: "Reboot" }], keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" }],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }], frequency: "OncePerTurn" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
export default module;
