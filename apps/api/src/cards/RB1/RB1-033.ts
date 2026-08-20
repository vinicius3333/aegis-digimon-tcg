import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, whenAttacking, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * RB1-033 — Kiyoshiro Higashimitarai (RB1, Blue Tamer).
 *
 *
 * Authoritative text:
 *   [All Turns] When one of your Digimon with [Jellymon] in its text or an opponent's
 *     level 5 or higher Digimon attacks, if you have 7 or fewer cards in your hand,
 *     by suspending this Tamer, ＜Draw 1＞.
 *   [Your Turn] When this Tamer becomes unsuspended, gain 1 memory.
 *   [Security] Play this Tamer without paying its memory cost.
 *
 *   EffectTiming.OnAllyAttack (×2): first triggers on own Jellymon-text Digimon attacking;
 *     second triggers on opponent's Lv.5+ Digimon attacking. Both guard: IsExistOnBattleArea
 *     && CanActivateSuspendCostEffect && hand <= 7. Both pay SuspendPermanents(this), Draw 1.
 *     (documented behavior — two rule implementation blocks)
 *   EffectTiming.OnUnTappedAnyone: when THIS Tamer is unsuspended on owner's turn,
 *     gain 1 memory.
 *   EffectTiming.SecuritySkill: play self free. (documented behavior)
 *
 */
const cardId = "RB1-033";

const hasJellymonText = (def: CardDefinition): boolean =>
  def.nameEn.includes("Jellymon") || (def.effectText as string | undefined)?.includes("Jellymon") === true;

const hasLevel5OrHigher = (def: CardDefinition): boolean => def.level !== undefined && def.level >= 5;

const attackerPermanentInPlay = (ctx: EffectContext, source: CardSource): Permanent | undefined => {
  const attackerId = ctx.trigger?.attackerPermanentId;
  if (!attackerId) return undefined;
  for (const ownerSeat of [source.ownerSeat, ctx.game.opponentOf(source.ownerSeat)] as const) {
    for (const p of ctx.game.player(ownerSeat).battleArea) {
      if (p.permanentId === attackerId) return p;
    }
  }
  return undefined;
};

const isOwnJellymonAttacking = (ctx: EffectContext, source: CardSource): boolean => {
  const attacker = attackerPermanentInPlay(ctx, source);
  if (!attacker) return false;
  if (attacker.controllerSeat !== source.ownerSeat) return false;
  if (!attacker.topCard) return false;
  return isDigimon(ctx.game.definitionOf(attacker.topCard)) && hasJellymonText(ctx.game.definitionOf(attacker.topCard));
};

const isOpponentLv5PlusAttacking = (ctx: EffectContext, source: CardSource): boolean => {
  const attacker = attackerPermanentInPlay(ctx, source);
  if (!attacker) return false;
  if (attacker.controllerSeat === source.ownerSeat) return false;
  if (!attacker.topCard) return false;
  return (
    isDigimon(ctx.game.definitionOf(attacker.topCard)) && hasLevel5OrHigher(ctx.game.definitionOf(attacker.topCard))
  );
};

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [All Turns] When own Jellymon-text Digimon OR opponent's Lv.5+ Digimon attacks,
    // if hand ≤ 7, by suspending this Tamer: Draw 1.
    if (timing === EffectTiming.OnAllyAttack) {
      const resolveSuspendDraw = async (ctx: EffectContext): Promise<void> => {
        const self = source.permanent?.();
        if (self === undefined) return;
        await ctx.fx.suspend([self.permanentId]);
        await ctx.fx.draw(source.ownerSeat, 1);
      };
      const commonDescription =
        "[All Turns] When one of your Digimon with [Jellymon] in its text or an opponent's " +
        "level 5 or higher Digimon attacks, if you have 7 or fewer cards in your hand, by " +
        "suspending this Tamer, ＜Draw 1＞.";
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/all-turns-attack-suspend-draw`,
          description: commonDescription,
          attackScope: "ally",
          optional: true,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            return isOwnJellymonAttacking(ctx, source);
          },
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const hand = Array.from(ctx.game.player(source.ownerSeat).hand);
            if (hand.length > 7) return false;
            const self = source.permanent?.();
            return self !== undefined && !self.isSuspended;
          },
          resolve: resolveSuspendDraw,
        }),
        whenAttacking({
          source,
          effectKey: `${cardId}/all-turns-opponent-attack-suspend-draw`,
          description: commonDescription,
          attackScope: "opponent",
          optional: true,
          when: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            return isOpponentLv5PlusAttacking(ctx, source);
          },
          canActivate: (ctx) => {
            if (!source.isOnBattleArea()) return false;
            const hand = Array.from(ctx.game.player(source.ownerSeat).hand);
            if (hand.length > 7) return false;
            const self = source.permanent?.();
            return self !== undefined && !self.isSuspended;
          },
          resolve: resolveSuspendDraw,
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

    // [Your Turn] When this Tamer becomes unsuspended, gain 1 memory.
    if (timing === EffectTiming.OnUnTappedAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/on-unsuspend-memory`,
          description: "[Your Turn] When this Tamer becomes unsuspended, gain 1 memory.",
          when: (ctx) =>
            source.isOnBattleArea() &&
            source.isOwnersTurn() &&
            ctx.trigger?.unsuspendedPermanentId === source.permanent()?.permanentId,
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
