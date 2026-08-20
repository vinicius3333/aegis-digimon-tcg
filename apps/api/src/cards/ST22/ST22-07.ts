import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, onPlay, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST22-07";

function hasOnmyoOrPlugin(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Onmyōjutsu" || t === "Plug-In");
}

function isRenamonLine(def: CardDefinition): boolean {
  const names = ["Renamon", "Kyubimon", "Taomon", "Sakuyamon"];
  return names.some((n) => def.nameEn.includes(n));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main`,
          description:
            "[Start of Your Main Phase] By placing 1 Option card with the [Onmyōjutsu] or " +
            "[Plug-In] trait from your hand under this Tamer, ＜Draw 1＞ and gain 1 memory.",
          optional: true,
          when: (ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.hand).filter((c) =>
              hasOnmyoOrPlugin(ctx.game.definitionOf(c)),
            );
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;
            const self = source.permanent();
            if (self !== undefined) {
              await ctx.fx.placeUnder(self.permanentId, chosen);
              ctx.fx.draw(source.ownerSeat, 1);
              // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
              // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
              // Tamer's owner explicitly rather than the turn player.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description:
            "[On Play] By placing 1 Option card with the [Onmyōjutsu] or [Plug-In] trait " +
            "from your hand under this Tamer, ＜Draw 1＞ and gain 1 memory.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(owner.hand).filter((c) =>
              hasOnmyoOrPlugin(ctx.game.definitionOf(c)),
            );
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length === 0) return;
            const self = source.permanent();
            if (self !== undefined) {
              await ctx.fx.placeUnder(self.permanentId, chosen);
              ctx.fx.draw(source.ownerSeat, 1);
              ctx.fx.gainMemory(1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/attack-trigger`,
          description:
            "[Your Turn] When one of your Digimon with [Renamon], [Kyubimon], [Taomon] or " +
            "[Sakuyamon] in its name attacks, by suspending this Tamer, you may use 1 " +
            "[Onmyōjutsu] or [Plug-In] trait Option card from under this Tamer without paying the cost.",
          when: (ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenAttacking",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Renamon-line attacks, use Onmyo/Plug-In from under.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const attackerId = subCtx.trigger?.attackerPermanentId;
                if (attackerId === undefined) return false;
                const attacker = subCtx.game.permanentById(attackerId);
                if (attacker === undefined || attacker.topCard === undefined) return false;
                if (attacker.controllerSeat !== source.ownerSeat) return false;
                return isRenamonLine(subCtx.game.definitionOf(attacker.topCard));
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                const attackerId = subCtx.trigger?.attackerPermanentId;
                const attacker = attackerId === undefined ? undefined : subCtx.game.permanentById(attackerId);
                const attackerLevel = attacker?.topCard === undefined ? 0 : (subCtx.game.definitionOf(attacker.topCard).level ?? 0);
                const optionCards = selfPerm.stack.filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return hasOnmyoOrPlugin(def) && (def.playCost ?? 99) <= attackerLevel;
                });
                if (optionCards.length > 0) {
                  const chosen = await subCtx.ask.selectCards(subCtx, {
                    candidates: optionCards.map((c) => c.instanceId),
                    min: 0,
                    max: 1,
                  });
                  if (chosen.length > 0) {
                    const optionCost = subCtx.game.definitionOf(
                      selfPerm.stack.find((card) => card.instanceId === chosen[0]!)!,
                    ).playCost;
                    await subCtx.fx.useOptionFromHand(subCtx, chosen[0]!, optionCost);
                  }
                }
              },
            });
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
