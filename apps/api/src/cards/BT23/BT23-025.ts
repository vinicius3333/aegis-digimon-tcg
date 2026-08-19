import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { whenDigivolving, onPlay, activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// BT23-025 — Blue Lv.6 Digimon (BT23, MarineAngemon).
//
// Digivolve: 3 from Level 5 with [CS] trait
// [Hand] [Main] If you have a Digimon or Tamer with the [CS] trait, by paying 5 cost,
//   give 3 of your opponent's Digimon <Security A. -1> until their turn ends. Then,
//   place this card as the top security card.
// [On Play] Return 1 of your opponent's Digimon with the lowest level to the hand.
// [When Digivolving] Return 1 of your opponent's Digimon with the lowest level to the hand.
// [Security] Play this card without paying the cost.

const cardId = "BT23-025";

function oppLowestLevelDigimons(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));
  const digimons = Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard == null) return false;
    return isDigimon(ctx.game.definitionOf(p.topCard));
  });
  if (digimons.length === 0) return [];
  const minLevel = Math.min(...digimons.map((p) => ctx.game.definitionOf(p.topCard!).level ?? 99));
  return digimons.filter((p) => (ctx.game.definitionOf(p.topCard!).level ?? 99) === minLevel);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Hand] [Main] — use from hand
    if (timing === EffectTiming.OnUseOption) {
      return [
        activated({
          source,
          effectKey: `${cardId}/hand-main`,
          description:
            "[Hand] [Main] If you have a Digimon or Tamer with the [CS] trait, by paying 5 " +
            "cost, give 3 of your opponent's Digimon <Security A. -1> until their turn ends. " +
            "Then, place this card as the top security card.",
          optional: true,
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const mem = ctx.game.state.memory;
            const myMem = ctx.source.ownerSeat === 0 ? mem : -mem;
            if (myMem < 5) return false;
            /* was: if (owner.memory < 5) return false; */

            for (const p of owner.battleArea) {
              if (p.topCard == null) continue;
              const def = ctx.game.definitionOf(p.topCard);
              const traits = def.types ?? [];
              if (traits.includes("CS")) return true;
            }
            return false;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const opponent = ctx.game.player(ctx.game.opponentOf(source.ownerSeat));

            const oppDigimons = Array.from(opponent.battleArea).filter((p) => {
              return p.topCard != null && isDigimon(ctx.game.definitionOf(p.topCard));
            });

            const maxCount = Math.min(3, oppDigimons.length);
            if (maxCount > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, {
                candidates: oppDigimons.map((p) => p.permanentId),
                min: maxCount,
                max: maxCount,
              });
              for (const pid of chosen) {
                ctx.fx.grantKeyword(pid, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1);
              }
            }

            ctx.fx.gainMemory(-5);
            await ctx.fx.addSecurity(source.ownerSeat, [source.instanceId], { toTop: true });
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play`,
          description: "[On Play] Return 1 of your opponent's Digimon with the lowest level to the hand.",
          canActivate: (ctx) => oppLowestLevelDigimons(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = oppLowestLevelDigimons(ctx, source);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              const perm = ctx.game.permanentById(chosen[0]!);
              if (perm?.topCard) {
                await ctx.fx.returnToHand([perm.topCard.instanceId]);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description: "[When Digivolving] Return 1 of your opponent's Digimon with the lowest level to the hand.",
          canActivate: (ctx) => oppLowestLevelDigimons(ctx, source).length > 0,
          resolve: async (ctx) => {
            const targets = oppLowestLevelDigimons(ctx, source);
            if (targets.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, {
              candidates: targets.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (chosen.length > 0) {
              const perm = ctx.game.permanentById(chosen[0]!);
              if (perm?.topCard) {
                await ctx.fx.returnToHand([perm.topCard.instanceId]);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this Digimon without paying its memory cost.",
          resolve: async (ctx) => {
            ctx.fx.subscribeSubTrigger({
              event: "whenSecurityBattleEnded",
              sourceInstanceId: source.instanceId,
              once: true,
              expiresOnTurnEndOf: source.ownerSeat,
              description: "BT23-025: play this card at the end of the battle, then delete it at turn end",
              run: async (subCtx) => {
                const played = await subCtx.fx.playInstances([source.instanceId], { payCost: false });
                const permanentId = played[0]?.permanentId;
                if (permanentId !== undefined) subCtx.fx.delayedDeletePlayed?.(permanentId);
              },
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
