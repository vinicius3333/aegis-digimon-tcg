import { CardColor, CardKind, EffectDuration, EffectTiming } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { onPlay, turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX6-063";

function hasAngelTrait(def: CardDefinition): boolean {
  const types = def.types ?? [];
  return (
    types.includes("Angel") ||
    types.includes("Archangel") ||
    types.includes("Three Great Angels")
  );
}

function isYellowDigimon(def: CardDefinition): boolean {
  return (
    def.kinds.includes(CardKind.Digimon) &&
    (def.colors ?? []).includes(CardColor.Yellow)
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [On Play] 1 of your yellow Digimon gains ＜Barrier＞ until end of opponent's turn.
    if (timing === EffectTiming.OnPlay) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-barrier`,
          description: "[On Play] 1 of your yellow Digimon gains ＜Barrier＞ until the end of your opponent's turn.",
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const player = ctx.game.player(source.ownerSeat);
            return Array.from(player.battleArea).some(
              (p) => p.topCard !== undefined && isYellowDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            const player = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(player.battleArea)
              .filter((p) => p.topCard !== undefined && isYellowDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            ctx.fx.grantKeyword(chosen[0]!, "Barrier", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    // [Start of Your Main Phase] same ＜Barrier＞ grant to 1 yellow Digimon.
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-barrier`,
          description: "[Start of Your Main Phase] 1 of your yellow Digimon gains ＜Barrier＞ until the end of your opponent's turn.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            const player = ctx.game.player(source.ownerSeat);
            return Array.from(player.battleArea).some(
              (p) => p.topCard !== undefined && isYellowDigimon(ctx.game.definitionOf(p.topCard)),
            );
          },
          resolve: async (ctx) => {
            const player = ctx.game.player(source.ownerSeat);
            const candidates = Array.from(player.battleArea)
              .filter((p) => p.topCard !== undefined && isYellowDigimon(ctx.game.definitionOf(p.topCard)))
              .map((p) => p.permanentId);
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: 1, max: 1 });
            if (chosen.length === 0) return;
            ctx.fx.grantKeyword(chosen[0]!, "Barrier", EffectDuration.UntilOpponentTurnEnd);
          },
        }),
      ];
    }

    // [Your Turn] when one of your Digimon is played or digivolves with [Angel]/[Archangel]/
    // [Three Great Angels] trait, by suspending this Tamer, gain 1 memory.
    // Modeled as [Your Turn] effects that install sub-trigger watchers for whenPlayed and
    // whenDigivolving.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        // The whenPlayed watcher
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-angel-played-memory`,
          description:
            "[Your Turn] When one of your Digimon with the [Angel]/[Archangel]/[Three Great Angels] " +
            "trait is played, by suspending this Tamer, gain 1 memory.",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== source.ownerSeat) return false;
            return hasAngelTrait(ctx.game.definitionOf(subject.topCard));
          },
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.isSuspended) return false;
            return ctx.source.isOnBattleArea();
          },
          resolve: async (ctx) => {
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return;
            if (!hasAngelTrait(ctx.game.definitionOf(subject.topCard))) return;

            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            ctx.fx.gainMemory(1);
          },
        }),
        // The whenDigivolving watcher (same logic, fires on digivolve window)
        turnTiming({
          source,
          effectKey: `${cardId}/your-turn-angel-digivolve-memory`,
          description:
            "[Your Turn] When one of your Digimon with the [Angel]/[Archangel]/[Three Great Angels] " +
            "trait digivolves, by suspending this Tamer, gain 1 memory.",
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            // For the whenDigivolving window, subjectPermanentId is the newly digivolved permanent.
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return false;
            if (subject.controllerSeat !== source.ownerSeat) return false;
            // KB Q3808: check traits AFTER digivolving (new top card).
            return hasAngelTrait(ctx.game.definitionOf(subject.topCard));
          },
          canActivate: (ctx) => {
            const perm = ctx.source.permanent();
            if (perm === undefined || perm.isSuspended) return false;
            return ctx.source.isOnBattleArea();
          },
          resolve: async (ctx) => {
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return;
            const subject = ctx.game.permanentById(subjectId);
            if (subject === undefined || subject.topCard === undefined) return;
            if (!hasAngelTrait(ctx.game.definitionOf(subject.topCard))) return;

            const selfPerm = ctx.source.permanent();
            if (selfPerm === undefined) return;
            const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
            if (!paid) return;

            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Security] Play this Tamer.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this Tamer.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId);
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
