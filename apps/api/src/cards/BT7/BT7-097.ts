import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { Permanent } from "@aegis/shared";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT7-097 — Cocutus Breath (BT7, Blue Option).
 *
 *
 *   EffectTiming.OptionSkill → EffectTiming.OnUseOption / activated builder:
 *     [Main] Choose up to 2 Digimon cards in the digivolution cards of one of your Digimon
 *     and play them as other Digimon without paying their memory costs.
 *   EffectTiming.SecuritySkill → security builder:
 *     reproduce the [Main] effect.
 */

const cardId = "BT7-097";

function ownDigimonWithEligibleStack(ctx: EffectContext, source: CardSource): Permanent[] {
  const owner = ctx.game.player(source.ownerSeat);
  return Array.from(owner.battleArea).filter((p) => {
    if (p.topCard === undefined) return false;
    if (!isDigimon(ctx.game.definitionOf(p.topCard))) return false;
    return p.stack.some((c) => {
      const def = ctx.game.definitionOf(c);
      return def.kinds.includes(CardKind.Digimon);
    });
  });
}

function playableDigimonInStack(permanent: Permanent, ctx: EffectContext): string[] {
  return permanent.stack
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return def.kinds.includes(CardKind.Digimon);
    })
    .map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Play up to 2 Digimon from one of your Digimon's digivolution cards without cost.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-play-from-digivolution`,
          description:
            "[Main] Choose up to 2 Digimon cards in the digivolution cards of one of your " +
            "Digimon and play them as other Digimon without paying their memory costs.",
          optional: false,
          canActivate: (ctx) => ownDigimonWithEligibleStack(ctx, source).length >= 1,
          resolve: async (ctx) => {
            const hosts = ownDigimonWithEligibleStack(ctx, source);
            if (hosts.length === 0) return;

            // Select 1 host Digimon
            const hostIds = hosts.map((p) => p.permanentId);
            const chosenHostId =
              hostIds.length === 1
                ? hostIds[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates: hostIds, min: 1, max: 1 }))[0];
            if (!chosenHostId) return;

            const host = hosts.find((p) => p.permanentId === chosenHostId);
            if (!host) return;

            const eligibleInstances = playableDigimonInStack(host, ctx);
            if (eligibleInstances.length === 0) return;

            // Select up to 2 Digimon cards from that Digimon's stack
            const maxSelect = Math.min(2, eligibleInstances.length);
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: eligibleInstances,
              min: 0,
              max: maxSelect,
            });
            if (selected.length === 0) return;

            // Play the selected Digimon cards from digivolution cards without paying cost
            await ctx.fx.playInstances(selected, { payCost: false, suspended: false });
          },
        }),
      ];
    }

    // [Security] Activate this card's [Main] effect.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-from-digivolution`,
          description: "[Security] Activate this card's [Main] effect.",
          optional: false,
          resolve: async (ctx) => {
            const hosts = ownDigimonWithEligibleStack(ctx, source);
            if (hosts.length === 0) return;

            const hostIds = hosts.map((p) => p.permanentId);
            const chosenHostId =
              hostIds.length === 1
                ? hostIds[0]!
                : (await ctx.ask.chooseTargets(ctx, { candidates: hostIds, min: 1, max: 1 }))[0];
            if (!chosenHostId) return;

            const host = hosts.find((p) => p.permanentId === chosenHostId);
            if (!host) return;

            const eligibleInstances = playableDigimonInStack(host, ctx);
            if (eligibleInstances.length === 0) return;

            const maxSelect = Math.min(2, eligibleInstances.length);
            const selected = await ctx.ask.selectCards(ctx, {
              candidates: eligibleInstances,
              min: 0,
              max: maxSelect,
            });
            if (selected.length === 0) return;

            await ctx.fx.playInstances(selected, { payCost: false, suspended: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
