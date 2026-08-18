import { CardKind,  EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT22-072 — Purple Lv.4 Digimon (BT22, Lekismon).
//
// Digivolve: 2 from Level 3 with [Night Claw]/[Light Fang]/[CS] trait
// [When Digivolving] If this Digimon's stack has 2 or more same-level cards, you may play
//   1 Tamer card with the [Night Claw] or [Light Fang] trait from your hand without paying
//   the cost. This effect can't play cards with the same name as any of your Tamers.
// [All Turns] [Once Per Turn] (inherited) When this Digimon with the [Night Claw],
//   [Light Fang] or [Galaxy] trait would be deleted, by trashing 2 same-level cards
//   from its digivolution cards, it isn't deleted.

const cardId = "BT22-072";

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

function nightClawOrLightFangTraits(traits?: string[]): boolean {
  if (!traits) return false;
  return traits.includes("Night Claw") || traits.includes("Light Fang");
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
            "[When Digivolving] If this Digimon's stack has 2 or more same-level cards, " +
            "you may play 1 Tamer card with the [Night Claw] or [Light Fang] trait from your " +
            "hand without paying the cost. This effect can't play cards with the same name as " +
            "any of your Tamers.",
          optional: true,
          canActivate: (ctx) => hasTwoSameLevelInStack(ctx, source),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);

            const existingTamerNames = new Set<string>();
            for (const p of owner.battleArea) {
              if (p.topCard == null) continue;
              const def = ctx.game.definitionOf(p.topCard);
              if (def.kinds?.includes(CardKind.Tamer)) {
                existingTamerNames.add(def.nameEn);
              }
            }

            const candidates = Array.from(owner.hand).filter((card) => {
              const def = ctx.game.definitionOf(card);
              if (!def.kinds?.includes(CardKind.Tamer)) return false;
              if (!nightClawOrLightFangTraits(def.types)) return false;
              if (existingTamerNames.has(def.nameEn)) return false;
              return true;
            });

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });

            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-prevent-deletion`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon with the [Night Claw], [Light Fang] " +
            "or [Galaxy] trait would be deleted, by trashing 2 same-level cards from its " +
            "digivolution cards, it isn't deleted.",
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;

            const hostDef = ctx.game.definitionOf(host.topCard!);
            const traits = hostDef.types ?? [];
            const relevantTrait =
              traits.includes("Galaxy") ||
              traits.includes("Night Claw") ||
              traits.includes("Light Fang");
            if (!relevantTrait) return;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: host.permanentId,
              mode: "prevent",
              description:
                "[All Turns] Trash 2 same-level digivolution cards to prevent deletion.",
              causeAllows: (cause) => cause === "byEffect",
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
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
