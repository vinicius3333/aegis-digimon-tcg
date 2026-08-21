import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onDeletion, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
import { staticModifier } from "../../engine/effects/builders.js";
import { effectiveStaticNames } from "@aegis/shared";

/**
 * BT17-102 — Greymon (BT17, White Lv.4 Digimon).
 *
 *
 * Alternate digivolve: from Lv.3 [Agumon] on your battle area for cost 2.
 *
 * Effects:
 *   [When Digivolving] If this Digimon's name is [Koromon], it gains +3000 DP for the
 *     turn. Then, delete 1 of your opponent's Digimon with as much or less DP as this
 *     Digimon.
 *   [All Turns] This Digimon has all the names of level 3 and lower cards in its
 *     digivolution cards.
 *     RESIDUAL — rule implementation requires a dynamic name-grant
 *     subsystem not available in grantNameTrait (which records static tokens at resolution
 *     time). No engine primitive for dynamic digivolution-stack-driven name aliasing.
 *   [On Deletion] You may play 1 Tamer card with [Tai Kamiya] or [Kari Kamiya] in its
 *     name from your hand without paying the cost, OR hatch in your breeding area. (exclusive)
 *   [Inherited][On Deletion] Same effect.
 *
 * KB Q4713: delete opponent Digimon fires even if Koromon condition is not met.
 * KB Q5965: the [On Deletion] is an exclusive choice between playing the Tamer OR hatching.
 * KB Q2901/Q2902: the dynamic name grant makes this Digimon "have" the names of its Lv.3 or
 *   lower digivolution cards for all purposes.
 */

const cardId = "BT17-102";

const isTaiOrKari = (def: CardDefinition): boolean =>
  (def.kinds as string[]).includes("Tamer") &&
  (def.nameEn.includes("Tai Kamiya") || def.nameEn.includes("Kari Kamiya"));

async function resolveOnDeletion(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const tamerCandidates = Array.from(owner.hand)
    .filter((c: CardInstance) => isTaiOrKari(ctx.game.definitionOf(c)))
    .map((c: CardInstance) => c.instanceId);
  const canPlayTamer = tamerCandidates.length > 0;
  const canHatch = owner.breeding === undefined;

  // Both options available: exclusive choice.
  let playTamer: boolean;
  if (canPlayTamer && canHatch) {
    const choice = await ctx.ask.chooseOption(ctx, [
      "Play 1 Tamer with [Tai Kamiya] or [Kari Kamiya]",
      "Hatch in your breeding area",
    ]);
    playTamer = choice === 0;
  } else if (canPlayTamer) {
    playTamer = true;
  } else if (canHatch) {
    playTamer = false;
  } else {
    return;
  }

  if (playTamer) {
    const chosen = await ctx.ask.selectCards(ctx, {
      candidates: tamerCandidates,
      min: 0,
      max: 1,
    });
    if (chosen.length === 0) return;
    await ctx.fx.playInstances(chosen, { payCost: false });
  } else {
    ctx.fx.hatch(source.ownerSeat);
  }
}

export const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] If this Digimon's name is [Koromon], +3000 DP for the turn.
    // Then, delete 1 of your opponent's Digimon with as much or less DP.
    // KB Q4713: the delete fires even if the Koromon condition is not met.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-dp-delete`,
          description:
            "[When Digivolving] If this Digimon's name is [Koromon], it gains +3000 DP " +
            "for the turn. Then, delete 1 of your opponent's Digimon with as much or " +
            "less DP as this Digimon.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (!self) return;

            // If this Digimon's name is [Koromon], +3000 DP.
            if (self.topCard && ctx.game.definitionOf(self.topCard).nameEn === "Koromon") {
              ctx.fx.modifyDP(self.permanentId, 3000, EffectDuration.UntilEachTurnEnd);
            }

            // Delete 1 opponent's Digimon with as much or less DP as this Digimon.
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const oppPlayer = ctx.game.player(opponent);
            const selfDP = self.currentDP;
            const eligible = Array.from(oppPlayer.battleArea).filter(
              (p) =>
                p.topCard !== undefined &&
                (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon") &&
                p.currentDP <= selfDP,
            );
            if (eligible.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: eligible.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.deletePermanent(chosen);
            }
          },
        }),
      ];
    }

    // [All Turns] This Digimon has all names of level 3 or lower cards in its
    // digivolution cards. The provider is evaluated on every effective-name read,
    // so stack changes and Rule-name aliases remain live (KB Q2901-Q2903).
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/dynamic-stack-name-aliases`,
          description: "[All Turns] This Digimon has all the names of level 3 and lower cards in its digivolution cards.",
          isInherited: false,
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined || ctx.fx.grantDynamicNames === undefined) return;
            ctx.fx.grantDynamicNames(host.permanentId, () => {
              const current = source.permanent();
              if (current === undefined) return [];
              const names = Array.from(current.stack).flatMap((card) => {
                const def = ctx.game.definitionOf(card);
                return def.level !== undefined && def.level <= 3 ? effectiveStaticNames(def) : [];
              });
              return [...new Set(names)];
            }, EffectDuration.Permanent);
          },
        }),
      ];
    }

    // [On Deletion] You may play 1 Tamer with [Tai Kamiya] or [Kari Kamiya] in its name
    // from your hand without paying cost, OR hatch in your breeding area. (exclusive choice)
    // KB Q5965: exclusive choice between playing Tamer OR hatching.
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [
        onDeletion({
          source,
          effectKey: `${cardId}/on-deletion-tamer-or-hatch`,
          description:
            "[On Deletion] You may play 1 Tamer card with [Tai Kamiya] or [Kari Kamiya] in its " +
            "name from your hand without paying cost, or hatch in your breeding area.",
          optional: true,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const canPlayTamer = Array.from(owner.hand).some((c: CardInstance) =>
              isTaiOrKari(ctx.game.definitionOf(c)),
            );
            const canHatch = owner.breeding === undefined;
            return canPlayTamer || canHatch;
          },
          resolve: async (ctx) => resolveOnDeletion(ctx, source),
        }),
        onDeletion({
          source,
          effectKey: `${cardId}/inherited-on-deletion-tamer-or-hatch`,
          description:
            "[Inherited][On Deletion] You may play 1 Tamer card with [Tai Kamiya] or " +
            "[Kari Kamiya] in its name from your hand without paying cost, or hatch in " +
            "your breeding area.",
          optional: true,
          isInherited: true,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const canPlayTamer = Array.from(owner.hand).some((c: CardInstance) =>
              isTaiOrKari(ctx.game.definitionOf(c)),
            );
            const canHatch = owner.breeding === undefined;
            return canPlayTamer || canHatch;
          },
          resolve: async (ctx) => resolveOnDeletion(ctx, source),
        }),
      ];
    }

    return [];
  },
  // RESIDUAL: [All Turns] This Digimon has all the names of level 3 and lower cards in its
  // digivolution cards. rule implementation requires dynamic
  // digivolution-stack-driven name aliasing, not available with grantNameTrait (static tokens).
};

registerCard(module);
export default module;
