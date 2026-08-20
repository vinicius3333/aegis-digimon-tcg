import { CardKind, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX12-068";

function hasAngoramonOrNSp(def: CardDefinition): boolean {
  return def.nameEn.includes("Angoramon") || (def.types ?? []).includes("NSp");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-turn-set-memory`,
          description: "[Start of Your Turn] If you have 2 or less memory, set your memory to 3.",
          when: (ctx) => source.isOnBattleArea(),
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
          effectKey: `${cardId}/your-turn-attack-sub`,
          description:
            "[Your Turn] When one of your [Angoramon]/[NSp] Digimon attacks, by suspending " +
            "this Tamer, digivolve that Digimon into a Lv.6 or lower [Angoramon]/[NSp] card " +
            "from your hand with cost -1. Or, use 1 [Angoramon]/[NSp] Option from your hand " +
            "with cost -2.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenAttacking",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Angoramon/NSp attacks, suspend + modal choice.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasAngoramonOrNSp(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                const owner = subCtx.game.player(source.ownerSeat);
                const digivolveCards = Array.from(owner.hand).filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return isDigimon(def) && hasAngoramonOrNSp(def) && (def.level ?? 99) <= 6;
                });
                const optionCards = Array.from(owner.hand).filter((c) => {
                  const def = subCtx.game.definitionOf(c);
                  return (def.kinds ?? []).includes(CardKind.Option) && hasAngoramonOrNSp(def);
                });
                const choices: string[] = [];
                if (digivolveCards.length > 0) choices.push("Digivolve (cost -1)");
                if (optionCards.length > 0) choices.push("Use Option (cost -2)");
                if (choices.length === 0) return;
                const choice = await subCtx.ask.chooseOption(subCtx, choices);
                if (choice === 0 && digivolveCards.length > 0) {
                  const chosen = await subCtx.ask.selectCards(subCtx, {
                    candidates: digivolveCards.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  });
                  if (chosen.length > 0) {
                    await subCtx.fx.digivolveFromInstance(subCtx.trigger!.subjectPermanentId!, chosen[0]!, { payCost: true, costDelta: -1, ignoreRequirements: true });
                  }
                } else if (optionCards.length > 0) {
                  const chosen = await subCtx.ask.selectCards(subCtx, {
                    candidates: optionCards.map((c) => c.instanceId),
                    min: 1,
                    max: 1,
                  });
                  if (chosen.length > 0 && subCtx.fx.useOptionFromHand) {
                    await subCtx.fx.useOptionFromHand(subCtx, chosen[0]!, 2);
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
