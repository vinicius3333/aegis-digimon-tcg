import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";

// BT26-011 — Buraimon (BT26, Red Lv.4 Digimon).
//
// KB Q6965 (2026-08-18) defines "a card with X in its text" as every printed field:
// name, traits, effects, inherited effects, Rule text, and all evolution/Xros/Fusion/
// Link/Assembly requirements. `matchNameOrTrait(..., {match:"text"})` implements that
// complete catalog search rather than checking only effectText.
//
// [Digivolve] Lv.3 w/[TS] trait: Cost 2 — a digivolution-cost requirement, not an effect
//   clause; carried by generated-digivolve-overrides.json and read centrally.
// ＜Raid＞
// [On Play] [When Digivolving] By trashing 1 card with [Chronomon] in its text or the
//   [Shaman] trait from your hand, ＜Draw 2＞.
// Inherited: ＜Raid＞ (the same keyword, granted even while this card is buried in a
//   digivolution stack).
//
// Structural precedent: the trash-1-from-hand-then-draw-2 cost/effect shape mirrors
// BT24-008 (Elizamon — "By trashing 1 card with the [Reptile], [Dragonkin] or
// [LIBERATOR] trait from your hand" -> Draw 2, an optional all-or-nothing cost). The
// name/trait-in-text hand filter mirrors BT18-069's `hasKnightmonInName` helper
// (`def.effectText.includes(...)` / `def.types` trait check). The own-vs-inherited
// ＜Raid＞ split (two separate staticModifier grants, one isInherited:false and one
// isInherited:true) mirrors BT26-008's own OnPlay/OnMove clause vs. its separate
// isInherited:true [Your Turn] clause — cards.json keeps effectText and
// inheritedEffectText as distinct fields, so the port keeps them as distinct effects.

const cardId = "BT26-011";

const hasChronomonTextOrShamanTrait = (def: CardDefinition): boolean =>
  matchNameOrTrait(def, { tokens: ["Chronomon"], match: "text" }) || cardHasTrait(def, "Shaman");

/** [On Play] [When Digivolving] By trashing 1 matching card from hand, draw 2. */
async function trashForDrawTwo(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const candidates = Array.from(owner.hand).filter((c) => hasChronomonTextOrShamanTrait(ctx.game.definitionOf(c)));
  if (candidates.length === 0) return;

  // Optional all-or-nothing cost (mirrors BT24-008's canNoSelect:true): decline or no
  // eligible card in hand means no draw.
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length === 0) return;

  const paid = await ctx.fx.trash(chosen);
  if (paid.length !== 1 || paid[0]!.instanceId !== chosen[0]) return;
  await ctx.fx.draw(source.ownerSeat, 2);
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-draw2`,
          description:
            "[On Play] By trashing 1 card with [Chronomon] in its text or the [Shaman] " +
            "trait from your hand, ＜Draw 2＞.",
          optional: false,
          resolve: async (ctx) => {
            await trashForDrawTwo(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-trash-draw2`,
          description:
            "[When Digivolving] By trashing 1 card with [Chronomon] in its text or the " +
            "[Shaman] trait from your hand, ＜Draw 2＞.",
          optional: false,
          resolve: async (ctx) => {
            await trashForDrawTwo(ctx, source);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        // Own ＜Raid＞ (printed keyword line, applies while this is the active card).
        staticModifier({
          source,
          effectKey: `${cardId}/raid`,
          description: "＜Raid＞",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.grantKeyword(me.permanentId, "Raid", EffectDuration.Permanent);
          },
        }),
        // Inherited ＜Raid＞ (cards.json inheritedEffectText: the same keyword, kept
        // available while this card sits buried in a digivolution stack).
        staticModifier({
          source,
          effectKey: `${cardId}/raid-inherited`,
          description: "Inherited: ＜Raid＞",
          optional: false,
          isInherited: true,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const me = source.permanent();
            if (me === undefined) return;
            ctx.fx.grantKeyword(me.permanentId, "Raid", EffectDuration.Permanent);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
