import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST12-08";

const hasRoyalKnight = (def: CardDefinition): boolean => {
  const types = def.types as string[] | undefined;
  return types?.includes("Royal Knight") ?? false;
};

const isSistermon = (def: CardDefinition): boolean =>
  isDigimon(def) && def.nameEn.includes("Sistermon");

function sistermonCandidates(ctx: EffectContext, source: CardSource): string[] {
  const owner = ctx.game.player(source.ownerSeat);
  const ids: string[] = [];
  for (const c of owner.hand) {
    if (isSistermon(ctx.game.definitionOf(c))) ids.push(c.instanceId);
  }
  for (const c of owner.trash) {
    if (isSistermon(ctx.game.definitionOf(c))) ids.push(c.instanceId);
  }
  return ids;
}

function attackerHasRoyalKnight(ctx: EffectContext, source: CardSource): boolean {
  const self = source.permanent?.();
  if (!self || !self.topCard) return false;
  return hasRoyalKnight(ctx.game.definitionOf(self.topCard));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [When Digivolving] This Digimon may also attack opponent's unsuspended Digimon
    // for the turn (grantCanAttackUnsuspended UntilEachTurnEnd).
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-attack-unsuspended`,
          description:
            "[When Digivolving] This Digimon may also attack your opponent's unsuspended " +
            "Digimon for the turn.",
          optional: false,
          resolve: async (ctx) => {
            const self = source.permanent?.();
            if (self === undefined) return;
            ctx.fx.grantCanAttackUnsuspended(self.permanentId, EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [When Attacking][Inherited][Once Per Turn] If Royal Knight in traits, play 1
    // Sistermon from hand or trash free.
    if (timing === EffectTiming.OnAllyAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking-inherited-play-sistermon`,
          description:
            "[When Attacking][Inherited][Once Per Turn] If this Digimon has [Royal Knight] in " +
            "its traits, you may play 1 Digimon card with [Sistermon] in its name from your " +
            "hand or trash without paying its memory cost.",
          optional: true,
          isInherited: true,
          maxPerTurn: 1,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            return attackerHasRoyalKnight(ctx, source);
          },
          canActivate: (ctx) => {
            if (!attackerHasRoyalKnight(ctx, source)) return false;
            return sistermonCandidates(ctx, source).length > 0;
          },
          resolve: async (ctx) => {
            const candidates = sistermonCandidates(ctx, source);
            if (candidates.length === 0) return;
            const [chosen] = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });
            if (chosen === undefined) return;
            await ctx.fx.playInstances([chosen], { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
