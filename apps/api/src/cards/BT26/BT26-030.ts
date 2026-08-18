import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT26-030 — Pumpkinmon (BT26, Yellow/Purple Lv.5 Digimon).
 *
 * BT26 is a new set with no source documented behavior reference and no knowledge-base entries yet
 * (`node tools/kb/query.mjs card BT26-030` returns no errata/Q&A/rules hits), so this
 * port is provisional: it follows the printed text directly and mirrors the closest
 * existing hand-written cards for each clause shape. Re-check against the KB once
 * BT26 rulings are scraped.
 *
 * Printed text:
 *   [Digivolve] Lv.4 w/[TS] trait: Cost 3
 *   [Security] You may play 1 [Angel] or [TS] trait card with a play cost of 4 or
 *     less from your hand or trash without paying the cost.
 *   [On Play] [When Digivolving] By trashing 1 card in your hand, 1 of your [Iliad]
 *     trait Digimon gains ＜Execute＞ and ＜Ascension＞ for the turn.
 *
 * Clause mapping:
 *   [Digivolve] header — a digivolution-cost requirement, not an effect clause;
 *     already carried by CardDefinition.evoCosts in cards.json, so it needs no entry
 *     here.
 *
 *   EffectTiming.SecuritySkill — "You may play 1 [Angel] or [TS] trait card with a
 *     play cost of 4 or less from your hand or trash without paying the cost."
 *     Modeled on BT26-098's security clause shape (candidates drawn from hand+trash,
 *     `ctx.fx.playInstances(chosen, { payCost: false })`), narrowed to the trait +
 *     play-cost filter this card prints. `security(...)` sets `optional: true` for the
 *     "may" wording, matching the builder's convention.
 *
 *   EffectTiming.OnPlay / EffectTiming.WhenDigivolving (shared, mandatory) — "By
 *     trashing 1 card in your hand, 1 of your [Iliad] trait Digimon gains ＜Execute＞
 *     and ＜Ascension＞ for the turn." Modeled on BT26-022's shared OnPlay/
 *     WhenDigivolving clause shape (two builder entries calling one resolve
 *     function). "By trashing" is an optional cost (BT26-013's `min: 0` convention
 *     lets the controller decline); only a successful trash grants the keywords.
 *     ＜Execute＞ and ＜Ascension＞ are both printed PRINTED_MATCHERS keywords
 *     (combat/keywords.ts), so granting them to another permanent for the turn uses
 *     `ctx.fx.grantKeyword(permanentId, keyword, EffectDuration.UntilEachTurnEnd)`
 *     (the keyword-grant primitive backing continuous.addKeywordGrant) rather than the
 *     automatic printed-text parse, which only applies to the card that prints them.
 */
const cardId = "BT26-030";

function hasIliadTrait(def: CardDefinition): boolean {
  return (def.types ?? []).includes("Iliad");
}

function iliadTargets(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter(
    (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)) && hasIliadTrait(ctx.game.definitionOf(p.topCard)),
  );
}

/** "By trashing 1 card in your hand" — an optional cost gating the keyword grant. */
async function resolveTrashToGrantKeywords(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const handIds = Array.from(owner.hand).map((c) => c.instanceId);
  if (handIds.length === 0) return;

  const toTrash = await ctx.ask.selectCards(ctx, { candidates: handIds, min: 0, max: 1 });
  if (toTrash.length === 0) return;
  await ctx.fx.trash(toTrash);

  const targets = iliadTargets(ctx, source);
  if (targets.length === 0) return;

  let chosenId: string;
  if (targets.length === 1) {
    chosenId = targets[0]!.permanentId;
  } else {
    const chosen = await ctx.ask.chooseTargets(ctx, {
      candidates: targets.map((p) => p.permanentId),
      min: 1,
      max: 1,
    });
    if (chosen.length === 0) return;
    chosenId = chosen[0]!;
  }

  ctx.fx.grantKeyword(chosenId, "Execute", EffectDuration.UntilEachTurnEnd);
  ctx.fx.grantKeyword(chosenId, "Ascension", EffectDuration.UntilEachTurnEnd);
}

function hasAngelOrTsTrait(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Angel" || t === "TS");
}

function securityPlayCandidates(ctx: EffectContext, source: CardSource): CardInstance[] {
  const owner = ctx.game.player(source.ownerSeat);
  return [...Array.from(owner.hand), ...Array.from(owner.trash)].filter((card) => {
    const def = ctx.game.definitionOf(card);
    return hasAngelOrTsTrait(def) && def.playCost >= 0 && def.playCost <= 4;
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Security] You may play 1 [Angel] or [TS] trait card with a play cost of 4 or
    // less from your hand or trash without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-angel-or-ts`,
          description:
            "[Security] You may play 1 [Angel] or [TS] trait card with a play cost of " +
            "4 or less from your hand or trash without paying the cost.",
          resolve: async (ctx) => {
            const candidates = securityPlayCandidates(ctx, source);
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

    // [On Play] By trashing 1 card in your hand, 1 of your [Iliad] trait Digimon
    // gains <Execute> and <Ascension> for the turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-to-grant-keywords`,
          description:
            "[On Play] By trashing 1 card in your hand, 1 of your [Iliad] trait Digimon " +
            "gains <Execute> and <Ascension> for the turn.",
          optional: false,
          resolve: async (ctx) => {
            await resolveTrashToGrantKeywords(ctx, source);
          },
        }),
      ];
    }

    // [When Digivolving] Same clause.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-to-grant-keywords`,
          description:
            "[When Digivolving] By trashing 1 card in your hand, 1 of your [Iliad] " +
            "trait Digimon gains <Execute> and <Ascension> for the turn.",
          optional: false,
          resolve: async (ctx) => {
            await resolveTrashToGrantKeywords(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
