import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onDeletion, activated } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-056 — Cerberusmon: Werewolf Mode // Inferno Divide (BT26 Black/Purple DUAL
// Digimon/Option).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-056 as of this port
// (`node tools/kb/query.mjs card BT26-056` returned no knowledge-base entries — BT26 has
// no Q&A yet). implemented from the printed card text only; revisit once rulings land.
//
// [Digivolve] [Cerberusmon]: Cost 1
// [Digivolve] Lv.4 w/[TS] trait: Cost 3
//   Both digivolve headers are digivolution-cost requirements, not effect clauses, and are
//   already carried centrally by CardDefinition.evoCosts / ALTERNATE_DIGIVOLUTION_OVERRIDES
//   per the card implementation notes — not implemented here.
// ＜Jamming＞ ＜Reboot＞ ＜Blocker＞ — printed keywords, parsed automatically from
//   effectText by the engine's combat/keywords.ts (PRINTED_MATCHERS), same as BT26-013's
//   ＜Blocker＞; no explicit grant needed.
// [On Deletion] You may play 1 level 4 or lower Digimon card with the [Titan] trait from
//   your trash without paying the cost.
// [Rule] Trait: Has [Dark Animal] Type. — a rules-text trait annotation, not an effect;
//   already carried by CardDefinition.types (["Wizard","Titan","TS"] plus the rule-granted
//   [Dark Animal] type is a data fact, not something this module resolves).
//
// Option side [Inferno Divide]:
// ＜Use Req. ([TS] trait)＞ — data-only: the color-gate waiver for a DUAL card's Option
//   side is the hand-authored `optionColorRequirements` field on the card record
//   (["Black"] in cards.json), not an executable action (see BT26-031/BT26-050/BT26-033
//   precedent and commit 1298f75fa).
// [Main] Trash 1 card in your hand. Then, ＜De-Digivolve 3＞ 1 of your opponent's Digimon.
//   "Trash 1 card in your hand" is printed as a mandatory cost (no "may"), so it is paid
//   unconditionally before the de-digivolve; if the controller has no hand card the cost
//   cannot be paid and the effect does not resolve. De-Digivolve 3 uses the engine's
//   `ctx.fx.deDigivolve` primitive directly (card-module contract: reuse the primitive,
//   don't reimplement the digivolution-stack walk in the card file).

const cardId = "BT26-056";
const TITAN_TRAIT = "Titan";

function hasTrait(def: CardDefinition, trait: string): boolean {
  return (def.types ?? []).includes(trait);
}

/** Trash cards eligible for the [On Deletion] free-play clause: Digimon, level <= 4, [Titan] trait. */
function trashTitanCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && (def.level ?? 99) <= 4 && hasTrait(def, TITAN_TRAIT);
  });
}

/** Opponent's battle-area Digimon permanents (not in breeding), for the Option's de-digivolve target. */
function opponentDigimonTargets(ctx: EffectContext, source: CardSource): string[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  return Array.from(opponent.battleArea)
    .filter((p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-play-titan-from-trash`,
          description:
            "[On Deletion] You may play 1 level 4 or lower Digimon card with the [Titan] " +
            "trait from your trash without paying the cost.",
          optional: true,
          canActivate: (ctx) => trashTitanCandidates(ctx, source).length > 0,
          resolve: async (ctx) => {
            const candidates = trashTitanCandidates(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Trash 1 card in your hand. Then, ＜De-Digivolve 3＞ 1 of your " +
            "opponent's Digimon.",
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).hand.length > 0,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const handIds = Array.from(owner.hand).map((c) => c.instanceId);
            if (handIds.length === 0) return;

            const toTrash = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 1, max: 1 });
            if (toTrash.length === 0) return;
            await ctx.fx.trash(toTrash);

            const targets = opponentDigimonTargets(ctx, source);
            if (targets.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
            if (chosen.length === 0) return;

            ctx.fx.deDigivolve(chosen[0]!, 3, { byEffectSeat: source.ownerSeat });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
