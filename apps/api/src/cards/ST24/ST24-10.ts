import { CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, CardInstance, Permanent, Seat } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, staticModifier, whenAttacking, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "ST24-10";
const DATA_SQUAD = "DATA SQUAD";

function isTamer(ctx: EffectContext, permanent: Permanent): boolean {
  return permanent.topCard !== undefined && ctx.game.definitionOf(permanent.topCard).kinds.includes(CardKind.Tamer);
}

function bottomFaceDownCardsUnderTamers(ctx: EffectContext, ownerSeat: Seat): { hostId: string; card: CardInstance }[] {
  return ctx.game
    .player(ownerSeat)
    .battleArea.filter((permanent) => isTamer(ctx, permanent))
    .flatMap((permanent) => {
      // The bottom cards are the cards at the bottom of each Tamer's stack. They may
      // come from the same Tamer, so expose the contiguous face-down prefix rather
      // than only the single bottom card (ST24-10 can trash two from one Tamer).
      return permanent.stack
        .slice(0, permanent.stack.findIndex((card) => card.faceUp === true) < 0
          ? permanent.stack.length
          : permanent.stack.findIndex((card) => card.faceUp === true))
        .filter((card) => card.faceUp !== true)
        .map((card) => ({ hostId: permanent.permanentId, card }));
    });
}

async function trashBottomFaceDownCards(ctx: EffectContext, ownerSeat: Seat, amount: number): Promise<boolean> {
  const candidates = bottomFaceDownCardsUnderTamers(ctx, ownerSeat);
  if (candidates.length < amount) return false;

  const chosenIds =
    candidates.length === amount
      ? candidates.map(({ card }) => card.instanceId)
      : await ctx.ask.selectCards(ctx, {
          candidates: candidates.map(({ card }) => card.instanceId),
          min: amount,
          max: amount,
        });
  if (chosenIds.length !== amount) return false;

  const byHost = new Map<string, string[]>();
  for (const id of chosenIds) {
    const candidate = candidates.find(({ card }) => card.instanceId === id);
    if (candidate === undefined) return false;
    const ids = byHost.get(candidate.hostId) ?? [];
    ids.push(id);
    byHost.set(candidate.hostId, ids);
  }
  for (const [hostId, ids] of byHost) {
    const host = ctx.game.permanentById(hostId);
    if (host === undefined || host.stack[0]?.instanceId !== ids[0]) return false;
  }

  let trashed = 0;
  for (const [hostId, ids] of byHost) {
    trashed += (await ctx.fx.trashDigivolutionCards(hostId, ids, { byEffectSeat: ownerSeat })).length;
  }
  return trashed === amount;
}

function isDataSquad(definition: CardDefinition | undefined): boolean {
  return definition?.types?.includes(DATA_SQUAD) === true;
}

function dataSquadDigimonInHand(ctx: EffectContext, ownerSeat: Seat): CardInstance[] {
  return ctx.game.player(ownerSeat).hand.filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return definition.kinds.includes(CardKind.Digimon) && isDataSquad(definition);
  });
}

async function suspendAndMaybeDigivolve(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponentSeat = ctx.game.opponentOf(source.ownerSeat);
  const targets = ctx.game.player(opponentSeat).battleArea
    .filter((permanent) => permanent.topCard !== undefined)
    .filter((permanent) => {
      const kind = ctx.game.definitionOf(permanent.topCard!).kinds;
      return kind.includes(CardKind.Digimon) || kind.includes(CardKind.Tamer);
    })
    .map((permanent) => permanent.permanentId);

  if (targets.length > 0) {
    const chosen = await ctx.ask.chooseTargets(ctx, { candidates: targets, min: 1, max: 1 });
    if (chosen.length > 0) {
      await ctx.fx.suspend(chosen);
      ctx.fx.restrict(chosen[0]!, "unsuspend", EffectDuration.UntilOpponentTurnEnd);
    }
  }

  const host = source.permanent();
  if (host === undefined) return;
  const candidates = dataSquadDigimonInHand(ctx, source.ownerSeat);
  if (candidates.length === 0 || bottomFaceDownCardsUnderTamers(ctx, source.ownerSeat).length < 2) return;
  if (!(await ctx.ask.optional(ctx, "Trash 2 bottom face-down cards under your Tamers to digivolve for free?"))) return;

  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((card) => card.instanceId),
    min: 1,
    max: 1,
  });
  if (chosen.length === 0) return;
  if (!(await trashBottomFaceDownCards(ctx, source.ownerSeat, 2))) return;

  await ctx.fx.digivolveFromInstance(host.permanentId, chosen[0]!, {
    payCost: false,
    ignoreRequirements: true,
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/suspend-and-free-data-squad-digivolve`,
          description:
            "[On Play] Suspend 1 of your opponent's Digimon or Tamers. It can't unsuspend until their turn ends. " +
            "Then, by trashing 2 bottom face-down cards from under any of your Tamers, this Digimon may digivolve " +
            "into a [DATA SQUAD] trait Digimon card in the hand without paying the cost.",
          resolve: async (ctx) => suspendAndMaybeDigivolve(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.WhenDigivolving) {
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/suspend-and-free-data-squad-digivolve`,
          description: "[When Digivolving] Suspend 1 opposing Digimon or Tamer, then optionally digivolve for free.",
          resolve: async (ctx) => suspendAndMaybeDigivolve(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.OnUseAttack) {
      return [
        whenAttacking({
          source,
          effectKey: `${cardId}/suspend-and-free-data-squad-digivolve`,
          description: "[When Attacking] Suspend 1 opposing Digimon or Tamer, then optionally digivolve for free.",
          maxPerTurn: 1,
          resolve: async (ctx) => suspendAndMaybeDigivolve(ctx, source),
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-leave-prevention`,
          description:
            "[All Turns] [Once Per Turn] When this Digimon with [Rosemon] in its name or [DATA SQUAD] trait would leave, " +
            "by trashing the bottom face-down card from under any of your Tamers, it doesn't leave.",
          isInherited: true,
          maxPerTurn: 1,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = source.permanent();
            if (host === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldLeavePlay",
              sourcePermanentId: host.permanentId,
              mode: "prevent",
              oncePerTurnKey: `${cardId}/inherited-leave-prevention`,
              description: "Trash the bottom face-down card under a Tamer to keep this Digimon in play.",
              protects: (subCtx, leavingId) => {
                if (leavingId !== host.permanentId) return false;
                const leaving = subCtx.game.permanentById(leavingId);
                if (leaving?.topCard === undefined) return false;
                const definition = subCtx.game.definitionOf(leaving.topCard);
                return definition.nameEn.includes("Rosemon") || isDataSquad(definition);
              },
              preventCheck: async (subCtx) => {
                if (!(await subCtx.ask.optional(subCtx, "Trash the bottom face-down card under a Tamer to prevent this Digimon from leaving?"))) return false;
                return trashBottomFaceDownCards(subCtx, source.ownerSeat, 1);
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
