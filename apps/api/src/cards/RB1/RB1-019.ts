import { EffectTiming, EffectDuration, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { whenDigivolving, whenAttacking } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "RB1-019";

function hasNumemon(def: CardDefinition): boolean {
  return def.nameEn.includes("Numemon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving`,
          description:
            "[When Digivolving] Place all Lv3 Digimon face down on top of their owners' " +
            "security stacks. Then, all opponent Lv4+ Digimon get -3000 DP and " +
            "＜Security Attack -1＞ until end of their turn.",
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const mySeat = source.ownerSeat;
            const opponent = ctx.game.opponentOf(mySeat);
            const ownPlayer = ctx.game.player(mySeat);
            const oppPlayer = ctx.game.player(opponent);

            const ownLv3 = Array.from(ownPlayer.battleArea)
              .filter((p) => p.topCard !== undefined && (ctx.game.definitionOf(p.topCard).level ?? 99) === 3);
            for (const p of ownLv3) {
              if (p.topCard !== undefined) {
                await ctx.fx.addSecurity(mySeat, [p.topCard.instanceId], { toTop: true, faceUp: false });
              }
            }
            const oppLv3 = Array.from(oppPlayer.battleArea)
              .filter((p) => p.topCard !== undefined && (ctx.game.definitionOf(p.topCard).level ?? 99) === 3);
            for (const p of oppLv3) {
              if (p.topCard !== undefined) {
                await ctx.fx.addSecurity(opponent, [p.topCard.instanceId], { toTop: true, faceUp: false });
              }
            }

            const oppLv4Plus = Array.from(oppPlayer.battleArea)
              .filter((p) => p.topCard !== undefined && (ctx.game.definitionOf(p.topCard).level ?? 99) >= 4);
            for (const p of oppLv4Plus) {
              ctx.fx.modifyDP(p.permanentId, -3000, EffectDuration.UntilOpponentTurnEnd);
              ctx.fx.grantKeyword(p.permanentId, "SecurityAttack", EffectDuration.UntilOpponentTurnEnd, -1);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/when-attacking`,
          description:
            "[When Attacking] By trashing 1 card with [Numemon] in its name from this Digimon's " +
            "digivolution cards, place 1 of your opponent's Digimon face down at the bottom of " +
            "their security stack.",
          optional: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (self === undefined) return false;
            return self.stack.some((c) => hasNumemon(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const numemon = self.stack.filter((c) => hasNumemon(ctx.game.definitionOf(c)));
            if (numemon.length === 0) return;
            const toTrash = await ctx.ask.selectCards(ctx, {
              candidates: numemon.map((c) => c.instanceId),
              min: 1,
              max: 1,
            });
            if (toTrash.length === 0) return;
            ctx.fx.trash(toTrash);
            const opponent = ctx.game.opponentOf(source.ownerSeat);
            const opp = ctx.game.player(opponent);
            const targets = Array.from(opp.battleArea)
              .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (targets.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
              if (chosen.length > 0) {
                const perm = ctx.game.permanentById(chosen[0]!);
                if (perm !== undefined && perm.topCard !== undefined) {
                  await ctx.fx.addSecurity(opponent, [perm.topCard.instanceId], { toTop: false });
                }
              }
            }
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
