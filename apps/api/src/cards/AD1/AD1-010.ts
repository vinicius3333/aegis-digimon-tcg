import { EffectDuration, EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Effect } from "../../engine/effects/Effect.js";
import {
  onPlay,
  staticModifier,
  turnTiming,
  whenDigivolving,
} from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Garurumon (AD1-010, Blue Lv.4 Digimon).
const cardId = "AD1-010";

// Both [On Play] and [When Digivolving] run the same "Draw 1"; the source guards it
// with IsExistOnBattleArea + a non-empty deck (LibraryCards.Count() > 0).
const ownerDeckHasCards = (ctx: EffectContext): boolean =>
  ctx.game.player(ctx.source.ownerSeat).deck.length > 0;

const drawOne = async (ctx: EffectContext): Promise<void> => {
  await ctx.fx.draw(ctx.source.ownerSeat, 1);
};

// source CardSource.ContainsCardName("X"): substring match against the card's name.
const nameContains = (def: { nameEn: string }, fragment: string): boolean =>
  def.nameEn.includes(fragment);

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] <Draw 1>
    // Aegis splits OnEnterFieldAnyone into the distinct OnPlay / WhenDigivolving
    // windows (see card-module contract BT15 example), so this is the OnPlay branch.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-draw-1`,
          description: "[On Play] <Draw 1>",
          optional: false,
          when: (ctx) => ownerDeckHasCards(ctx),
          resolve: drawOne,
        }),
      ];
    }

    // [When Digivolving] <Draw 1>
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-draw-1`,
          description: "[When Digivolving] <Draw 1>",
          optional: false,
          when: (ctx) => ownerDeckHasCards(ctx),
          resolve: drawOne,
        }),
      ];
    }

    // [All Turns] When your Digimon or Tamers are played or digivolve, if any of them
    // have [Greymon] or [Matt Ishida] in their names, this Digimon may digivolve into a
    // Digimon card with [Garurumon] in its name in the hand without paying the cost.
    //
    // one of the just-played/digivolved permanents is named Greymon or Matt Ishida; the
    // body is the effect runtime.DigivolveIntoHandOrTrashCard(isHand:true, payCost:false)
    // into a "Garurumon" card. This is a someone-else-entered-the-field trigger, so it
    // maps to the OnEnterFieldAnyone window rather than this card's own OnPlay.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/may-digivolve-into-garurumon`,
          description:
            "[All Turns] When your Digimon or Tamers are played or digivolve, if any of them " +
            "have [Greymon] or [Matt Ishida] in their names, this Digimon may digivolve into a " +
            "Digimon card with [Garurumon] in its name in the hand without paying the cost.",
          optional: true,
          // CanUse + CanActivate: this is a Digimon on its owner's battle area, and one
          // of the permanents that just entered the field belongs to the owner and is a
          // Digimon/Tamer named Greymon or Matt Ishida.
          when: (ctx) =>
            ctx.source.isOnBattleArea() &&
            isDigimon(ctx.source.definition) &&
            triggeringDigimonNamed(ctx, ["Greymon", "Matt Ishida"]),
          canActivate: (ctx) =>
            ctx.source.isOnBattleArea() && garurumonInHand(ctx).length > 0,
          resolve: async (ctx) => {
            // TODO(digivolve-from-hand primitive): there is no fx verb for
            // "digivolve this permanent into a chosen hand card without paying cost"
            // (source the effect runtime.DigivolveIntoHandOrTrashCard). Compose the
            // selection with the existing decision API; the actual stacking belongs to
            // the digivolve action and is left for that primitive to land.
            const candidates = garurumonInHand(ctx).map((c) => c.instanceId);
            if (candidates.length === 0) return;
            await ctx.ask.selectCards(ctx, { candidates, min: 1, max: 1 });
          },
        }),
      ];
    }

    // Static + inherited clauses live under EffectTiming.None (source timing None).
    if (timing === EffectTiming.None) {
      return [
        // [Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2.
        // permanentCondition: top card HasText("Omnimon") || EqualsTraits("ADVENTURE")).
        // No fx verb adds an *alternate* digivolve path (changeEvoCost only adjusts the
        // cost of an existing one). Recorded as a static marker; see notes.
        staticModifier({
          source,
          effectKey: `${cardId}/alt-digivolve-omnimon-or-adventure`,
          description:
            "[Digivolve] Lv.3 w/[Omnimon] in text or w/[ADVENTURE] trait: Cost 2.",
          optional: false,
          resolve: async () => {
            // TODO(static-continuous-effects / digivolve action): no primitive for an
            // alternate digivolution requirement. The digivolve action must read this
            // marker to allow Lv.3 bases whose top card has "Omnimon" in text or the
            // "ADVENTURE" trait to digivolve into this card for cost 2.
          },
        }),
        // Inherited <Jamming>. `ctx.fx.grantKeyword` is the generic keyword-grant
        // primitive (engine/effects/primitives.ts); Jamming is consumed at
        // engine/security/securityCheck.ts via `hasKeyword(..., "Jamming")`. Re-granted
        // continuously (BT18-025 is the sibling "printed + inherited Jamming" vehicle
        // for this exact pattern).
        staticModifier({
          source,
          effectKey: `${cardId}/jamming`,
          description:
            "<Jamming> (This Digimon can't be deleted in battles against Security Digimon.)",
          isInherited: true,
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self !== undefined) {
              ctx.fx.grantKeyword(self.permanentId, "Jamming", EffectDuration.UntilEachTurnEnd);
            }
          },
        }),
      ];
    }

    return [];
  },
};

// --- pure helpers ------------------------------------------------------------

/** The Garurumon-named Digimon cards in the owner's hand (digivolution targets). */
function garurumonInHand(ctx: EffectContext): { instanceId: string }[] {
  const hand = ctx.game.player(ctx.source.ownerSeat).hand;
  return Array.from(hand).filter((card) => {
    const def = ctx.game.definitionOf(card);
    return isDigimon(def) && nameContains(def, "Garurumon");
  });
}

/**
 * Whether one of the permanents that just entered the field (played or digivolved)
 * belongs to the source's owner, is a Digimon or Tamer, and is named one of
 * `names`. Mirrors the source CanActivate over
 * GetPlayedPermanentsFromEnterFieldHashtable + TriggerRequirement.
 *
 * The TS TriggerInfo has no "entered-field permanents" field yet, so this reads the
 * owner's current battle-area permanents whose top card matches — a best-effort
 * stand-in until the trigger payload carries the just-entered permanents (see notes).
 */
function triggeringDigimonNamed(ctx: EffectContext, names: string[]): boolean {
  const owner = ctx.game.player(ctx.source.ownerSeat);
  return Array.from(owner.battleArea).some((permanent: Permanent) => {
    if (permanent.controllerSeat !== ctx.source.ownerSeat) return false;
    if (permanent.topCard === undefined) return false;
    const def = ctx.game.definitionOf(permanent.topCard);
    if (!isDigimon(def) && !isTamer(def)) return false;
    return names.some((name) => nameContains(def, name));
  });
}

registerCard(module);
export default module;
