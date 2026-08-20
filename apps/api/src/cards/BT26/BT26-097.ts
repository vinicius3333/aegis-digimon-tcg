import { CardKind, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security, staticModifier } from "../../engine/effects/builders.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-097 — The Thunder Emperor Awakens (BT26, Yellow Option, TS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-097 as of this port
// (`node tools/kb/query.mjs card BT26-097` against the refreshed knowledge base returned no
// entries). Implemented from the printed card text only.
//
// Add 1 to this card's use cost for each of your security cards.
// [Main] By placing 1 of your Tamers with [Dan Yuki] or [Kanan Yuki] in their names as any of
//   your [Aegiomon]'s bottom digivolution card, it may digivolve into [Jupitermon] in the hand
//   or trash, ignoring digivolution requirements and without paying the cost. After, you may
//   place 1 card with [Aegiochusmon] in its name in your trash as any of your [Jupitermon]'s
//   top digivolution card.
//
// The use-cost surcharge is BT26-033's clause verbatim: a live `changePlayCost` keyed to THIS
//   cardId and controller, re-derived every continuous recompute, so it tracks the security
//   count instead of freezing it.
// The [Main] body is a three-step chain, each step gated on the previous one actually happening
//   (the printed "By ..." cost, then the digivolution, then the "After, you may ..." tail):
//   1. Cost — a whole Tamer PERMANENT moves under the Aegiomon, so this is
//      `relocatePermanentByEffect(aegiomon, tamer, { belowTop: false })`, not `placeUnder`:
//      `placeUnder` only relocates LOOSE instances (`removeLooseInstance` never reaches a
//      permanent's top card). `belowTop: false` unshifts at index 0 — the BOTTOM of a
//      bottom-to-top ordered stack — which is what "as ... bottom digivolution card" means.
//      The primitive is optional on Primitives, so its absence aborts the clause rather than
//      silently skipping the cost.
//   2. "it may digivolve into [Jupitermon] ..." — "it" is the Aegiomon that received the card;
//      `digivolveFromInstance(..., { ignoreRequirements: true })` covers both "ignoring
//      digivolution requirements" and the free cost (the verb's default).
//   3. "any of your [Jupitermon]'s TOP digivolution card" — `placeUnder(..., { belowTop: true })`
//      pushes at the end of the stack, i.e. immediately under the permanent's top card. The
//      target is any Jupitermon the controller has, not necessarily the one just created.

const cardId = "BT26-097";

const TAMER_NAMES = ["Dan Yuki", "Kanan Yuki"];
const AEGIOMON_NAME = "Aegiomon";
const JUPITERMON_NAME = "Jupitermon";
const AEGIOCHUSMON_NAME = "Aegiochusmon";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;
const isTamer = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Tamer) === true;
const hasName = (def: CardDefinition, tokens: string[]): boolean => matchNameOrTrait(def, { tokens, match: "name" });

function ownPermanents(ctx: EffectContext, ownerSeat: Seat, matches: (def: CardDefinition) => boolean): string[] {
  return Array.from(ctx.game.player(ownerSeat).battleArea)
    .filter((permanent) => {
      if (permanent.inBreeding || permanent.topCard === undefined) return false;
      return matches(ctx.game.definitionOf(permanent.topCard));
    })
    .map((permanent) => permanent.permanentId);
}

const yukiTamers = (ctx: EffectContext, seat: Seat): string[] =>
  ownPermanents(ctx, seat, (def) => isTamer(def) && hasName(def, TAMER_NAMES));

const aegiomonDigimon = (ctx: EffectContext, seat: Seat): string[] =>
  ownPermanents(ctx, seat, (def) => isDigimon(def) && hasName(def, [AEGIOMON_NAME]));

const jupitermonDigimon = (ctx: EffectContext, seat: Seat): string[] =>
  ownPermanents(ctx, seat, (def) => isDigimon(def) && hasName(def, [JUPITERMON_NAME]));

function jupitermonCards(ctx: EffectContext, seat: Seat): string[] {
  const owner = ctx.game.player(seat);
  return [...owner.hand, ...owner.trash]
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      return isDigimon(def) && hasName(def, [JUPITERMON_NAME]);
    })
    .map((card) => card.instanceId);
}

function aegiochusmonCardsInTrash(ctx: EffectContext, seat: Seat): string[] {
  return Array.from(ctx.game.player(seat).trash)
    .filter((card) => hasName(ctx.game.definitionOf(card), [AEGIOCHUSMON_NAME]))
    .map((card) => card.instanceId);
}

/** Prompt for one of `candidates`, skipping the prompt when only one qualifies. */
async function pickPermanent(ctx: EffectContext, candidates: string[]): Promise<string | undefined> {
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  return chosen[0];
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/use-cost-plus-security-count`,
          description: "Add 1 to this card's use cost for each of your security cards.",
          resolve: async (ctx) => {
            const securityCount = ctx.game.player(source.ownerSeat).security.length;
            if (securityCount === 0) return;
            ctx.fx.changePlayCost(
              (facts) => facts.def.cardId === cardId && facts.controllerSeat === source.ownerSeat,
              securityCount,
            );
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-tamer-digivolve-jupitermon`,
          description:
            "[Main] By placing 1 of your Tamers with [Dan Yuki] or [Kanan Yuki] in their names " +
            "as any of your [Aegiomon]'s bottom digivolution card, it may digivolve into " +
            "[Jupitermon] in the hand or trash, ignoring digivolution requirements and without " +
            "paying the cost. After, you may place 1 card with [Aegiochusmon] in its name in " +
            "your trash as any of your [Jupitermon]'s top digivolution card.",
          resolve: async (ctx) => {
            const seat = source.ownerSeat;
            if (ctx.fx.relocatePermanentByEffect === undefined) return;

            const tamerId = await pickPermanent(ctx, yukiTamers(ctx, seat));
            if (tamerId === undefined) return;

            const aegiomonId = await pickPermanent(ctx, aegiomonDigimon(ctx, seat));
            if (aegiomonId === undefined) return;

            const placed = await ctx.fx.relocatePermanentByEffect(aegiomonId, tamerId, { belowTop: false });
            if (!placed) return;

            const jupitermonOptions = jupitermonCards(ctx, seat);
            if (jupitermonOptions.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates: jupitermonOptions, min: 0, max: 1 });
              if (chosen.length > 0) {
                await ctx.fx.digivolveFromInstance(aegiomonId, chosen[0]!, { ignoreRequirements: true });
              }
            }

            const aegiochusmonOptions = aegiochusmonCardsInTrash(ctx, seat);
            if (aegiochusmonOptions.length === 0) return;

            const hostId = await pickPermanent(ctx, jupitermonDigimon(ctx, seat));
            if (hostId === undefined) return;

            const toPlace = await ctx.ask.selectCards(ctx, { candidates: aegiochusmonOptions, min: 0, max: 1 });
            if (toPlace.length === 0) return;

            await ctx.fx.placeUnder(hostId, toPlace, { belowTop: true });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-ts-and-return-self`,
          description:
            "[Security] You may play 1 play cost 5 or lower [TS] trait card from your hand " +
            "without paying the cost. Then, add this card to the hand.",
          optional: false,
          resolve: async (ctx) => {
            const candidates = Array.from(ctx.game.player(source.ownerSeat).hand)
              .filter((card) => {
                const def = ctx.game.definitionOf(card);
                const playable = def.kinds.includes(CardKind.Digimon) || def.kinds.includes(CardKind.Tamer);
                return playable && (def.types ?? []).includes("TS") && def.playCost !== undefined && def.playCost <= 5;
              })
              .map((card) => card.instanceId);

            if (candidates.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, { candidates, min: 0, max: 1 });
              if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
            }

            await ctx.fx.returnToHand([source.instanceId]);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
