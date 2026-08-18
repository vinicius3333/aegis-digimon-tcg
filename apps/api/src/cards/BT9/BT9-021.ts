import { CardKind,  EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, onAddHand } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT9-021 — Blue Lv.4 Digimon (BT9, Gomamon line).
//
// [Your Turn] [Once Per Turn] When you play a blue Tamer, <Draw 1>.
// [Your Turn] [Once Per Turn] (inherited) When an effect adds a card to your hand,
//   return 1 of your opponent's level 3 Digimon to its owner's hand.
//
// The first effect is a sub-trigger on whenPlayed filtered to a blue Tamer controlled by
// the source's owner. Armed via a staticModifier that subscribes the watcher once.
// The second effect is an inherited onAddHand (EffectTiming.OnAddHand) that gates on
// "effect adds a card to YOUR hand" and fires at most once per turn.

const cardId = "BT9-021";

function isBlueTamer(ctx: EffectContext, permanent: Permanent): boolean {
  if (permanent.topCard == null) return false;
  const def = ctx.game.definitionOf(permanent.topCard);
  return def.kinds?.includes(CardKind.Tamer) && def.colors.includes("Blue" as never);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/blue-tamer-draw`,
          description: "[Your Turn] [Once Per Turn] When you play a blue Tamer, <Draw 1>.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: ctx.source.permanent()?.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/blue-tamer-draw`,
              description: "BT9-021: When you play a blue Tamer, draw 1",
              matches: (subCtx) => {
                const subjectId = subCtx.trigger.subjectPermanentId;
                if (subjectId === undefined) return false;
                const perm = subCtx.game.permanentById(subjectId);
                if (perm === undefined) return false;
                return isBlueTamer(subCtx, perm);
              },
              run: async (subCtx) => {
                await subCtx.fx.draw(subCtx.source.ownerSeat, 1);
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/effect-adds-hand-bounce-watcher`,
          description:
            "[Your Turn] [Once Per Turn] When an effect adds a card to your hand, return 1 opposing level 3 Digimon to hand.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToHand",
              sourcePermanentId: ctx.source.permanent()?.permanentId,
              once: false,
              oncePerTurnKey: `${cardId}/on-add-hand-bounce`,
              description: "BT9-021 inherited: effect adds to your hand",
              matches: (subCtx) => subCtx.trigger.effectAddedToHandSeat === subCtx.source.ownerSeat,
              run: async (subCtx) => {
                const opponent = subCtx.game.player(subCtx.game.opponentOf(subCtx.source.ownerSeat));
                const targets = Array.from(opponent.battleArea).filter((permanent) => {
                  if (permanent.topCard == null) return false;
                  const definition = subCtx.game.definitionOf(permanent.topCard);
                  return isDigimon(definition) && definition.level === 3;
                });
                if (targets.length === 0) return;
                const chosen = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: targets.map((permanent) => permanent.permanentId),
                  min: 1,
                  max: 1,
                });
                const target = chosen[0] === undefined ? undefined : subCtx.game.permanentById(chosen[0]);
                if (target?.topCard !== undefined) await subCtx.fx.returnToHand([target.topCard.instanceId]);
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnAddHand) {
      return [
        onAddHand({
          source,
          effectKey: `${cardId}/on-add-hand-bounce`,
          description:
            "[Your Turn] [Once Per Turn] When an effect adds a card to your hand, return 1 of your opponent's level 3 Digimon to its owner's hand.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            const added = ctx.trigger.addedToHand;
            if (added === undefined) return false;
            if (!added.byEffect) return false;
            return added.byEffect.ownerSeat === ctx.source.ownerSeat;
          },
          canActivate: (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(ctx.source.ownerSeat));
            for (const p of opponent.battleArea) {
              if (p.topCard == null) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (isDigimon(def) && def.level === 3) return true;
            }
            return false;
          },
          resolve: async (ctx) => {
            const opponent = ctx.game.player(ctx.game.opponentOf(ctx.source.ownerSeat));
            const targets = Array.from(opponent.battleArea).filter((p) => {
              if (p.topCard == null) return false;
              const def = ctx.game.definitionOf(p.topCard);
              return isDigimon(def) && def.level === 3;
            });

            if (targets.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              const perm = ctx.game.permanentById(chosen[0]!);
              if (perm?.topCard) {
                await ctx.fx.returnToHand([perm.topCard.instanceId]);
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
