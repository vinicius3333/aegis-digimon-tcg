import { CardColor, EffectTiming, isDigimon, isOption } from "@aegis/shared";
import type { CardDefinition, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { cardHasTrait } from "../../engine/cards/cardData.js";
import { linkEligible } from "../../engine/effects/mindLink.js";

/**
 * BT26-084 — Copipemon (BT26, White Lv.3 Digimon).
 *
 * The committed KB contains Q7125-Q7128 (2026-08-18), confirming Link eligibility,
 * reveal-return timing around play/use, and the linked-card trigger ordering.
 *
 * Printed text:
 *   [Digivolve] Lv.2 w/[Appmon] trait: Cost 0
 *   ＜Detach ([Seven Code] trait)＞
 *   [Your Turn] [Once Per Turn] When this Digimon gets linked, reveal the top 3 cards of
 *     your deck. You may play or use 1 [Seven Code] trait card among them with the cost
 *     reduced by 3. Return the rest to the top or bottom of the deck.
 *
 * Clause mapping:
 *   [Digivolve] — a digivolution-cost requirement, not an effect clause.
 *   ＜Detach＞ — printed keyword on this card's own text, resolved by the engine's
 *     printed-keyword reader; no module clause.
 *   EffectTiming.None — a persistent [Your Turn] watcher installing a `whenLinked`
 *     sub-trigger, budgeted by `oncePerTurnKey`; see BT26-051 for the shared shape.
 *     "play or use" splits on card kind exactly as the interpreter does: an Option is
 *     USED (`useOptionFromHand`, which runs its [Main] effect), anything else is PLAYED.
 *     A revealed card is loose, so — mirroring `runRevealAdd` — it is first moved to the
 *     hand silently and then played/used from there, which is also what keeps the cost
 *     reduction on the normal play path.
 *
 * Link face:
 *     [When Linking] You may link 1 non-white level 4 or lower [System] or [Seven Code] trait
 *     card from your trash to this Digimon without paying the cost.
 *   The link primitive recomputes after mutation and publishes the linked instance IDs in
 *   the same `whenLinked` dispatch as the host's watcher. This linked-only subscription can
 *   therefore join the controller's simultaneous trigger-order choice required by Q7128.
 */
const cardId = "BT26-084";

const REVEAL_COUNT = 3;
const COST_REDUCTION = 3;

function hasSevenCode(def: CardDefinition): boolean {
  return cardHasTrait(def, "Seven Code");
}

/** "Reveal the top 3 cards of your deck. You may play or use 1 [Seven Code] trait card among them with the cost reduced by 3. Return the rest to the top or bottom of the deck." */
async function revealPlayAndReturn(ctx: EffectContext, ownerSeat: Seat): Promise<void> {
  const revealed = await ctx.fx.reveal(ownerSeat, REVEAL_COUNT);
  if (revealed.length === 0) return;

  const taken = new Set<string>();
  const playable = revealed.filter((c) => hasSevenCode(ctx.game.definitionOf(c)));
  if (playable.length > 0) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: playable.map((c) => c.instanceId),
      visible: revealed.map((c) => c.instanceId),
      min: 0,
      max: 1,
    });
    const pickedId = chosen[0];
    if (pickedId !== undefined) {
      taken.add(pickedId);
      const picked = playable.find((c) => c.instanceId === pickedId)!;
      // Move the loose revealed card into the hand first, then play/use it from there —
      // the same staging `runRevealAdd` performs for its own play specs.
      await ctx.fx.returnToHand([pickedId], { silent: true });
      if (isOption(ctx.game.definitionOf(picked))) {
        const originalCost = ctx.game.definitionOf(picked).playCost ?? 0;
        await ctx.fx.useOptionFromHand(ctx, pickedId, originalCost, {
          payCost: true,
          costDelta: COST_REDUCTION,
        });
      } else {
        await ctx.fx.playFromHand([pickedId], { payCost: true, costDelta: COST_REDUCTION });
      }
    }
  }

  const rest = revealed.filter((c) => !taken.has(c.instanceId)).map((c) => c.instanceId);
  if (rest.length === 0) return;
  const choice = await ctx.ask.chooseOption(ctx, ["Top of deck", "Bottom of deck"]);
  await ctx.fx.returnToDeck(rest, { toTop: choice === 0 });
}

function linkFaceCandidates(ctx: EffectContext, ownerSeat: Seat) {
  return Array.from(ctx.game.player(ownerSeat).trash).filter((card) => {
    const def = ctx.game.definitionOf(card);
    return (
      isDigimon(def) &&
      def.level !== undefined &&
      def.level <= 4 &&
      !def.colors.includes(CardColor.White) &&
      (cardHasTrait(def, "System") || cardHasTrait(def, "Seven Code")) &&
      linkEligible(def)
    );
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/when-linked-reveal-play`,
          description:
            "[Your Turn] [Once Per Turn] When this Digimon gets linked, reveal the top 3 cards " +
            "of your deck. You may play or use 1 [Seven Code] trait card among them with the " +
            "cost reduced by 3. Return the rest to the top or bottom of the deck.",
          optional: false,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const hostId = self.permanentId;
            const ownerSeat = source.ownerSeat;

            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: hostId,
              once: false,
              oncePerTurnKey: `${source.instanceId}/${cardId}/when-linked-reveal-play`,
              description: `${cardId}: this Digimon gets linked -> reveal 3 and may play 1.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                return subCtx.trigger?.subjectPermanentId === hostId;
              },
              run: async (subCtx) => {
                await revealPlayAndReturn(subCtx, ownerSeat);
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/link-face-link-from-trash`,
          description:
            "[When Linking] You may link 1 non-white Lv.4 or lower [System] or [Seven Code] " +
            "trait card from your trash to this Digimon without paying the cost.",
          isLinked: true,
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const hostId = host.permanentId;
            ctx.fx.subscribeSubTrigger({
              event: "whenLinked",
              sourcePermanentId: hostId,
              once: false,
              description: `${cardId}: linked face [When Linking] link from trash.`,
              matches: (subCtx) => subCtx.trigger?.linkedCardInstanceIds?.includes(source.instanceId) === true,
              run: async (subCtx) => {
                const candidates = linkFaceCandidates(subCtx, source.ownerSeat);
                if (candidates.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: candidates.map((card) => card.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen[0] !== undefined) await subCtx.fx.link(hostId, [chosen[0]]);
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
