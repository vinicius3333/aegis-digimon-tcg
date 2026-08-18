import { EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT20-089";
const EIJI_NAGASUMI = "Eiji Nagasumi";

function hasPulsemonText(def: CardDefinition): boolean {
  const hay = [
    def.nameEn ?? "",
    def.effectText ?? "",
    def.inheritedEffectText ?? "",
    ...(def.types ?? []),
  ].join(" ");
  return hay.toLowerCase().includes("pulsemon");
}

function hasSocOrSeekersTrait(def: CardDefinition): boolean {
  const types = def.types as string[] | undefined;
  return types?.some((t) => t === "SoC" || t === "SEEKERS") ?? false;
}

function meetsPulsemonCondition(def: CardDefinition): boolean {
  return hasPulsemonText(def) || hasSocOrSeekersTrait(def);
}

function isEijiNagasumiCard(def: CardDefinition): boolean {
  return def.nameEn === EIJI_NAGASUMI || def.nameEn.includes(EIJI_NAGASUMI);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Rule] Also treated as [Eiji Nagasumi] and [Leon Alexander] — name grant via static.
    // ESS: [Inherited] Alliance/Piercing/Barrier when Pulsemon text or SoC/SEEKERS.
    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/rule-name-eiji`,
          description: "[Rule] Also treated as [Eiji Nagasumi] and [Leon Alexander].",
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;
            ctx.fx.grantNameTrait(perm.permanentId, "name", ["Eiji Nagasumi", "Leon Alexander"], EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/ess-alliance`,
          description:
            "[Inherited — All Turns] This Digimon with [Pulsemon] in its text or the [SoC]/[SEEKERS] trait gains ＜Alliance＞.",
          isInherited: true,
          when: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            return meetsPulsemonCondition(ctx.game.definitionOf(perm.topCard));
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return;
            if (!meetsPulsemonCondition(ctx.game.definitionOf(perm.topCard))) return;
            ctx.fx.grantKeyword(perm.permanentId, "Alliance", EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/ess-piercing`,
          description:
            "[Inherited — All Turns] This Digimon with [Pulsemon] in its text or the [SoC]/[SEEKERS] trait gains ＜Piercing＞.",
          isInherited: true,
          when: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            return meetsPulsemonCondition(ctx.game.definitionOf(perm.topCard));
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return;
            if (!meetsPulsemonCondition(ctx.game.definitionOf(perm.topCard))) return;
            ctx.fx.grantPierce(perm.permanentId, EffectDuration.UntilEachTurnEnd);
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/ess-barrier`,
          description:
            "[Inherited — All Turns] This Digimon with [Pulsemon] in its text or the [SoC]/[SEEKERS] trait gains ＜Barrier＞.",
          isInherited: true,
          when: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return false;
            return meetsPulsemonCondition(ctx.game.definitionOf(perm.topCard));
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.topCard === undefined) return;
            if (!meetsPulsemonCondition(ctx.game.definitionOf(perm.topCard))) return;
            ctx.fx.grantKeyword(perm.permanentId, "Barrier", EffectDuration.UntilEachTurnEnd);
          },
        }),
      ];
    }

    // [Security] Play this card without paying the cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play-self`,
          description: "[Security] Play this card without paying the cost.",
          resolve: async (ctx) => {
            await ctx.fx.playInstances([ctx.source.instanceId], { payCost: false });
          },
        }),
      ];
    }

    // [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          optional: false,
          when: (ctx) => (ctx.source.isOwnersTurn?.() ?? false) && ctx.source.isOnBattleArea(),
          canActivate: (ctx) => {
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            return ctx.game.player(opponentSeat).battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              return (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon");
            });
          },
          resolve: async (ctx) => {
            const opponentSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            const hasOppDigimon = ctx.game.player(opponentSeat).battleArea.some((p) => {
              if (p.topCard === undefined) return false;
              return (ctx.game.definitionOf(p.topCard).kinds as string[]).includes("Digimon");
            });
            if (hasOppDigimon) {
              // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
              // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
              // owner explicitly rather than the turn player.
              ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
            }
          },
        }),
      ];
    }

    // [Inherited — End of All Turns] You may play 1 [Eiji Nagasumi] from this Digimon's
    // digivolution cards without paying the cost.
    // KB Q5555: can play this card itself when it sits as a digivolution card.
    if (timing === EffectTiming.OnEndTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/ess-end-of-all-turns-play-eiji`,
          description:
            "[Inherited — End of All Turns] You may play 1 [Eiji Nagasumi] from this " +
            "Digimon's digivolution cards without paying the cost.",
          optional: true,
          isInherited: true,
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const perm = ctx.source.permanent();
            if (perm === undefined) return false;
            return perm.stack.some((c) => isEijiNagasumiCard(ctx.game.definitionOf(c)));
          },
          resolve: async (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined) return;

            const candidates = perm.stack
              .filter((c) => isEijiNagasumiCard(ctx.game.definitionOf(c)))
              .map((c) => c.instanceId);

            if (candidates.length === 0) return;

            const chosen = await ctx.ask.selectCards(ctx, {
              candidates,
              min: 0,
              max: 1,
            });

            if (chosen.length > 0) {
              await ctx.fx.playInstances(chosen, { payCost: false });
            }
          },
        }),
      ];
    }

    // [All Turns] MindLink reaction — RESIDUAL: MindLink not available as fx primitive.

    return [];
  },
};

registerCard(module);
export default module;
