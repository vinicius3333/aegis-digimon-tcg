import { EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { staticModifier, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "P-074";

function isShamanOrWizard(definition: CardDefinition): boolean {
  return (definition.types ?? []).includes("Shaman") || (definition.types ?? []).includes("Wizard");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/security-for-evo-cost`,
          description: "[Your Turn] Trash up to 3 security to reduce a Shaman/Wizard digivolution by that amount.",
          when: () => source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldDigivolve",
              sourcePermanentId: self.permanentId,
              mode: "reduceCost",
              amount: 3,
              controllerSeat: source.ownerSeat,
              description: `${cardId}: trash up to 3 security for digivolution reduction`,
              appliesTo: (target) => target.permanentId === self.permanentId,
              intoMatches: isShamanOrWizard,
              activate: async (runtimeCtx) => {
                const securityCount = runtimeCtx.game.player(source.ownerSeat).security.length;
                const maximum = Math.min(3, securityCount);
                if (maximum === 0) return 0;
                const choice = await runtimeCtx.ask.chooseOption(
                  runtimeCtx,
                  Array.from({ length: maximum + 1 }, (_, count) => `Trash ${count} security`),
                );
                if (choice === 0) return 0;
                const trashed = await runtimeCtx.fx.trashFromSecurity(source.ownerSeat, choice, { fromTop: true });
                return trashed.length;
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/inherited-unsuspend-at-three-security`,
          description: "[When Attacking][Once Per Turn] At exactly 3 security, unsuspend this Digimon.",
          isInherited: true,
          maxPerTurn: 1,
          canActivate: (ctx) => ctx.game.player(source.ownerSeat).security.length === 3,
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host !== undefined) await ctx.fx.unsuspend([host.permanentId]);
          },
        }),
      ];
    }
    return [];
  },
};

registerCard(module);
export default module;
