// @ts-nocheck
import { EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT21-094 — Armor Digivolution (BT21, Blue Option).
 *
 * Printed text (no errata):
 *   [Main] Reveal the top 3 cards of your deck. Add 1 card with [Davis Motomiya] in its
 *   name and 1 card with the [Free] trait among them to the hand. Trash the rest. Then,
 *   place this card in the battle area.
 *   [All Turns] When the top stacked card of any your [Armor Form] trait Digimon is
 *   trashed, ＜Delay＞.
 *   ・1 of your Digimon may digivolve into a Digimon card with the [Armor Form] in the
 *   hand without paying the cost.
 *   [Security] Activate this card's [Main] effect.
 */
const cardId = "BT21-094";

function isDavisMotomiya(def: { nameEn: string }): boolean {
  return matchNameOrTrait(def, { tokens: ["Davis Motomiya"], match: "name" });
}

function hasFreeTrait(def: { types?: string[]; forms?: string[]; attributes?: string[] }): boolean {
  return matchNameOrTrait(def, { tokens: ["Free"], match: "trait" });
}

/**
 * [Main] Reveal top 3, add 1 [Davis Motomiya]-named card and 1 [Free]-trait card
 * among them to hand (forced, per the general "add as many as possible" reveal-effect
 * rule — see e.g. Q&A Q1947/Q2462/Q2992 for sibling reveal-and-add cards), trash the
 * rest, then place this card in the battle area. Shared by [Main] and [Security],
 * since the printed [Security] text is "Activate this card's [Main] effect."
 */
async function resolveMain(ctx: any, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);

  const davisCandidates = revealed.filter((c: any) => isDavisMotomiya(ctx.game.definitionOf(c)));
  const freeCandidates = revealed.filter((c: any) => hasFreeTrait(ctx.game.definitionOf(c)));

  let selected: string[] = [];

  if (davisCandidates.length > 0) {
    const pick = await ctx.ask.selectCards(ctx, {
      candidates: davisCandidates.map((c: any) => c.instanceId),
      min: 1,
      max: 1,
    });
    selected = selected.concat(pick);
  }

  if (freeCandidates.length > 0) {
    const pick = await ctx.ask.selectCards(ctx, {
      candidates: freeCandidates.map((c: any) => c.instanceId),
      min: 1,
      max: 1,
    });
    selected = selected.concat(pick);
  }

  const selectedSet = new Set(selected);
  if (selectedSet.size > 0) {
    await ctx.fx.returnToHand(Array.from(selectedSet));
  }

  const rest = revealed
    .filter((c: any) => !selectedSet.has(c.instanceId))
    .map((c: any) => c.instanceId);
  if (rest.length > 0) {
    await ctx.fx.trash(rest);
  }

  await ctx.fx.placeOptionAsPermanent?.(source.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Reveal the top 3 cards of your deck. Add 1 card with [Davis Motomiya] in " +
            "its name and 1 card with the [Free] trait among them to the hand. Trash the rest. " +
            "Then, place this card in the battle area.",
          optional: false,
          canActivate: (ctx: any) => ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx: any) => resolveMain(ctx, source),
        }),
      ];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/sec`,
          description: "[Security] Activate this card's [Main] effect.",
          optional: false,
          resolve: async (ctx: any) => resolveMain(ctx, source),
        }),
      ];
    }
    return [];
  },
};
registerCard(module);
export default module;
