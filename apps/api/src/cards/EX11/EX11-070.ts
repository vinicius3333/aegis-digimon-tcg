import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-070";

function hasMaquinamonInText(def: CardDefinition): boolean {
  const hay = `${def.nameEn} ${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`;
  return hay.toLowerCase().includes("maquinamon");
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
          when: (_ctx) => source.isOnBattleArea(),
          canActivate: (ctx) => ctx.game.state.memory <= 2,
          resolve: async (ctx) => {
            ctx.fx.setMemory(3);
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/end-turn-dna-mind-link`,
          description:
            "[End of Your Turn] [Once Per Turn] You may DNA digivolve 2 of your Digimon " +
            "into an [ExMaquinamon] in your hand paying the cost. Then, you may ＜Mind Link＞ " +
            "to 1 of your Digimon with [Maquinamon] in its text.",
          maxPerTurn: 1,
          optional: true,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const exMaquinamon = Array.from(owner.hand).find((c) => {
              const def = ctx.game.definitionOf(c);
              return def.nameEn.includes("ExMaquinamon") && isDigimon(def);
            });
            if (exMaquinamon !== undefined) {
              const materials = Array.from(owner.battleArea)
                .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                .map((p) => p.permanentId);
              if (materials.length >= 2) {
                const chosen = await ctx.ask.chooseTargets(ctx, { candidates: materials, min: 2, max: 2 });
                if (chosen.length >= 2) {
                  await ctx.fx.dnaDigivolveInto(chosen, exMaquinamon.instanceId, { payCost: true });
                }
              }
            }
            const maquinamonDigimon = Array.from(owner.battleArea)
              .filter(
                (p) =>
                  p.topCard !== undefined &&
                  isDigimon(ctx.game.definitionOf(p.topCard)) &&
                  hasMaquinamonInText(ctx.game.definitionOf(p.topCard)),
              )
              .map((p) => p.permanentId);
            if (maquinamonDigimon.length > 0) {
              const chosen = await ctx.ask.chooseTargets(ctx, { candidates: maquinamonDigimon, min: 0, max: 1 });
              if (chosen.length > 0) {
                if (ctx.fx.link) {
                  await ctx.fx.link(chosen[0]!, [source.instanceId]);
                }
              }
            }
          },
        }),
        turnTiming({
          source,
          effectKey: `${cardId}/inherited-end-all-turns-play-unchained`,
          description:
            "[End of All Turns] [Inherited] You may play 1 [Unchained] from this Digimon's digivolution cards without paying the cost.",
          optional: true,
          isInherited: true,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const candidates = host.stack.filter((card) => ctx.game.definitionOf(card).nameEn === "Unchained");
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map((card) => card.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) await ctx.fx.playInstances(chosen, { payCost: false });
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/inherited-dp-floor-trash-lock`,
          description:
            "[All Turns] [Inherited] If this card is in the digivolution cards of a Digimon " +
            "with [Maquinamon] in its text, that Digimon can't have less than 1000 DP, and " +
            "your opponent's effects can't trash its digivolution cards.",
          isInherited: true,
          when: (_ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            if (self.topCard !== undefined) {
              const def = ctx.game.definitionOf(self.topCard);
              // "[Maquinamon] in its text" — the printed effect text, NOT
              // the card's own name (e.g. EX11-029 Turbomon: nameEn "Turbomon" never matches, but
              // its effectText prints "[Digivolve] [Maquinamon]: Cost 2" / "link 1 [Maquinamon]").
              const hay = `${def.effectText ?? ""} ${def.inheritedEffectText ?? ""}`;
              if (hay.includes("Maquinamon")) {
                if (ctx.fx.minDpFloor) {
                  ctx.fx.minDpFloor(self.permanentId, 1000, EffectDuration.UntilEachTurnEnd);
                }
                if (ctx.fx.stackTrashLock) {
                  ctx.fx.stackTrashLock(self.permanentId, EffectDuration.UntilEachTurnEnd);
                }
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
