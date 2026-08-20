import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT26-058 — HiAndromon (BT26, Black/Yellow Lv.6 Digimon, Cyborg/CS).
//
// Provisional port: no KB entry (errata/Q&A) exists yet for BT26-058 as of this port
// (`node tools/kb/query.mjs card BT26-058` returned no knowledge-base entries). Implemented
// from the printed card text only.
//
// [Digivolve] Lv.5 w/[CS] trait: Cost 3 — a digivolution-cost requirement, not an effect
//   clause; carried by CardDefinition.evoCosts in cards.json.
// ＜Reboot＞ ＜Blocker＞ — printed keywords, parsed from effectText by the engine; no module
//   clause (BT26-013's convention).
// [When Digivolving] [When Attacking] [Once Per Turn] Your opponent's Digimon effects don't
//   affect 1 of your [CS] trait Digimon until their turn ends.
// [All Turns] When any of your [CS] trait Digimon would leave the battle area, by placing
//   this Digimon's top stacked card as its bottom digivolution card, they don't leave.
//
// Clause 1: the two windows share ONE effectKey so the printed "[Once Per Turn]" is a single
//   budget across both (BT26-016's convention — the engine's per-turn ledger is keyed by
//   instance + effectKey). The protection is `restrict(..., "beAffected", ...)` with
//   `fromSourceKind: ["Digimon"]`, BT26-057's mapping for "their Digimon effects don't affect
//   this Digimon", plus `byOpponentEffectsOnly` because this card names the opponent
//   explicitly ("Your opponent's Digimon effects") while BT26-057's clause is self-targeted.
//   The shared resolution stack propagates the physical source card kinds into every mutation
//   primitive, so hand-written Digimon effects and interpreter actions honor this qualifier
//   identically while Option/Tamer effects remain allowed.
// Clause 2: BT26-033's leave-prevention idiom, one destination different — the payment
//   places this Digimon's TOP CARD as its own BOTTOM digivolution card. Comprehensive-rules
//   terminology and the matching BT22/BT23 rulings make "top stacked card" the current top
//   Digimon card, not the highest card already in its digivolution cards. The dedicated
//   `placeOwnTopAtStackBottom` primitive performs that rotation atomically: the highest
//   digivolution card becomes the new top and HiAndromon moves to stack index 0. No
//   "[Once Per Turn]" is printed; after payment HiAndromon is no longer the top Digimon, so
//   its non-inherited replacement naturally ceases to apply.

const cardId = "BT26-058";
const CS_TRAIT = "CS";

const isDigimon = (def: CardDefinition): boolean => def.kinds?.includes(CardKind.Digimon) === true;
const hasCsTrait = (def: CardDefinition): boolean => (def.types ?? []).includes(CS_TRAIT);

function ownCsDigimon(ctx: EffectContext, source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea)
    .filter((permanent) => {
      if (permanent.inBreeding || permanent.topCard === undefined) return false;
      const def = ctx.game.definitionOf(permanent.topCard);
      return isDigimon(def) && hasCsTrait(def);
    })
    .map((permanent) => permanent.permanentId);
}

/**
 * "Your opponent's Digimon effects don't affect 1 of your [CS] trait Digimon until their turn
 * ends." — shared by the [When Digivolving] and [When Attacking] windows.
 */
async function protectOneCsDigimon(ctx: EffectContext, source: CardSource): Promise<void> {
  const candidates = ownCsDigimon(ctx, source);
  if (candidates.length === 0) return;

  const chosen =
    candidates.length === 1 ? candidates : await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;

  ctx.fx.restrict(chosen[0]!, "beAffected", EffectDuration.UntilOpponentTurnEnd, {
    fromSourceKind: ["Digimon"],
    byOpponentEffectsOnly: true,
  });
}

const PROTECT_CLAUSE =
  "[When Digivolving] [When Attacking] [Once Per Turn] Your opponent's Digimon effects don't " +
  "affect 1 of your [CS] trait Digimon until their turn ends.";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/protect-cs-digimon`,
          description: PROTECT_CLAUSE,
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await protectOneCsDigimon(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/protect-cs-digimon`,
          description: PROTECT_CLAUSE,
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            await protectOneCsDigimon(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/prevent-leave-cs-place-stack-at-bottom`,
          description:
            "[All Turns] When any of your [CS] trait Digimon would leave the battle area, by " +
            "placing this Digimon's top stacked card as its bottom digivolution card, they " +
            "don't leave.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const selfId = self.permanentId;

            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: selfId,
              mode: "prevent",
              description:
                "[All Turns] By placing this Digimon's top stacked card as its bottom " +
                "digivolution card, a [CS] trait Digimon doesn't leave the battle area.",
              protects: (subCtx, leavingPermanentId) => {
                const leaving = subCtx.game.permanentById(leavingPermanentId);
                if (leaving === undefined || leaving.inBreeding || leaving.topCard === undefined) return false;
                if (leaving.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(leaving.topCard);
                return isDigimon(def) && hasCsTrait(def);
              },
              preventCheck: async (subCtx) => {
                const host = subCtx.game.permanentById(selfId);
                if (host === undefined || host.stack.length === 0) return false;

                const wantToPay = await subCtx.ask.optional(
                  subCtx,
                  "Place this Digimon's top stacked card as its bottom digivolution card to keep " +
                    "your [CS] trait Digimon from leaving the battle area?",
                );
                if (!wantToPay) return false;

                return subCtx.fx.placeOwnTopAtStackBottom(selfId);
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
