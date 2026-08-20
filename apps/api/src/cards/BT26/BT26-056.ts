import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, colorWaiverStatic, onDeletion, staticModifier } from "../../engine/effects/builders.js";
import { cardHasTrait, permanentHasTrait } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-056 — Cerberusmon: Werewolf Mode // Inferno Divide (BT26 Black/Purple DUAL
// Digimon/Option).
//
// Verified against the committed catalog and Q7059: Inferno Divide can still de-digivolve
// when its controller has no hand card to trash.
//
// [Digivolve] [Cerberusmon]: Cost 1
// [Digivolve] Lv.4 w/[TS] trait: Cost 3
//   Both digivolve headers are digivolution-cost requirements, not effect clauses, and are
//   already carried centrally by CardDefinition.evoCosts / ALTERNATE_DIGIVOLUTION_OVERRIDES
//   per the card implementation notes — not implemented here.
// ＜Jamming＞ ＜Reboot＞ ＜Blocker＞ — explicitly granted to the continuous keyword ledger;
//   direct modules replace the compiled static entries that would otherwise carry them.
// [On Deletion] You may play 1 level 4 or lower Digimon card with the [Titan] trait from
//   your trash without paying the cost.
// [Rule] Trait: Has [Dark Animal] Type. — granted continuously because the catalog's printed
//   `types` array contains Wizard/Titan/TS but not this rules-text type.
//
// Option side [Inferno Divide]:
// ＜Use Req. ([TS] trait)＞ — a hand-resident color-requirement waiver. The printed Black
//   Option requirement remains authoritative unless the controller has a [TS] card in play.
// [Main] Trash 1 card in your hand. Then, ＜De-Digivolve 3＞ 1 of your opponent's Digimon.
//   "Trash 1 card in your hand" is mandatory when a hand card exists, but it is not a
//   `By` cost. Q7059 confirms an empty hand skips that instruction and still resolves the
//   following De-Digivolve 3 through the shared primitive.

const cardId = "BT26-056";
const TITAN_TRAIT = "Titan";

/** Trash cards eligible for the [On Deletion] free-play clause: Digimon, level <= 4, [Titan] trait. */
function trashTitanCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.trash).filter((c) => {
    const def = ctx.game.definitionOf(c);
    return isDigimon(def) && (def.level ?? 99) <= 4 && cardHasTrait(def, TITAN_TRAIT);
  });
}

function ownerHasTsCardInPlay(ctx: EffectContext, source: CardSource): boolean {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea).some(
    (permanent) => !permanent.inBreeding && permanentHasTrait(ctx.game, permanent, "TS"),
  );
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
    if (timing === EffectTiming.None) {
      return [
        colorWaiverStatic({
          source,
          effectKey: `${cardId}/use-req-ts`,
          description: "＜Use Req. ([TS] trait)＞ Ignore this card's color requirements.",
          when: (ctx) => ownerHasTsCardInPlay(ctx, source),
          resolve: async (ctx) => {
            ctx.fx.waiveColorRequirement(source.instanceId, EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/keywords-and-rule-trait`,
          description: "＜Jamming＞ ＜Reboot＞ ＜Blocker＞ [Rule] Trait: Has [Dark Animal] Type.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.Permanent);
            ctx.fx.grantKeyword(self.permanentId, "Reboot", EffectDuration.Permanent);
            ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.Permanent);
            ctx.fx.grantNameTrait(self.permanentId, "trait", ["Dark Animal"], EffectDuration.Permanent);
          },
        }),
      ];
    }

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
              min: 1,
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
          description: "[Main] Trash 1 card in your hand. Then, ＜De-Digivolve 3＞ 1 of your " + "opponent's Digimon.",
          canActivate: (ctx) => opponentDigimonTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const handIds = Array.from(owner.hand).map((c) => c.instanceId);
            if (handIds.length > 0) {
              const toTrash = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 1, max: 1 });
              if (toTrash.length === 0) return;
              await ctx.fx.trash(toTrash, { byEffectSeat: source.ownerSeat });
            }

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
