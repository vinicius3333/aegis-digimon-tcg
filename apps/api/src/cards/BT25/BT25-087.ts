import { CardKind, EffectTiming, isDigimon, type CardInstance } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/** BT25-087 Thomas H. Norstein — Q6409-Q6414. */
const cardId = "BT25-087";

function bottomFaceDownUnderTamers(ctx: EffectContext, source: CardSource): { hostId: string; card: CardInstance }[] {
  const result: { hostId: string; card: CardInstance }[] = [];
  for (const host of ctx.game.player(source.ownerSeat).battleArea) {
    if (host.topCard === undefined || !ctx.game.definitionOf(host.topCard).kinds.includes(CardKind.Tamer)) continue;
    const bottom = Array.from(host.stack).find((card) => card.faceUp !== true);
    if (bottom !== undefined) result.push({ hostId: host.permanentId, card: bottom });
  }
  return result;
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn)
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-memory`,
          description: "[Start of Your Turn] If you have 2 or less memory, set it to 3.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const memory =
              source.ownerSeat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
            return memory <= 2;
          },
          resolve: async (ctx) => ctx.fx.setMemory(3),
        }),
      ];

    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/opponent-hand-add-place-two`,
          description:
            "[All Turns] When effects add cards to your opponent's hand, suspend this Tamer to place top 2 deck cards face-down under it.",
          when: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenEffectAddsToOpponentHand",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: opponent hand add`,
              matches: (subCtx) => subCtx.trigger.effectAddedToHandSeat === subCtx.game.opponentOf(source.ownerSeat),
              run: async (subCtx) => {
                const current = source.permanent();
                if (current === undefined || current.isSuspended) return;
                if (!(await subCtx.ask.optional(subCtx, "Suspend this Tamer to place the top 2 deck cards under it?")))
                  return;
                if ((await subCtx.fx.suspend([current.permanentId])).length !== 1) return;
                const topCards = Array.from(subCtx.game.player(source.ownerSeat).deck).slice(0, 2);
                for (const card of topCards) card.faceUp = false;
                const topTwo = topCards.map((card) => card.instanceId);
                if (topTwo.length > 0)
                  await subCtx.fx.placeUnder(current.permanentId, topTwo, { belowTop: false, faceUp: false });
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/data-squad-digivolve-reducer`,
          description:
            "[Your Turn][Once Per Turn] Trash a bottom face-down Tamer card to reduce a DATA SQUAD digivolution by 1.",
          maxPerTurn: 1,
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeReplacement({
              event: "wouldDigivolve",
              sourcePermanentId: self.permanentId,
              mode: "reduceCost",
              amount: 1,
              controllerSeat: source.ownerSeat,
              description: `${cardId}: DATA SQUAD digivolution cost -1`,
              appliesTo: (target) => target.controllerSeat === source.ownerSeat && !target.inBreeding,
              intoMatches: (definition) => isDigimon(definition) && (definition.types ?? []).includes("DATA SQUAD"),
              activate: async (runtimeCtx) => {
                const candidates = bottomFaceDownUnderTamers(runtimeCtx, source);
                if (candidates.length === 0) return false;
                if (
                  !(await runtimeCtx.ask.optional(runtimeCtx, "Trash a bottom face-down card to reduce the cost by 1?"))
                )
                  return false;
                const chosen =
                  candidates.length === 1
                    ? candidates[0]
                    : candidates.find(({ hostId }) => hostId === runtimeCtx.game.permanentById(hostId)?.permanentId);
                let picked = chosen;
                if (candidates.length > 1) {
                  const host = (
                    await runtimeCtx.ask.chooseTargets(runtimeCtx, {
                      candidates: candidates.map((c) => c.hostId),
                      min: 1,
                      max: 1,
                    })
                  )[0];
                  picked = candidates.find((candidate) => candidate.hostId === host);
                }
                if (picked === undefined) return false;
                return (
                  (await runtimeCtx.fx.trashDigivolutionCards(picked.hostId, [picked.card.instanceId])).length === 1
                );
              },
            });
          },
        }),
      ];

    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card free.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(source.instanceId, { payCost: false });
          },
        }),
      ];
    return [];
  },
};

registerCard(module);
export default module;
