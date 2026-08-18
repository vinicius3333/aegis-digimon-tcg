import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * P-242 — Rei Katsura (P, Purple/Blue Tamer).
 *
 * implemented from the existing hand-fixed IR and printed card text.
 *
 * Authoritative text:
 *   [Start of Your Main Phase] By trashing 1 card with the [System], [Life (App Name)],
 *     or [Transmutation (App Name)] trait from your hand, draw 1 card and gain 1 memory.
 *   [Main] By suspending this Tamer, link 1 [System], [Life (App Name)], or
 *     [Transmutation (App Name)] trait card from your trash to 1 of your Digimon
 *     with the cost reduced by 1.
 *   [Security] Play this Tamer without paying its memory cost.
 *
 * Residual:
 *   "Link" action: link 1 trait card from trash to a Digimon with cost -1. The
 *   engine has no "link a card" primitive. The activated [Main] body guards and
 *   suspends this Tamer as the cost, but the link placement cannot be executed.
 */
const cardId = "P-242";

const LINK_TRAITS = ["System", "Life", "Transmutation"];

const hasLinkTrait = (def: CardDefinition): boolean => {
  const types = def.types as string[] | undefined;
  return types?.some((t) => LINK_TRAITS.includes(t)) ?? false;
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Main Phase] By trashing 1 trait card from hand: draw 1, gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-draw-memory`,
          description:
            "[Start of Your Main Phase] By trashing 1 card with the [System], [Life (App Name)], " +
            "or [Transmutation (App Name)] trait from your hand, draw 1 card and gain 1 memory.",
          optional: true,
          when: () => source.isOnBattleArea() && source.isOwnersTurn(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.hand).some((c) => hasLinkTrait(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.hand)
              .filter((c) => hasLinkTrait(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const [chosen] = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 1,
              max: 1,
            });
            if (chosen === undefined) return;

            await ctx.fx.trash([chosen]);
            await ctx.fx.draw(source.ownerSeat, 1);
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Main] By suspending this Tamer, link 1 trait card from trash to a Digimon.
    // Cost is applied (suspend); link placement is a residual — no engine primitive.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/main-suspend-link`,
          description:
            "[Main] By suspending this Tamer, link 1 [System], [Life (App Name)], or " +
            "[Transmutation (App Name)] trait card from your trash to 1 of your Digimon " +
            "with the cost reduced by 1. (Residual: link placement has no engine primitive.)",
          optional: true,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            if (!source.isOwnersTurn()) return false;
            const self = source.permanent?.();
            return self !== undefined && !self.isSuspended;
          },
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return Array.from(owner.trash).some((c) => hasLinkTrait(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const self = source.permanent?.();
            if (self === undefined) return;
            // Pay cost: suspend this Tamer.
            await ctx.fx.suspend([self.permanentId]);
            // Link placement: residual — no engine primitive available.
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying its memory cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-free`,
          description: "[Security] Play this Tamer without paying its memory cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
