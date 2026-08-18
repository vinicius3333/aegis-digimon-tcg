import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST10-14 — Taomon, ST10, Yellow Option.
 *
 * source: documented behavior.
 *
 * Three clauses:
 *   1. OptionSkill ([Main]): Select 1 opponent Digimon, player chooses top/bottom of
 *      opponent's security, place the Digimon there. If the card was added to security,
 *      trash the top security card regardless of which placement was chosen.
 *   2. SecuritySkill: You may place 1 opponent Digimon at top or bottom of opponent's
 *      security. Optional (canNoSelect: true).
 */
const cardId = "ST10-14";

/** Opponent battle-area Digimon permanent ids. */
function opponentDigimonIds(ctx: EffectContext, source: CardSource): string[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const ids: string[] = [];
  for (const p of opponent.battleArea) {
    if (p.inBreeding) continue;
    if (p.topCard === undefined) continue;
    if (!isDigimon(ctx.game.definitionOf(p.topCard))) continue;
    ids.push(p.permanentId);
  }
  return ids;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // (1) [Main] OptionSkill: select opp Digimon, choose top/bottom,
    //     place to opponent security, then trash top security if placement succeeded.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-place-opp-digimon-security`,
          description:
            "[Main] Place 1 of your opponent's Digimon face down at the top or bottom of " +
            "your opponent's security stack. If you do, trash the top card of your " +
            "opponent's security stack.",
          optional: false,
          canActivate: (ctx) => opponentDigimonIds(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = opponentDigimonIds(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            const selectedId = chosen[0]!;
            const selected = ctx.game.permanentById(selectedId);
            if (selected === undefined || selected.topCard === undefined) return;

            //     [true] = "Security Top", [false] = "Security Bottom"
            const choice = await ctx.ask.chooseOption(ctx, [
              "Place to the top of security",
              "Place to the bottom of security",
            ]);
            const toTop = choice === 0;

            // Place to OPPONENT's security (IPutSecurityPermanent auto-targets the
            // permanent's controller's opponent's security).
            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            const topCardInstanceId = selected.topCard.instanceId;
            await ctx.fx.addSecurity(opponentSeat, [topCardInstanceId], {
              toTop,
              faceUp: false,
            });

            // "If you do" checks whether the placement actually succeeded (Kongou can
            // prohibit it). The top card is trashed after either destination choice: when
            // placed on top this trashes the chosen Digimon; when placed on the bottom it
            // trashes the card that was already on top of security.
            const placementSucceeded = Array.from(ctx.game.player(opponentSeat).security)
              .some((card) => card.instanceId === topCardInstanceId);
            if (placementSucceeded) {
              await ctx.fx.trashFromSecurity(opponentSeat, 1, { fromTop: true });
            }
          },
        }),
      ];
    }

    // (2) [Security] OptionSecurity: may select opp Digimon, choose top/bottom,
    //     place to opponent security.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-place-opp-digimon-security`,
          description:
            "[Security] You may place 1 of your opponent's Digimon face down at the " +
            "top or bottom of its owner's security stack.",
          optional: true,
          canActivate: (ctx) => opponentDigimonIds(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const candidates = opponentDigimonIds(ctx, source);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen.length === 0) return;

            const selectedId = chosen[0]!;
            const selected = ctx.game.permanentById(selectedId);
            if (selected === undefined || selected.topCard === undefined) return;

            const choice = await ctx.ask.chooseOption(ctx, [
              "Place to the top of security",
              "Place to the bottom of security",
            ]);
            const toTop = choice === 0;

            const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
            await ctx.fx.addSecurity(opponentSeat, [selected.topCard.instanceId], {
              toTop,
              faceUp: false,
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
