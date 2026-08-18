import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-081";

function hasSaveText(def: CardDefinition): boolean {
  const hay = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`;
  return hay.includes("＜Save＞") || hay.toLowerCase().includes("<save");
}

function isQuartzmon(def: CardDefinition): boolean {
  return def.nameEn.includes("Quartzmon");
}

/** Lv.4-or-lower Digimon with Save text that are under any of your Tamers. */
function saveLv4UnderTamers(ctx: EffectContext, source: CardSource): string[] {
  const candidates: string[] = [];
  ctx.game.player(source.ownerSeat).battleArea.forEach((p) => {
    if (p.inBreeding || p.topCard === undefined) return;
    if (!isTamer(ctx.game.definitionOf(p.topCard))) return;
    for (const card of p.stack) {
      const def = ctx.game.definitionOf(card) as CardDefinition;
      if (isDigimon(def) && (def.level === undefined || def.level <= 4) && hasSaveText(def)) {
        candidates.push(card.instanceId);
      }
    }
  });
  return candidates;
}

/** Quartzmon instances in hand or under any of your Tamers. */
function quartzmonInstances(ctx: EffectContext, source: CardSource): string[] {
  const candidates: string[] = [];
  const owner = ctx.game.player(source.ownerSeat);
  // From hand
  for (const c of owner.hand) {
    if (isQuartzmon(ctx.game.definitionOf(c))) candidates.push(c.instanceId);
  }
  // Under Tamers
  for (const p of owner.battleArea) {
    if (p.inBreeding || p.topCard === undefined) continue;
    if (!isTamer(ctx.game.definitionOf(p.topCard))) continue;
    for (const c of p.stack) {
      if (isQuartzmon(ctx.game.definitionOf(c))) candidates.push(c.instanceId);
    }
  }
  return candidates;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving]
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] You may play 1 level 4 or lower Digimon card with ＜Save＞ " +
            "from under one of your Tamers without paying its cost. If there are 4 or more " +
            "digivolution cards under this Digimon, it can be digivolved into a [Quartzmon] " +
            "in your hand or under one of your Tamers with the digivolution cost reduced by 3 instead.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const perm = ctx.source.permanent();
            const has4Plus = perm !== undefined && perm.stack.length >= 4;
            if (has4Plus && quartzmonInstances(ctx, source).length > 0) return true;
            return saveLv4UnderTamers(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;

            const canEvo = perm.stack.length >= 4;
            const quartzmons = canEvo ? quartzmonInstances(ctx, source) : [];
            const saveCandidates = saveLv4UnderTamers(ctx, source);

            let useQuartzPath = false;
            if (canEvo && quartzmons.length > 0 && saveCandidates.length > 0) {
              // Player chooses: play from under Tamers OR digivolve to Quartzmon.
              useQuartzPath = !(await ctx.ask.optional(
                ctx,
                "Play 1 level 4 or lower Digimon with ＜Save＞ from under a Tamer? (decline to digivolve into [Quartzmon] with cost -3 instead)",
              ));
            } else if (canEvo && quartzmons.length > 0 && saveCandidates.length === 0) {
              // Only Quartzmon path available.
              useQuartzPath = true;
            }
            // else: only play-from-tamer path available (useQuartzPath stays false).

            if (useQuartzPath) {
              // Digivolve into Quartzmon with cost -3.
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: quartzmons,
                min: 1,
                max: 1,
              });
              const pickedId = chosen[0];
              if (pickedId !== undefined) {
                await ctx.fx.digivolveFromInstance(perm.permanentId, pickedId, {
                  payCost: true,
                  costDelta: -3,
                });
              }
            } else {
              // Play 1 Lv.4-or-lower Save Digimon from under a Tamer without cost.
              if (saveCandidates.length === 0) return;
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: saveCandidates,
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.playInstances(chosen, { payCost: false });
              }
            }
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
          description:
            "[When Attacking][Once Per Turn] If this Digimon has ＜Save＞ in its text, draw 1.",
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
