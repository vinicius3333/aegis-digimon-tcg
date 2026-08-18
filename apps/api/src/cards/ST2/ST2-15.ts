import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * ST2-15 — Kaiser Nail (ST2, Blue Option / Cost 4).
 *
 *
 * [Main] Choose a Digimon digivolution card placed under 1 of your Digimon and play
 *   it as another Digimon without paying its memory cost.
 * [Security] Activate this card's [Main] effect.
 *
 *   EffectTiming.OptionSkill → [Main] effect body.
 *   EffectTiming.SecuritySkill → AddActivateMainOptionSecurityEffect (dispatch to OnUseOption).
 *
 * The [Main] body (documented behavior):
 *   1. Choose 1 of your battle-area Digimon that has at least 1 Digimon digi-card.
 *   2. Choose 1 Digimon digi-card from that Digimon's stack.
 *   3. Play that digi-card as a new Digimon without paying cost (from digivolution zone).
 */

const cardId = "ST2-15";

async function executeMain(ctx: import("../../engine/effects/EffectContext.js").EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);

  // Step 1: pick a battle-area Digimon that has at least 1 Digimon digi-card.
  const permanentsWithDigiCards = owner.battleArea.filter((p) => {
    return p.stack.some((c) => {
      const def = ctx.game.definitionOf(c);
      return (def.kinds as string[]).includes(CardKind.Digimon as string);
    });
  });

  if (permanentsWithDigiCards.length === 0) return;

  const hostCandidates = permanentsWithDigiCards.map((p) => p.permanentId);
  const hostPicks = await ctx.ask.chooseTargets(ctx, {
    candidates: hostCandidates,
    min: 1,
    max: 1,
  });
  if (hostPicks.length === 0) return;

  const hostPerm = permanentsWithDigiCards.find(
    (p) => p.permanentId === hostPicks[0],
  );
  if (hostPerm === undefined) return;

  // Step 2: pick a Digimon digi-card from that permanent's stack.
  const digiCardCandidates = hostPerm.stack
    .filter((c) => {
      const def = ctx.game.definitionOf(c);
      return (def.kinds as string[]).includes(CardKind.Digimon as string);
    })
    .map((c) => c.instanceId);

  if (digiCardCandidates.length === 0) return;

  const digiCardPicks = await ctx.ask.selectCards(ctx, {
    candidates: digiCardCandidates,
    min: 1,
    max: 1,
  });
  if (digiCardPicks.length === 0) return;

  // Step 3: play the chosen digi-card as a new Digimon without paying the cost.
  await ctx.fx.playInstances(digiCardPicks, { payCost: false });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const out: Effect[] = [];

    // [Main] (documented behavior; EffectTiming.OptionSkill → Aegis OnUseOption)
    if (timing === EffectTiming.OnUseOption) {
      out.push(
        activated({
          source,
          effectKey: `${cardId}/main-play-digi-card`,
          description:
            "[Main] Choose a Digimon digivolution card placed under 1 of your Digimon " +
            "and play it as another Digimon without paying its memory cost.",
          resolve: async (ctx) => {
            await executeMain(ctx, source);
          },
        }),
      );
    }

    // [Security] Activate this card's [Main] effect (documented behavior)
    if (timing === EffectTiming.SecuritySkill) {
      out.push(
        security({
          source,
          effectKey: `${cardId}/security-activate-main`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => {
            await executeMain(ctx, source);
          },
        }),
      );
    }

    return out;
  },
};

registerCard(module);
export default module;
