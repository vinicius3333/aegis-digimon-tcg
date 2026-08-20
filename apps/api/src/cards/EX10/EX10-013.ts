import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { staticModifier, turnTiming, whenDigivolving } from "../../engine/effects/builders.js";
import { canDigivolveOnto } from "../../engine/cards/cardData.js";
import { registerCard } from "../../engine/effects/registry.js";

// Lucemon — EX10-013 (Yellow Lv.3 Digimon).
//
// Hand-written override of the declarative effect record. The AUTO-GENERATED stub left this card
// non-executable ("coverage": "none"): it dropped ＜Blocker＞ (the IR records the
// keyword on a Static effect, but the interpreter only runs `effect.actions`, never
// `effect.keywords`, so a keyword-only Static is a silent no-op), and emitted both the
// [When Digivolving] "may move" and the [End of Your Turn] "return 5 / digivolve"
// clauses as RawUnparsed (loud gaps). Removing the AUTO-GENERATED header preserves this
// file across regeneration (card-module contract + the file-header convention).
//
// Printed `effectText` (cards.json) is authoritative here (KB reports NO errata):
//   "[Digivolve] [Cupimon]: Cost 5"
//   "＜Blocker＞"
//   "[Breeding] [When Digivolving] This Digimon may move."
//   "[End of Your Turn] By returning 5 cards with [Lucemon] in their texts from your
//    trash to the bottom of the deck, this Digimon may digivolve into
//    [Lucemon: Chaos Mode] in the trash without paying the cost."
//   ESS (inheritedEffectText): "＜Blocker＞"
//
// KB (authoritative — `node tools/kb/query.mjs card EX10-013`): no errata. Bound Q&A:
//   - Q5038: "[Lucemon] in its text" matches a card with [Lucemon] in its NAME, traits,
//     effects, inherited effects, (Rule), digivolution / DNA / DigiXros / burst / link
//     requirements, etc. The trash predicate below therefore scans name + traits +
//     printed/inherited/security effect text (the text the extracted CardDefinition
//     carries), not just the main effect text.
//   - Q5039: the "by returning 5 cards" condition is ALL-OR-NOTHING — returning only 4
//     does not satisfy the "by" condition. The cost selection is exactly 5 (min = max).
//   - Q5040: after paying the cost you MAY decline the digivolve (the digivolve is an
//     independent "may"). Modeled as a separate opt-in once the cost is paid.
//   - Q5041: you CANNOT ignore the digivolution requirements — the [Lucemon: Chaos Mode]
//     in the trash must be a legal digivolution target for THIS Digimon. Enforced with
//     `canDigivolveOnto` (printed EvoCost color+level match), mirroring the source
//     `CanPlayCardTargetFrame` guard (so e.g. a BT7-111 Chaos Mode with no printed
//     evolution requirement is NOT a legal target).
//   - Q5734: the "by" condition is still met when a returned Digi-Egg card is placed on
//     the Digi-Egg deck by the Digi-Egg/token rules instead of the main deck. Not modeled
//     specially: `returnToDeck` returns the chosen instances regardless, and the cost is
//     deemed satisfied once the 5 are chosen and moved (no Digi-Egg [Lucemon] cards exist
//     in the current data, so this edge is presently vacuous).
const cardId = "EX10-013";

const CHAOS_MODE_NAME = "Lucemon: Chaos Mode";

/**
 * "[Lucemon] in its text" per Q5038: the card's name, a trait, or any of its printed /
 * inherited / security effect text contains "Lucemon". (CardDefinition does not expose
 * the rarer sources the ruling lists — digivolution / DNA / DigiXros / burst / link
 * requirement text — so those are out of reach of the extracted data; the available text
 * surfaces are matched.)
 */
const hasLucemonInText = (def: CardDefinition): boolean => {
  const token = "lucemon";
  const haystacks = [
    def.nameEn,
    ...(def.types ?? []),
    def.effectText,
    def.inheritedEffectText,
    def.securityEffectText,
  ];
  return haystacks.some((text) => text !== undefined && text.toLowerCase().includes(token));
};

/** This seat's trash cards with [Lucemon] in their texts (the cost pool). */
const lucemonTextTrash = (ctx: EffectContext, source: CardSource): CardInstance[] =>
  Array.from(ctx.game.player(source.ownerSeat).trash).filter((card) =>
    hasLucemonInText(ctx.game.definitionOf(card)),
  );

/**
 * This seat's trash [Lucemon: Chaos Mode] cards that THIS Digimon may legally digivolve
 * into (Q5041: digivolution requirements still apply). `canDigivolveOnto` matches the
 * Chaos Mode's printed EvoCost (color + level) against the source permanent's current top
 * card — the source `CanPlayCardTargetFrame` check.
 */
const chaosModeTargets = (ctx: EffectContext, source: CardSource): CardInstance[] => {
  const self = source.permanent();
  if (self?.topCard === undefined) return [];
  const baseDef = ctx.game.definitionOf(self.topCard);
  return Array.from(ctx.game.player(source.ownerSeat).trash).filter((card) => {
    const def = ctx.game.definitionOf(card);
    return def.nameEn === CHAOS_MODE_NAME && canDigivolveOnto(def, baseDef);
  });
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // ＜Blocker＞ — own + inherited (ESS). Both are continuous keyword grants recorded
    // in the continuous-effect ledger (read by the attack/block subsystem). The engine's
    // continuous-recompute pass re-fires every EffectTiming.None effect of every
    // candidate instance (top card AND digivolution-stack cards), and `source.permanent()`
    // resolves to the carrying permanent in both cases — so the inherited clause grants
    // ＜Blocker＞ to whatever Digimon this card sits under, exactly like the source ESS.
    if (timing === EffectTiming.None) {
      const blocker = (key: string, description: string, isInherited: boolean): Effect =>
        staticModifier({
          source,
          effectKey: `${cardId}/${key}`,
          description,
          isInherited,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Blocker", EffectDuration.UntilEachTurnEnd);
            }
          },
        });
      return [
        blocker("blocker", "＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to redirect the attack to it.)", false),
        blocker(
          "blocker-ess",
          "[ESS] ＜Blocker＞ (When an opponent's Digimon attacks, you may suspend this Digimon to redirect the attack to it.)",
          true,
        ),
      ];
    }

    // [Breeding] [When Digivolving] This Digimon may move to the battle area. This is an
    // effect-driven move, so it uses the same identity-preserving primitive as P-130/P-143;
    // it is not the player-declared breeding-phase action.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-may-move`,
          description: "[Breeding] [When Digivolving] This Digimon may move (to the battle area).",
          optional: true,
          // Only relevant while this Digimon is in the breeding area (source
          // IsExistOnBreedingAreaDigimon). A battle-area digivolve makes the clause inert.
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return self !== undefined && self.inBreeding;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) await ctx.fx.movePermanentZone(self.permanentId, "toBattle");
          },
        }),
      ];
    }

    // [End of Your Turn] By returning 5 cards with [Lucemon] in their texts from your
    // trash to the bottom of the deck, this Digimon may digivolve into
    // [Lucemon: Chaos Mode] in the trash without paying the cost.
    //   [Lucemon]-text cards (canNoSelect), and only if exactly 5 were chosen returns them
    //   to the deck bottom and then digivolves into a Chaos Mode in the trash for free.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-return-5-digivolve`,
          description:
            "[End of Your Turn] By returning 5 cards with [Lucemon] in their texts from " +
            "your trash to the bottom of the deck, this Digimon may digivolve into " +
            "[Lucemon: Chaos Mode] in the trash without paying the cost.",
          optional: true,
          // On the field, the controller's turn, at least 5 [Lucemon]-text cards to return
          // (Q5039: the cost cannot be met with fewer), and a legally-digivolvable Chaos
          // Mode in the trash (Q5041). When no such Chaos Mode exists the effect can't do
          // anything, so it is not offered.
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() &&
            ctx.source.isOwnersTurn() &&
            lucemonTextTrash(ctx, source).length >= 5 &&
            chaosModeTargets(ctx, source).length > 0,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;

            // Pay the cost: return EXACTLY 5 [Lucemon]-text cards from trash to the deck
            // bottom (Q5039 all-or-nothing). Re-read the pool at resolve time.
            const pool = lucemonTextTrash(ctx, source);
            if (pool.length < 5) return;
            const chosenIds = await ctx.ask.selectCards(ctx, {
              candidates: pool.map((c) => c.instanceId),
              min: 5,
              max: 5,
            });
            if (chosenIds.length !== 5) return; // cost not satisfied -> nothing happens
            await ctx.fx.returnToDeck(chosenIds, { toTop: false });

            // After the cost is paid, the digivolve is itself a "may" (Q5040). Re-resolve
            // the legal Chaos Mode targets (the cost did not change them) and offer it.
            const targets = chaosModeTargets(ctx, source);
            if (targets.length === 0) return;
            const proceed = await ctx.ask.optional(
              ctx,
              "Digivolve into [Lucemon: Chaos Mode] in the trash without paying the cost?",
            );
            if (!proceed) return;

            const targetIds = targets.map((c) => c.instanceId);
            const pick =
              targetIds.length === 1
                ? targetIds
                : await ctx.ask.selectCards(ctx, { candidates: targetIds, min: 1, max: 1 });
            const chaosId = pick[0];
            if (chaosId === undefined) return;
            // Free digivolve (no cost, no on-digivolve draw — the source
            // DigivolveIntoHandOrTrashCard(payCost:false) does not draw). When Digivolving
            // for the new Chaos Mode top is fired by the effect-stack-resolution subsystem,
            // not here.
            await ctx.fx.digivolveFromInstance(self.permanentId, chaosId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
