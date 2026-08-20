import { EffectTiming, EffectDuration, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, whenAttacking, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST24-11";

function isLilamon(def: CardDefinition): boolean {
  return def.nameEn === "Lilamon" || def.nameEn.includes("Lilamon");
}

function hasDataSquad(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "DATA SQUAD");
}

import type { Seat } from "@aegis/shared";

function suspendAndRestrict(ctx: Parameters<NonNullable<Parameters<typeof whenDigivolving>[0]["resolve"]>>[0], source: CardSource, ownerSeat: Seat) {
  return async () => {
    const opponent = ctx.game.opponentOf(ownerSeat);
    const opp = ctx.game.player(opponent);
    const suspends = Array.from(opp.battleArea)
      .filter((p) => {
        if (p.topCard === undefined) return false;
        const def = ctx.game.definitionOf(p.topCard);
        return (isDigimon(def) || isTamer(def)) && !p.isSuspended;
      })
      .map((p) => p.permanentId);
    if (suspends.length > 0) {
      const chosen = await ctx.ask.chooseTargets(ctx, {
        candidates: suspends,
        min: 0,
        max: 2,
      });
      for (const id of chosen) {
        ctx.fx.suspend([id]);
      }
    }
    const ownerPerms = ctx.game.player(ownerSeat);
    const tamerIds = Array.from(ownerPerms.battleArea)
      .filter((p) => p.topCard !== undefined && isTamer(ctx.game.definitionOf(p.topCard)))
      .map((p) => p.permanentId);
    if (tamerIds.length > 0) {
      const trashTarget = await ctx.ask.chooseTargets(ctx, {
        candidates: tamerIds,
        min: 1,
        max: 1,
      });
      if (trashTarget.length > 0) {
        const tamer = ctx.game.permanentById(trashTarget[0]!);
        if (tamer !== undefined && tamer.stack.length > 0) {
          const bottomCard = tamer.stack[tamer.stack.length - 1];
          if (bottomCard !== undefined) {
            ctx.fx.trash([bottomCard.instanceId]);
          }
        }
        const allOppDigimon = Array.from(opp.battleArea)
          .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
          .map((p) => p.permanentId);
        for (const id of allOppDigimon) {
          ctx.fx.restrict(id, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
        }
      }
    }
  };
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] [Once Per Turn] You may suspend up to 2 of your opponent's " +
            "Digimon or Tamers. Then, by trashing 1 face-down card from under any of your " +
            "Tamers, none of your opponent's Digimon can unsuspend until their turn ends.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await suspendAndRestrict(ctx, source, source.ownerSeat)();
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking`,
          description:
            "[When Attacking] [Once Per Turn] You may suspend up to 2 of your opponent's " +
            "Digimon or Tamers. Then, by trashing 1 face-down card from under any of your " +
            "Tamers, none of your opponent's Digimon can unsuspend until their turn ends.",
          optional: true,
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const suspends = Array.from(opp.battleArea)
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return (isDigimon(def) || isTamer(def)) && !p.isSuspended;
              })
              .map((p) => p.permanentId);
            if (suspends.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: suspends, min: 0, max: 2 });
              for (const id of chosen) {
                ctx.fx.suspend([id]);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/on-suspend-security`,
          description:
            "[All Turns] [Once Per Turn] When one of your opponent's Digimon or Tamers is " +
            "suspended, trash the top card of your opponent's security.",
          maxPerTurn: 1,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenSuspended",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/on-suspend-or-trash-security`,
              description: `${cardId}: When opponent Digimon/Tamer suspended, trash top security.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined) return false;
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                if (subject.controllerSeat !== opponent) return false;
                if (subject.topCard === undefined) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) || isTamer(def);
              },
              run: async (subCtx) => {
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                const opp = subCtx.game.player(opponent);
                if (opp.security.length > 0) {
                  const top = Array.from(opp.security)[0];
                  if (top !== undefined) {
                    subCtx.fx.trash([top.instanceId]);
                  }
                }
              },
            });
            ctx.fx.subscribeSubTrigger({
              event: "whenDigivolutionTrashed",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/on-suspend-or-trash-security`,
              description: `${cardId}: when an effect trashes cards under a Tamer, trash top security.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.controllerSeat !== source.ownerSeat || subject.topCard === undefined) return false;
                return isTamer(subCtx.game.definitionOf(subject.topCard));
              },
              run: async (subCtx) => {
                const opponent = subCtx.game.opponentOf(source.ownerSeat);
                const security = subCtx.game.player(opponent).security;
                if (security.length > 0) subCtx.fx.trash([security[0]!.instanceId]);
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
