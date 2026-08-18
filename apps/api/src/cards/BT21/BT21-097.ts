// @ts-nocheck
import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";

/**
 * BT21-097 — App Link (BT21, Green Option).
 *
 * Printed text (no errata):
 *   While you have a Digimon or Tamer with the [Appmon] trait on the field, you can
 *   ignore this card's color requirements.
 *   [Main] Reveal the top 3 cards of your deck. Add 1 card with the [Appmon]/[App
 *   Driver] trait among them to the hand. Trash the rest. Then, place this card in the
 *   battle area.
 *   [End of Your Turn] ＜Delay＞.
 *   ・You may link 1 card from your hand with 1 of your Digimon without paying the cost.
 *   [Security] Place this card in the battle area.
 */
const cardId = "BT21-097";

function hasAppmonOrAppDriverTrait(def: {
  types?: string[];
  forms?: string[];
  attributes?: string[];
}): boolean {
  return matchNameOrTrait(def, { tokens: ["Appmon", "App Driver"], match: "trait" });
}

/**
 * [Main] Reveal top 3, add 1 [Appmon]/[App Driver]-trait card among them to hand
 * (forced, per the general "add as many as possible" reveal-effect rule — see e.g.
 * Q&A Q1947/Q2462/Q2992 for sibling reveal-and-add cards), trash the rest, then place
 * this card in the battle area. Shared by [Main] only — the printed [Security] text
 * is "Place this card in the battle area." (no reveal), unlike BT21-094's Security.
 */
async function resolveMain(ctx: any, source: CardSource): Promise<void> {
  const revealed = await ctx.fx.reveal(source.ownerSeat, 3);

  const candidates = revealed.filter((c: any) =>
    hasAppmonOrAppDriverTrait(ctx.game.definitionOf(c)),
  );

  let selected: string[] = [];
  if (candidates.length > 0) {
    selected = await ctx.ask.selectCards(ctx, {
      candidates: candidates.map((c: any) => c.instanceId),
      min: 1,
      max: 1,
    });
  }

  if (selected.length > 0) {
    await ctx.fx.returnToHand(selected);
  }

  const rest = revealed
    .filter((c: any) => !selected.includes(c.instanceId))
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
            "[Main] Reveal the top 3 cards of your deck. Add 1 card with the [Appmon]/[App " +
            "Driver] trait among them to the hand. Trash the rest. Then, place this card in " +
            "the battle area.",
          optional: false,
          canActivate: (ctx: any) => ctx.game.player(source.ownerSeat).deck.length >= 1,
          resolve: async (ctx: any) => resolveMain(ctx, source),
        }),
      ];
    }
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-link`,
          description: "[End of Your Turn] You may link 1 card from hand to your Digimon.",
          optional: true,
          when: (ctx) => source.isOwnersTurn(),
          resolve: async (ctx: any) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (!owner.hand.length) return;
            const digimon = owner.battleArea.filter(
              (p: any) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
            if (!digimon.length) return;
            const hand = owner.hand.map((c: any) => c.instanceId);
            const s = await ctx.ask.selectCards(ctx, { candidates: hand, min: 0, max: 1 });
            if (!s.length) return;
            const d = await ctx.ask.selectPermanents(ctx, {
              candidates: digimon.map((p: any) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (d.length) await ctx.fx.link(d[0], s);
          },
        }),
      ];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/sec`,
          description: "[Security] Place this card in the battle area.",
          optional: false,
          resolve: async (ctx: any) => {
            await ctx.fx.placeOptionAsPermanent?.(source.instanceId);
          },
        }),
      ];
    }
    return [];
  },
};
registerCard(module);
export default module;
