import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT22-073 — Purple Lv.5 Digimon (BT22, Crescemon).
//
// ＜Jamming＞
// Digivolve: 3 from Level 4 with [Night Claw]/[Light Fang]/[CS] trait
// [When Digivolving] <Draw 1> and trash 1 card in your hand. Then, if this Digimon's
//   stack has 2 or more same-level cards, 1 of your opponent's Digimon or Tamers can't
//   suspend until their turn ends.
// [All Turns] [Once Per Turn] (inherited) When this Digimon with the [Night Claw],
//   [Light Fang] or [Galaxy] trait would be deleted, by trashing 2 same-level cards
//   from its digivolution cards, it isn't deleted.

const cardId = "BT22-073";

function hasTwoSameLevelInStack(ctx: EffectContext, source: CardSource): boolean {
  const perm = source.permanent();
  if (perm === undefined) return false;
  const levelCounts = new Map<number, number>();
  for (const card of perm.stack) {
    const level = ctx.game.definitionOf(card).level;
    if (level === undefined) continue;
    levelCounts.set(level, (levelCounts.get(level) ?? 0) + 1);
  }
  return Array.from(levelCounts.values()).some((c) => c >= 2);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      const effects: Effect[] = [];

      // ＜Jamming＞ — intrinsic keyword.
      effects.push(
        staticModifier({
          source,
          effectKey: `${cardId}/jamming`,
          description: "＜Jamming＞",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.Permanent);
            }
          },
        }),
      );

      // Inherited: when-would-be-deleted prevention (same pattern as BT22-072).
      effects.push(
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-prevent-deletion`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon with the [Night Claw], [Light Fang] " +
            "or [Galaxy] trait would be deleted, by trashing 2 same-level cards from its " +
            "digivolution cards, it isn't deleted.",
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;

            const hostDef = ctx.game.definitionOf(host.topCard!);
            const traits = hostDef.types ?? [];
            const relevantTrait =
              traits.includes("Galaxy") || traits.includes("Night Claw") || traits.includes("Light Fang");
            if (!relevantTrait) return;

            ctx.fx.subscribeReplacement({
              event: "wouldBeDeleted",
              sourcePermanentId: host.permanentId,
              mode: "prevent",
              description: "[All Turns] Trash 2 same-level digivolution cards to prevent deletion.",
              protects: (_subCtx, leavingId) => leavingId === host.permanentId,
              preventCheck: async (subCtx) => {
                const current = subCtx.game.permanentById(host.permanentId);
                if (current === undefined) return false;

                const stack = current.stack;
                const byLevel = new Map<number, string[]>();
                for (const card of stack) {
                  const level = subCtx.game.definitionOf(card).level;
                  if (level === undefined) continue;
                  const group = byLevel.get(level) ?? [];
                  group.push(card.instanceId);
                  byLevel.set(level, group);
                }

                const payableIds: string[] = [];
                for (const group of byLevel.values()) {
                  if (group.length >= 2) payableIds.push(...group);
                }
                if (payableIds.length < 2) return false;

                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Trash 2 same-level digivolution cards to prevent deletion?",
                );
                if (!yes) return false;

                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: payableIds,
                  min: 2,
                  max: 2,
                });
                if (chosen.length !== 2) return false;

                const levels = chosen.map((id) => {
                  const card = stack.find((c) => c.instanceId === id);
                  return card === undefined ? undefined : subCtx.game.definitionOf(card).level;
                });
                if (levels[0] === undefined || levels[1] === undefined || levels[0] !== levels[1]) {
                  return false;
                }

                await subCtx.fx.trashDigivolutionCards(current.permanentId, chosen);
                return true;
              },
            });
          },
        }),
      );

      return effects;
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] <Draw 1> and trash 1 card in your hand. Then, if this " +
            "Digimon's stack has 2 or more same-level cards, 1 of your opponent's Digimon " +
            "or Tamers can't suspend until their turn ends.",
          optional: false,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            if (owner.deckCount > 0) {
              await ctx.fx.draw(source.ownerSeat, 1);
            }

            // Read the live hand collection after Draw 1; the denormalized handCount can lag
            // until the state snapshot is synchronized.
            if (owner.hand.length > 0) {
              const handCards = Array.from(owner.hand);
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: handCards.map((c) => c.instanceId),
                min: 1,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.trash(chosen);
              }
            }

            if (hasTwoSameLevelInStack(ctx, source)) {
              const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
              const targets = Array.from(opponent.battleArea).filter((p) => {
                if (p.topCard == null) return false;
                const def = ctx.game.definitionOf(p.topCard);
                return isDigimon(def) || def.kinds?.includes(CardKind.Tamer);
              });

              if (targets.length > 0) {
                const chosen = await ctx.ask.chooseTargets(ctx, {
                  candidates: targets.map((p) => p.permanentId),
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  ctx.fx.restrict(chosen[0]!, "suspend", EffectDuration.UntilOpponentTurnEnd);
                }
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
