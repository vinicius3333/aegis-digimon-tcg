import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT10-041";

function isEligibleOption(def: CardDefinition): boolean {
  if (!(def.kinds as string[]).includes(CardKind.Option as string)) return false;
  if (def.nameEn?.includes("Plug-In")) return true;
  const colors = (def.colors as string[] | undefined) ?? [];
  if (colors.includes("Yellow") && def.playCost !== undefined && def.playCost <= 5) return true;
  return false;
}

function optionCandidates(ctx: EffectContext, ownerSeat: 0 | 1): CardInstance[] {
  return Array.from(ctx.game.player(ownerSeat).hand).filter((c) =>
    isEligibleOption(ctx.game.definitionOf(c)),
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    const ownerSeat = source.ownerSeat as 0 | 1;

    // [When Digivolving] Use 1 eligible Option from hand without cost; place on security instead of trash.
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-use-option-to-security`,
          description:
            "[When Digivolving] You may use 1 Option card with [Plug-In] in its name or that's yellow and " +
            "has a memory cost of 5 or less from your hand without meeting its color requirements or paying " +
            "its memory cost. Place the Option card used with this effect on top of your security stack " +
            "face down instead of placing it in your trash.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return optionCandidates(ctx, ownerSeat).length > 0;
          },
          resolve: async (ctx) => {
            const candidates = optionCandidates(ctx, ownerSeat);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            const chosenCard = candidates.find((c) => c.instanceId === chosen[0]!);
            const originalCost = chosenCard
              ? ctx.game.definitionOf(chosenCard).playCost
              : undefined;

            // Run the option's effect and trash it normally. useOptionFromHand moves the card
            // to trash and fires whenOptionUsed.
            await ctx.fx.useOptionFromHand(ctx, chosen[0]!, originalCost);

            // After use, the card is in trash. Move it to the top of owner's security stack
            // face down. Per KB Q1960-Q5451, if the card
            // is no longer in trash (placed in battle area, linked, etc.) the security-add is skipped.
            const ownerPlayer = ctx.game.player(ownerSeat);
            const isInTrash = ownerPlayer.trash.some((c) => c.instanceId === chosen[0]!);
            if (isInTrash) {
              await ctx.fx.addSecurity(ownerSeat, [chosen[0]!], { toTop: true });
            }
          },
        }),
      ];
    }

    // [When Attacking] Digivolve into [Sakuyamon] from hand for cost 1, ignoring requirements.
    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-digivolve-sakuyamon`,
          description:
            "[When Attacking] This Digimon may digivolve into a [Sakuyamon] in your hand for a cost of 1, " +
            "ignoring its digivolution requirements.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const hand = ctx.game.player(ownerSeat).hand;
            return hand.some((c) => ctx.game.definitionOf(c).nameEn?.includes("Sakuyamon"));
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent?.();
            if (perm === undefined) return;

            const hand = ctx.game.player(ownerSeat).hand;
            const candidates = hand
              .filter((c) => ctx.game.definitionOf(c).nameEn?.includes("Sakuyamon"))
              .map((c) => c.instanceId);
            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;

            await ctx.fx.digivolveFromInstance(perm.permanentId, chosen[0]!, {
              payCost: true,
              costOverride: 1,
              ignoreRequirements: true,
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
