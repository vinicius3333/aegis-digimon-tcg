import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT16-074 — Climbmon (BT16, Yellow Lv.5 Digimon).
 *
 * override of the declarative effect record stub.
 *
 * Authoritative text:
 *   [Digivolve] Lv.4 w/[Pulsemon] in text: Cost 3
 *
 *   [When Digivolving] If your security is 3 or more, draw 2 cards, then trash 1
 *     card from your hand. If your security is 3 or fewer, you may play 1 Digimon
 *     card with [Pulsemon] in its text and DP ≤ 6000 from your trash without
 *     paying the cost. At the next end of your opponent's turn, delete it.
 *
 *   [Inherited] [End of Attack] Once per turn, if this Digimon has [Pulsemon] in its
 *     text, by trashing the top card of your security stack, unsuspend this Digimon.
 *
 * KB rulings (binding):
 *   - Q2661: at exactly 3 security, BOTH branches trigger (≥3 AND ≤3 are both true).
 *   - Q5532: the delayed delete fires only at the opponent's FIRST turn end after play.
 *   - Q5533: end-of-turn effects resolve in player-chosen order.
 *
 * Residual:
 *   - "At the next end of your opponent's turn, delete it" stays residual.
 *     The engine fires `endOfTurn` at OnEndTurn but does NOT fire `endOfOpponentTurn`
 *     or `atEndOfOpponentTurn` via fireSubTrigger — those event names exist in the
 *     SubTriggerEventName union but have no wiring in GameEngine.ts or TurnStateMachine.ts.
 *     Until that seam is added the delayed-delete clause cannot execute.
 */

const cardId = "BT16-074";

/** Whether the top card of this permanent has "Pulsemon" in its name or effect text. */
const hasPulsemonInText = (ctx: EffectContext): boolean => {
  const perm = ctx.source.permanent();
  if (perm === undefined || perm.topCard === undefined) return false;
  const def: CardDefinition = ctx.game.definitionOf(perm.topCard);
  return (
    def.nameEn.includes("Pulsemon") ||
    (def.effectText ?? "").includes("Pulsemon") ||
    (def.inheritedEffectText ?? "").includes("Pulsemon")
  );
};

/** Pulsemon Digimon candidates in owner's trash with DP ≤ 6000. */
const pulseTrashCandidates = (ctx: EffectContext): string[] => {
  const owner = ctx.game.player(ctx.source.ownerSeat);
  return owner.trash
    .filter((card) => {
      const def = ctx.game.definitionOf(card);
      if (!isDigimon(def)) return false;
      if (def.dp > 6000) return false;
      return (
        def.nameEn.includes("Pulsemon") ||
        (def.effectText ?? "").includes("Pulsemon") ||
        (def.inheritedEffectText ?? "").includes("Pulsemon")
      );
    })
    .map((card) => card.instanceId);
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // -------------------------------------------------------------------------
    // [When Digivolving]
    //   Branch A (≥3 security): Draw 2, then trash 1 from hand.
    //   Branch B (≤3 security): Play 1 Pulsemon Digimon DP≤6000 from trash free.
    //   KB Q2661: at exactly 3, BOTH branches fire.
    // Residual: the delayed-delete ("at next end of opponent's turn, delete it")
    //   is not wired — `endOfOpponentTurn` has no fireSubTrigger seam yet.
    // -------------------------------------------------------------------------
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] If your security is 3 or more, draw 2 cards, then trash " +
            "1 card from your hand. If your security is 3 or fewer, you may play 1 Digimon " +
            "card with [Pulsemon] in its text and DP ≤ 6000 from your trash without paying " +
            "the cost. At the next end of your opponent's turn, delete it. " +
            "(Residual: delayed-delete clause — endOfOpponentTurn has no engine seam.)",
          optional: false,
          resolve: async (ctx) => {
            const seat = ctx.source.ownerSeat;
            const player = ctx.game.player(seat);
            const securityCount = player.security.length;

            // Branch A: ≥3 security → draw 2 then trash 1 from hand (KB Q2661: fires at exactly 3 too)
            if (securityCount >= 3) {
              await ctx.fx.draw(seat, 2);
              const handCandidates = Array.from(ctx.game.player(seat).hand).map(
                (c) => c.instanceId,
              );
              if (handCandidates.length > 0) {
                const chosen = await ctx.ask.selectCards(ctx, {
                  candidates: handCandidates,
                  min: 1,
                  max: 1,
                });
                if (chosen.length > 0) {
                  await ctx.fx.trash(chosen);
                }
              }
            }

            // Branch B: ≤3 security → play 1 Pulsemon Digimon DP≤6000 from trash free (KB Q2661: fires at exactly 3 too)
            if (securityCount <= 3) {
              const candidates = pulseTrashCandidates(ctx);
              if (candidates.length === 0) return;
              const willPlay = await ctx.ask.optional(
                ctx,
                "Play 1 Digimon with [Pulsemon] in its text and DP ≤ 6000 from your trash without paying the cost?",
              );
              if (!willPlay) return;
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates,
                min: 1,
                max: 1,
              });
              if (chosen.length === 0) return;
              await ctx.fx.playInstances(chosen, { payCost: false });
              // Residual: "At the next end of your opponent's turn, delete it."
              // Cannot implement: endOfOpponentTurn has no fireSubTrigger seam in GameEngine.ts.
            }
          },
        }),
      ];
    }

    // -------------------------------------------------------------------------
    // [Inherited] [End of Attack] Once per turn
    //   If this Digimon has [Pulsemon] in its text AND owner has ≥1 security,
    //   by trashing top of security stack, unsuspend this Digimon.
    // -------------------------------------------------------------------------
    if (timing === EffectTiming.OnEndAttack) {
      return [
        {
          effectKey: `${cardId}/end-of-attack-unsuspend`,
          description:
            "[Inherited] [End of Attack] Once per turn, if this Digimon has [Pulsemon] in " +
            "its text, by trashing the top card of your security stack, unsuspend this Digimon.",
          optional: true,
          isInherited: true,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: 1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!hasPulsemonInText(ctx)) return false;
            const seat = ctx.source.ownerSeat;
            return ctx.game.player(seat).security.length >= 1;
          },
          canActivate: (ctx) => {
            const seat = ctx.source.ownerSeat;
            return ctx.game.player(seat).security.length >= 1;
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            // Cost: trash top of security stack
            await ctx.fx.trashFromSecurity(ctx.source.ownerSeat, 1, { fromTop: true });
            // Effect: unsuspend this Digimon
            ctx.fx.unsuspend([perm.permanentId]);
          },
        },
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
