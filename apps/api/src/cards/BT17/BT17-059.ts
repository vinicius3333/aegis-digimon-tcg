import { EffectTiming } from "@aegis/shared";
import type { CardInstance, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT17-059";
const diaboromonName = "diaboromon";

/**
 * Diaboromon (BT17-059) — Black Digimon. Two printed effects:
 *
 *  1. [When Digivolving] By placing 1 [Doomsday Clock] from your hand or trash as
 *     this Digimon's bottom digivolution card, you may play 2 [Diaboromon] Tokens.
 *  2. [Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks,
 *     you may switch the attack target to 1 of your Digimon with [Diaboromon] in its
 *     name.
 *
 * KB rulings consulted (binding):
 *  - Q2813: the token play is optional even after paying the "by placing" cost
 *    ("you may play"); the player may decline. -> effect 1 is `optional`.
 *  - Q2815: the redirected-to Diaboromon may be UNSUSPENDED. -> effect 2 places no
 *    suspended/unsuspended restriction on its candidates.
 *  - Q2814 / Q5646 are about other interactions (single trigger window for both
 *    tokens; cannot re-activate after this leaves play mid-process) and do not change
 *    how either clause is authored here.
 *
 * Both effects use executable engine seams. Effect 1 uses the token primitive
 * and remains optional after the Doomsday Clock placement, as confirmed by Q2813.
 */

const opponentAttackerIsHostile = (ctx: EffectContext): boolean => {
  const attackerId = ctx.trigger.attackerPermanentId;
  if (attackerId === undefined) return false;
  const attacker = ctx.game.permanentById(attackerId);
  if (attacker === undefined) return false;
  const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
  return attacker.controllerSeat === opponentSeat;
};

const hasDiaboromonName = (ctx: EffectContext, permanent: Permanent): boolean => {
  const top: CardInstance | undefined = permanent.topCard;
  if (top === undefined) return false;
  return ctx.game.definitionOf(top).nameEn.toLowerCase().includes(diaboromonName);
};

/** My battle-area Digimon with [Diaboromon] in their name — the redirect candidates. */
const diaboromonRedirectTargets = (ctx: EffectContext): string[] =>
  ctx.game
    .player(ctx.source.ownerSeat)
    .battleArea.filter((permanent) => hasDiaboromonName(ctx, permanent))
    .map((permanent) => permanent.permanentId);

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Effect 2 — [Opponent's Turn] [Once Per Turn] redirect (combat). The combat
    // controller fires OnAllyAttack at the When-Attacking seam (with the attacker in
    // ctx.trigger) and then re-reads the possibly-redirected target before opening the
    // block window, so a redirect performed here is honored.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/redirect-to-diaboromon`,
          description:
            "[Opponent's Turn] [Once Per Turn] When one of your opponent's Digimon attacks, " +
            "you may switch the attack target to 1 of your Digimon with [Diaboromon] in its name.",
          optional: true,
          maxPerTurn: 1,
          // [Opponent's Turn] + the attacker must be an opponent's Digimon, and I must
          // have a [Diaboromon] of my own on the field to switch the attack onto.
          when: (ctx) =>
            source.isOnBattleArea() &&
            !source.isOwnersTurn() &&
            opponentAttackerIsHostile(ctx) &&
            diaboromonRedirectTargets(ctx).length > 0,
          canActivate: (ctx) => diaboromonRedirectTargets(ctx).length > 0,
          resolve: async (ctx) => {
            // redirectAttack consults the open attack and asks the controller to pick
            // when more than one candidate is offered.
            await ctx.fx.redirectAttack(diaboromonRedirectTargets(ctx));
          },
        }),
      ];
    }

    // Effect 1 — [When Digivolving] play 2 [Diaboromon] Tokens. `optional` per Q2813.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/play-diaboromon-tokens`,
          description:
            "[When Digivolving] By placing 1 [Doomsday Clock] from your hand or trash as this " +
            "Digimon's bottom digivolution card, you may play 2 [Diaboromon] Tokens.",
          optional: true,
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (self === undefined) return;
            const owner = ctx.game.player(source.ownerSeat);
            const clockCandidates = [...owner.hand, ...owner.trash]
              .filter((card) => ctx.game.definitionOf(card).nameEn === "Doomsday Clock")
              .map((card) => card.instanceId);
            if (clockCandidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: clockCandidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;
            await ctx.fx.placeUnder(self.permanentId, chosen, { belowTop: false });
            const playTokens = await ctx.ask.optional(ctx, "Play 2 [Diaboromon] Tokens without paying their costs?");
            if (!playTokens) return;
            await ctx.fx.playToken(source.ownerSeat, "Diaboromon Token", { payCost: false });
            await ctx.fx.playToken(source.ownerSeat, "Diaboromon Token", { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
