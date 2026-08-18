import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT5-096";

function ownerHasGarurumonOrOmnimon(ctx: EffectContext, source: CardSource): boolean {
  const owner = ctx.game.player(source.ownerSeat);
  for (const p of owner.battleArea) {
    if (p.inBreeding) continue;
    if (p.topCard === undefined) continue;
    const def = ctx.game.definitionOf(p.topCard);
    if (!isDigimon(def)) continue;
    const name = def.nameEn.toLowerCase();
    if (name.includes("garurumon") || name.includes("omnimon")) return true;
  }
  return false;
}

async function resolveMainEffect(ctx: EffectContext, source: CardSource) {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  const threshold = ownerHasGarurumonOrOmnimon(ctx, source) ? 5000 : 3000;

  const targets = opponent.battleArea.filter((p) => {
    if (p.inBreeding) return false;
    if (p.topCard === undefined) return false;
    const def = ctx.game.definitionOf(p.topCard);
    if (!isDigimon(def)) return false;
    return p.currentDP <= threshold;
  });

  if (targets.length === 0) return;

  const topCardIds = targets.map((p) => p.topCard!.instanceId);
  await ctx.fx.returnToHand(topCardIds);

  // Trash digivolution cards of the bounced Digimon.
  for (const p of targets) {
    if (p.stack.length > 0) {
      await ctx.fx.trashDigivolutionCards(
        p.permanentId,
        Array.from(p.stack).map((c) => c.instanceId),
      );
    }
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Main] Return all of your opponent's Digimon with 3000 DP or less to their
    // owners' hands. If you have a Digimon in play with [Garurumon] or [Omnimon]
    // in its name, return all of your opponent's Digimon with 5000 DP or less
    // to their owners' hands instead. Trash all of the digivolution cards of
    // those Digimon.
    //
    //   CanSelectPermanentCondition: opponent Digimon, DP ≤ maxDP, !CanNotBeAffected.
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-mass-bounce`,
          description:
            "[Main] Return all of your opponent's Digimon with 3000 DP or less " +
            "to their owners' hands. If you have a Digimon in play with [Garurumon] " +
            "or [Omnimon] in its name, return all of your opponent's Digimon with " +
            "5000 DP or less to their owners' hands instead. Trash all of the " +
            "digivolution cards of those Digimon.",
          optional: false,
          resolve: async (ctx) => {
            await resolveMainEffect(ctx, source);
          },
        }),
      ];
    }

    // [Security] Activate this card's [Main] effect.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-activate-main`,
          description: "[Security] Activate this card's [Main] effect.",
          optional: false,
          resolve: async (ctx) => {
            await resolveMainEffect(ctx, source);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
