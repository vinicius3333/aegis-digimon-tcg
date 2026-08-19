import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-024 — Tinkermon (BT26, Yellow Lv.3 Digimon, Fairy/WG).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-024 as of this port
// (`node tools/kb/query.mjs card BT26-024` returned no knowledge-base entries). Implemented
// from the printed card text only.
//
// [Digivolve] Lv.2 w/[WG] trait: Cost 0 — a digivolution-cost requirement, not an effect
//   clause; carried by CardDefinition.evoCosts in cards.json.
// [Your Turn] When any of your other Digimon with the [Vegetation], [Fairy] or [WG] trait
//   are played, this Digimon may digivolve into a Digimon card with the [Vegetation],
//   [Fairy] or [WG] trait in the hand without paying the cost.
//
// Modeled on BT26-001/BT26-044's reactive alternate-digivolve idiom: a `staticModifier`
// that installs a `subscribeSubTrigger` watcher, here on the `whenPlayed` event whose
// `trigger.subjectPermanentId` names the permanent that just entered (EX12-071 reads the
// same payload). "Any of your OTHER Digimon" excludes this card's own permanent, so a
// Tinkermon played while another Tinkermon watches still triggers the watcher of the
// other one only. The digivolution is free — `digivolveFromInstance` defaults to no cost —
// and `ignoreRequirements` is set because the printed clause names only a trait filter,
// not the target card's own printed digivolution requirements.

const cardId = "BT26-024";

const TRAITS = ["Vegetation", "Fairy", "WG"] as const;

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;

function hasWatchedTrait(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return TRAITS.some((trait) => types.includes(trait));
}

function traitDigimonHandCandidates(ctx: EffectContext, ownerSeat: Seat): string[] {
  return Array.from(ctx.game.player(ownerSeat).hand)
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isDigimon(def) && hasWatchedTrait(def);
    })
    .map((card) => card.instanceId);
}

/**
 * "This Digimon may digivolve into a Digimon card with the [Vegetation], [Fairy] or [WG]
 * trait in the hand without paying the cost."
 */
async function resolveMayDigivolveIntoTraitDigimon(
  ctx: EffectContext,
  selfPermanentId: string,
  ownerSeat: Seat,
): Promise<void> {
  const self = ctx.game.permanentById(selfPermanentId);
  if (self === undefined || self.inBreeding) return;

  const candidates = traitDigimonHandCandidates(ctx, ownerSeat);
  if (candidates.length === 0) return;

  const wantToActivate = await ctx.ask.optional(
    ctx,
    "Digivolve this Digimon into a [Vegetation], [Fairy] or [WG] trait Digimon card in the hand " +
      "without paying the cost?",
  );
  if (!wantToActivate) return;

  const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;

  await ctx.fx.digivolveFromInstance(selfPermanentId, chosen[0]!, { ignoreRequirements: true });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/reactive-alt-digivolve-on-ally-played`,
          description:
            "[Your Turn] When any of your other Digimon with the [Vegetation], [Fairy] or [WG] " +
            "trait are played, this Digimon may digivolve into a Digimon card with the " +
            "[Vegetation], [Fairy] or [WG] trait in the hand without paying the cost.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfPermanentId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: selfPermanentId,
              once: false,
              description: `${cardId}: one of your other [Vegetation]/[Fairy]/[WG] Digimon is played -> may alt-digivolve.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined || subjectId === selfPermanentId) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasWatchedTrait(def);
              },
              run: async (subCtx) => {
                await resolveMayDigivolveIntoTraitDigimon(subCtx, selfPermanentId, ownerSeat);
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
