import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX9-069";

function hasDM(def: CardDefinition): boolean {
  return isDigimon(def) && (def.types ?? []).includes("DM");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-place-under`,
          description:
            "[Start of Your Main Phase] You may place 1 card from your hand at the bottom of " +
            "the digivolution cards of 1 of your Digimon with the [DM] trait.",
          optional: true,
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            return owner.hand.length > 0;
          },
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            if (owner.hand.length === 0) return;
            const dmDigimon = Array.from(owner.battleArea)
              .filter((p) => p.topCard !== undefined && hasDM(ctx.game.definitionOf(p.topCard)));
            if (dmDigimon.length === 0) return;
            const hostChosen = await ctx.ask.chooseTargets(ctx, {
              candidates: dmDigimon.map((p) => p.permanentId),
              min: 1,
              max: 1,
            });
            if (hostChosen.length === 0) return;
            const cardChosen = await ctx.ask.selectCards(ctx, {
              candidates: Array.from(owner.hand).map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (cardChosen.length > 0) {
              await ctx.fx.placeUnder(hostChosen[0]!, cardChosen);
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-when-placed`,
          description:
            "[Your Turn] When one of your Digimon has a card placed in its digivolution cards, " +
            "by suspending this Tamer, gain 1 memory. Then, if you have 7 or fewer cards in " +
            "your hand, <Draw 1>.",
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onAddDigivolutionCards",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When card placed in digivolution, suspend + gain memory + draw.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined) return false;
                if (!Array.from(subCtx.game.player(source.ownerSeat).battleArea).some((p) => p.permanentId === subjectId)) return false;
                return subject.controllerSeat === source.ownerSeat;
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                subCtx.fx.gainMemory(1);
                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.hand.length <= 7) {
                  subCtx.fx.draw(source.ownerSeat, 1);
                }
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/opponents-turn-reboot`,
          description:
            "[Opponent's Turn] All of your Digimon gain ＜Reboot＞ until the end of your " +
            "opponent's turn.",
          when: (_ctx) => source.isOnBattleArea() && !source.isOwnersTurn(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            for (const p of owner.battleArea) {
              if (
                p.topCard !== undefined &&
                isDigimon(ctx.game.definitionOf(p.topCard)) &&
                Array.from(p.stack).some((card) => card.faceUp !== true)
              ) {
                ctx.fx.grantKeyword(p.permanentId, "Reboot", EffectDuration.UntilOpponentTurnEnd);
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
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying its memory cost.",
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
