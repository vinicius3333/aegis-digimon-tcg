import { CardKind, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, digivolveCostStatic } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * BT7-040 — Rasenmon (BT7, Yellow Lv.6 Digimon).
 *
 *
 *   EffectTiming.None (hand-resident) → digivolveCostStatic:
 *     when digivolving into this card from your hand, the digivolution cost is set to
 *     your security count (minimum 1). KB Q1568: the SET base is computed first;
 *     other reduction effects then subtract from it.
 *   EffectTiming.OnDeclaration (OncePerTurn) → activated:
 *     [Main] <Digi-Burst up to 4> trash 1..4 of this Digimon's digivolution cards,
 *     then 1 opponent Digimon gets -3000 DP per card actually trashed for the turn.
 *     KB Q1569: at least 1 card must be trashed. KB Q1570: exactly 1 target.
 */

const cardId = "BT7-040";

function opponentDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const opponent = ctx.game.player(opponentSeat);
  return Array.from(opponent.battleArea).filter((p) => {
    if (p.topCard === undefined) return false;
    return isDigimon(ctx.game.definitionOf(p.topCard));
  });
}

function ownStackInstanceIds(source: CardSource): string[] {
  const self = source.permanent();
  if (!self) return [];
  return self.stack.map((c) => c.instanceId);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // Static: digivolve cost = security count (floor 1), hand-resident only.
    if (timing === EffectTiming.None) {
      return [
        digivolveCostStatic({
          source,
          effectKey: `${cardId}/evo-cost-equals-security`,
          description:
            "When digivolving into this card from your hand, the digivolution cost is " +
            "equal to the number of cards in your security stack.",
          optional: false,
          when: (ctx) => {
            const hand = ctx.game.player(ctx.source.ownerSeat).hand;
            return hand.some((c) => c.instanceId === ctx.source.instanceId);
          },
          resolve: async (ctx) => {
            let count = ctx.game.player(source.ownerSeat).security.length;
            if (count <= 0) count = 1;
            ctx.fx.changeEvoCost(
              ({ target, into }) => {
                if (target.controllerSeat !== source.ownerSeat) return false;
                if (into === undefined) return false;
                return into.cardId === source.cardId;
              },
              count,
              { setFixed: true },
            );
          },
        }),
      ];
    }

    // [Main] <Digi-Burst up to 4>: trash digivolution cards, -3000 DP per card to opponent.
    if (timing === EffectTiming.OnDeclaration) {
      return [
        activated({
          source,
          effectKey: `${cardId}/digi-burst-dp-minus`,
          description:
            "[Main] <Digi-Burst up to 4> Trash up to 4 of this Digimon's digivolution " +
            "cards. Then, 1 of your opponent's Digimon gets -3000 DP for each card trashed " +
            "this way for the turn.",
          optional: false,
          maxPerTurn: 1,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const self = source.permanent();
            if (!self) return false;
            return self.stack.length >= 1;
          },
          resolve: async (ctx) => {
            const self = source.permanent();
            if (!self) return;

            const stackIds = ownStackInstanceIds(source);
            if (stackIds.length === 0) return;

            // DigiBurst: select up to 4 digivolution cards to trash (at least 1)
            const maxTrash = Math.min(4, stackIds.length);
            const toTrash = await ctx.ask.selectCards(ctx, {
              candidates: stackIds,
              min: 1,
              max: maxTrash,
            });
            if (toTrash.length === 0) return;

            // Trash selected digivolution cards
            await ctx.fx.trashDigivolutionCards(self.permanentId, toTrash, {
              byEffectSeat: source.ownerSeat,
              byEffectCardId: source.cardId,
              isDigiBurst: true,
            });

            const trashedCount = toTrash.length;
            const minusDP = 3000 * trashedCount;

            // Target 1 opponent Digimon
            const opponents = opponentDigimon(ctx, source);
            if (opponents.length === 0) return;

            const opponentIds = opponents.map((p) => p.permanentId);
            const chosen =
              opponentIds.length === 1
                ? [opponentIds[0]!]
                : await ctx.ask.chooseTargets(ctx, {
                    candidates: opponentIds,
                    min: 1,
                    max: 1,
                  });
            if (chosen.length === 0) return;

            for (const id of chosen) {
              ctx.fx.modifyDP(id, -minusDP, EffectDuration.UntilEachTurnEnd);
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
