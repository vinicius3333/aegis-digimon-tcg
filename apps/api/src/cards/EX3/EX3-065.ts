import { CardKind, EffectTiming } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX3-065";

/**
 * EX3-065 — EX3 White Tamer.
 *
 * 1. [Start of Your Turn] If opponent has a Digimon, gain 1 memory.
 * 2. [Your Turn] When a Digimon digivolves into a Digimon with [Rock Dragon]/[Earth Dragon]/
 *    [Machine Dragon]/[Sky Dragon] traits, by suspending this Digimon, activate 1 of that
 *
 *    The re-activation is a GENUINE re-fire of the digivolved Digimon's own [On Play] effect via
 *    the `reactivateOnPlay` primitive: it collects that permanent's
 *    non-security OnPlay effects, lets the controller pick one when several exist (KB Q3430/Q3431),
 *    and resolves the chosen effect with that permanent as the source. The suspend-self cost
 * is paid first. No keyword proxy.
 *
 */

const eligibleTraits = [
  "Rock Dragon",
  "RockDragon",
  "Earth Dragon",
  "EarthDragon",
  "Machine Dragon",
  "MachineDragon",
  "Sky Dragon",
  "SkyDragon",
];

const dragonWatcherText =
  "[Your Turn] When one of your Digimon digivolves into a Digimon with " +
  "[Rock Dragon], [Earth Dragon], [Machine Dragon], or [Sky Dragon] in its traits, " +
  "by suspending this Tamer, activate 1 of that Digimon's [On Play] effects.";

function hasEligibleTraits(types: readonly string[] | undefined): boolean {
  if (types === undefined) return false;
  return eligibleTraits.some((t) => types.includes(t));
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Start of Your Turn] If opponent has a Digimon, gain 1 memory
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-of-turn-gain-memory`,
          description: "[Start of Your Turn] If your opponent has a Digimon in play, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const oppSeat = ctx.game.opponentOf(ctx.source.ownerSeat);
            const opp = ctx.game.player(oppSeat);
            return opp.battleArea.some((p) => {
              if (p.inBreeding || p.topCard === undefined) return false;
              return ctx.game.definitionOf(p.topCard).kinds.includes(CardKind.Digimon);
            });
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    // [Your Turn] When one of yours digivolves into Rock/Earth/Machine/Sky Dragon:
    // by suspending this Tamer, activate 1 On Play effect of that Digimon. The entry-cause
    // payload keeps this observer on the normal derived-trigger stack without matching plays.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/digivolve-dragon-trait-reactivate-onplay`,
          description: dragonWatcherText,
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea() || !ctx.source.isOwnersTurn()) return false;
            if (ctx.trigger.entryCause !== "digivolve") return false;
            const subjectId = ctx.trigger.subjectPermanentId;
            if (subjectId === undefined) return false;
            const subject = ctx.game.permanentById(subjectId);
            if (subject?.topCard === undefined || subject.controllerSeat !== source.ownerSeat) return false;
            const definition = ctx.game.definitionOf(subject.topCard);
            return definition.kinds.includes(CardKind.Digimon) && hasEligibleTraits(definition.types);
          },
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return self !== undefined && !self.isSuspended && !self.inBreeding;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            const subjectId = ctx.trigger.subjectPermanentId;
            if (self === undefined || subjectId === undefined) return;
            if (!ctx.fx.payActivationCost?.(self.permanentId, "suspend")) return;
            await ctx.fx.reactivateOnPlay?.(subjectId);
          },
        }),
      ];
    }

    // [Security] Play this card
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card.",
          // Printed Security has no board-state condition: Hina is always played.
          when: () => true,
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
