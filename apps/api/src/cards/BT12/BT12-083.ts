import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-083";

function hasSaveText(def: CardDefinition): boolean {
  const hay = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`;
  return hay.includes("＜Save＞") || hay.toLowerCase().includes("<save");
}

/** Count of distinct card colors across all Tamers the owner has in play. */
function distinctTamerColorCount(ctx: EffectContext, source: CardSource): number {
  const colors = new Set<string>();
  ctx.game.player(source.ownerSeat).battleArea.forEach((p) => {
    if (p.inBreeding || p.topCard === undefined) return;
    const def = ctx.game.definitionOf(p.topCard) as CardDefinition;
    if (!isTamer(def)) return;
    for (const c of def.colors) colors.add(c);
  });
  return colors.size;
}

function opponentDigimonUpToLevel(ctx: EffectContext, source: CardSource, maxLevel: number): string[] {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  return ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      const def = ctx.game.definitionOf(p.topCard) as CardDefinition;
      if (!isDigimon(def)) return false;
      return def.level !== undefined && def.level <= maxLevel;
    })
    .map((p) => p.permanentId);
}

function opponentDigimonAndTamerIds(ctx: EffectContext, source: CardSource, excludeId?: string): string[] {
  const oppSeat = ctx.game.opponentOf(source.ownerSeat);
  return ctx.game
    .player(oppSeat)
    .battleArea.filter((p) => {
      if (p.inBreeding || p.topCard === undefined) return false;
      if (p.permanentId === excludeId) return false;
      const def = ctx.game.definitionOf(p.topCard);
      return isDigimon(def) || isTamer(def);
    })
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] Place 1 opponent Lv.(3 + distinct-Tamer-colors) or lower Digimon under
    // another opponent Digimon or Tamer as its bottom digivolution card.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-place-under`,
          description:
            "[When Digivolving] Place one of your opponent's level 3 or lower Digimon " +
            "(+1 per differently-colored Tamer you have) under another of your opponent's " +
            "Digimon or Tamer as its bottom digivolution card.",
          optional: false,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const maxLevel = 3 + distinctTamerColorCount(ctx, source);
            // Need at least 2 opponent permanents (one to move, one to receive).
            const oppSeat = ctx.game.opponentOf(source.ownerSeat);
            if (ctx.game.player(oppSeat).battleArea.filter((p) => !p.inBreeding).length < 2) return false;
            return opponentDigimonUpToLevel(ctx, source, maxLevel).length > 0;
          },
          resolve: async (ctx) => {
            const maxLevel = 3 + distinctTamerColorCount(ctx, source);
            const moveCandidates = opponentDigimonUpToLevel(ctx, source, maxLevel);
            if (moveCandidates.length === 0) return;

            // Step 1: pick which opponent Digimon to place.
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: moveCandidates,
              min: 1,
              max: 1,
            });
            const movedId = chosen[0];
            if (movedId === undefined) return;

            // Step 2: pick which opponent Digimon/Tamer to receive it (excluding the moved one).
            const receiveCandidates = opponentDigimonAndTamerIds(ctx, source, movedId);
            if (receiveCandidates.length === 0) return;

            const dest = await ctx.ask.chooseTargets(ctx, {
              candidates: receiveCandidates,
              min: 1,
              max: 1,
            });
            const destId = dest[0];
            if (destId === undefined) return;

            // Place the entire permanent under the destination as digivolution cards.
            ctx.fx.relocatePermanent(destId, movedId);
          },
        }),
      ];
    }

    // [End of Your Turn][Once Per Turn] If 4+ digivolution cards under this Digimon,
    // you may attack without suspending it.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-of-turn-attack`,
          description:
            "[End of Your Turn][Once Per Turn] If there are 4 or more digivolution cards " +
            "under this Digimon, you may attack with this Digimon without suspending it.",
          optional: true,
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const perm = ctx.source.permanent();
            return perm !== undefined && perm.stack.length >= 4;
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            if (perm.stack.length < 4) return;
            await ctx.fx.forceAttack(perm.permanentId, { withoutSuspending: true });
          },
        }),
      ];
    }

    // [When Attacking][Inherited][Once Per Turn] If this Digimon has ＜Save＞ in its text, draw 1.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-draw`,
          description: "[When Attacking][Once Per Turn] If this Digimon has ＜Save＞ in its text, draw 1.",
          isInherited: true,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            return hasSaveText(ctx.game.definitionOf(perm.topCard));
          },
          resolve: async (ctx) => {
            await ctx.fx.draw(source.ownerSeat, 1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
