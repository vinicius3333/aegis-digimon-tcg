import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX9-068";

function hasCyborgOrMachineOrDM(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Cyborg" || t === "Machine" || t === "DM");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description:
            "[Start of Your Turn] If you have 2 or less memory, set your memory to 3.",
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/your-turn-digimon-played`,
          description:
            "[Your Turn] When a Digimon with the [Cyborg], [Machine], or [DM] trait and " +
            "play cost of 7 or more is played, by suspending this Tamer, <Draw 1>, gain 1 " +
            "memory. Then, you may place 1 card from your hand at the bottom of that Digimon's " +
            "digivolution cards face down.",
          when: (_ctx) => source.isOnBattleArea() && source.isOwnersTurn(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Cyborg/Machine/DM Digimon played with cost >=7, draw + memory + place under.`,
              matches: (subCtx) => {
                if (!subCtx.source.isOnBattleArea() || !subCtx.source.isOwnersTurn()) return false;
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                if (!isDigimon(def)) return false;
                if (!hasCyborgOrMachineOrDM(def)) return false;
                return (def.playCost ?? 0) >= 7;
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                subCtx.fx.draw(source.ownerSeat, 1);
                subCtx.fx.gainMemory(1);
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return;
                const owner = subCtx.game.player(source.ownerSeat);
                if (owner.hand.length > 0) {
                  const chosen = await subCtx.ask.selectCards(subCtx, {
                    candidates: Array.from(owner.hand).map((c) => c.instanceId),
                    min: 0,
                    max: 1,
                  });
                  if (chosen.length > 0) {
                    await subCtx.fx.placeUnder(subjectId, chosen);
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
