import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, whenDigivolving, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-057";

async function pickAndGrantEndOfTurnDelete(
  source: CardSource,
  ctx: Parameters<NonNullable<Parameters<typeof onPlay>[0]["resolve"]>>[0],
): Promise<void> {
  const opponent = ctx.game.opponentOf(source.ownerSeat);
  const oppPlayer = ctx.game.player(opponent);
  const candidates = Array.from(oppPlayer.battleArea)
    .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (candidates.length === 0) return;

  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
  if (chosen.length === 0) return;
  const targetId = chosen[0]!;

  ctx.fx.subscribeSubTrigger({
    event: "endOfTurn",
    sourcePermanentId: targetId,
    once: true,
    expiresOnTurnEndOf: opponent,
    description: `${cardId}: [End of Your Turn] Delete this Digimon.`,
    matches: (subCtx) => subCtx.game.state.turnSeat === opponent,
    run: async (subCtx) => {
      const target = subCtx.game.permanentById(targetId);
      if (target !== undefined) {
        await subCtx.fx.deletePermanent([targetId]);
      }
    },
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-end-delete`,
          description:
            "[On Play] Until the end of your opponent's turn, 1 of your opponent's Digimon " +
            'gains "[End of Your Turn] Delete this Digimon."',
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opp = ctx.game.opponentOf(source.ownerSeat);
            return Array.from(ctx.game.player(opp).battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            await pickAndGrantEndOfTurnDelete(source, ctx);
          },
        }),
        whenDigivolving({
          source,
          effectKey: `${cardId}/when-digivolving-end-delete`,
          description:
            "[When Digivolving] Until the end of your opponent's turn, 1 of your opponent's " +
            'Digimon gains "[End of Your Turn] Delete this Digimon."',
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const opp = ctx.game.opponentOf(source.ownerSeat);
            return Array.from(ctx.game.player(opp).battleArea).some(
              (p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            await pickAndGrantEndOfTurnDelete(source, ctx);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/self-protection`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon would leave the battle area other " +
            "than in battle, by deleting 1 level 5 or lower Digimon, prevent it from leaving.",
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: self.permanentId,
              mode: "prevent",
              oncePerTurnKey: `${cardId}/self-protect`,
              description:
                "[All Turns] [Once Per Turn] Prevent this Digimon from leaving by deleting 1 lv5 or lower Digimon.",
              protects: (_subCtx, leavingId) => leavingId === self.permanentId,
              preventCheck: async (subCtx) => {
                const currentSelf = subCtx.game.permanentById(self.permanentId);
                if (currentSelf === undefined) return false;
                const allPlayers = [subCtx.game.player(0), subCtx.game.player(1)];
                const lv5Candidates: string[] = [];
                for (const player of allPlayers) {
                  for (const p of player.battleArea) {
                    if (p.topCard !== undefined) {
                      const def = subCtx.game.definitionOf(p.topCard);
                      if (isDigimon(def) && (def.level ?? 99) <= 5) {
                        lv5Candidates.push(p.permanentId);
                      }
                    }
                  }
                }
                if (lv5Candidates.length === 0) return false;
                const yes = await subCtx.ask.optional(
                  subCtx,
                  "Delete 1 level 5 or lower Digimon to prevent this Digimon from leaving?",
                );
                if (!yes) return false;
                const toDelete = await subCtx.ask.chooseTargets(subCtx, {
                  candidates: lv5Candidates,
                  min: 1,
                  max: 1,
                });
                if (toDelete.length === 0) return false;
                const deleted = await subCtx.fx.deletePermanent(toDelete);
                return deleted > 0;
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/opp-turn-delete-trash`,
          description:
            "[Opponent's Turn] [Once Per Turn] When another Digimon is deleted, trash the top " +
            "card of your opponent's security stack.",
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea() && !source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            const _opponent = ctx.game.opponentOf(source.ownerSeat);
            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: self.permanentId,
              once: false,
              oncePerTiming: true,
              oncePerTurnKey: `${cardId}/opp-turn-delete-trash`,
              description: `${cardId}: When another Digimon is deleted, trash top opponent security.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                if (subjectId === self.permanentId) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                return isDigimon(subCtx.game.definitionOf(subject.topCard));
              },
              run: async (subCtx) => {
                await subCtx.fx.trashFromSecurity(ctx.game.opponentOf(source.ownerSeat), 1, { fromTop: true });
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
