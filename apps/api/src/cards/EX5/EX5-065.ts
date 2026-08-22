import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { turnTiming, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

/**
 * EX5-065 — Sayo & Koh (EX5, Blue Tamer). BANNED since 2025-09-01.
 *
 * [Your Turn] When an effect places the top card of one of your Digimon in a
 *   Digimon's digivolution cards, by suspending this Tamer, gain 1 memory.
 * [Start of Opponent's Turn] Play 1 digivolution card from one of your
 *   [Night Claw]/[Light Fang] Digimon with the same level, without paying cost.
 *   Then DNA digivolve 2 of your Digimon into hand card.
 *   At end of turn, return the played Digimon to hand.
 * [Security] Play this Tamer without paying the cost.
 */
const cardId = "EX5-065";

function hasNightClawOrLightFang(def: ReturnType<EffectContext["game"]["definitionOf"]>): boolean {
  const traits = def.types ?? [];
  return traits.some(
    (t) => t === "Night Claw" || t === "NightClaw" || t === "Light Fang" || t === "LightFang",
  );
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    // [Your Turn] SubTrigger on add-digivolution → suspend Tamer, gain 1 memory.
    // with a guard that checks the trigger is an add-digivolution event.
    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        {
          effectKey: `${cardId}/add-digi-memory`,
          description:
            "[Your Turn] When an effect places the top card of one of your Digimon in a Digimon's digivolution cards, by suspending this Tamer, gain 1 memory.",
          optional: true,
          isInherited: false,
          isSecurity: false,
          isLinked: false,
          maxPerTurn: -1,
          canTrigger: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            if (!ctx.source.isOwnersTurn()) return false;
            // Gated by the event payload — only fires for digivolution-add events.
            return ctx.trigger.subjectPermanentId !== undefined;
          },
          canActivate: (ctx) => {
            const self = ctx.source.permanent();
            return self !== undefined && !self.isSuspended;
          },
          resolve: async (ctx) => {
            const self = ctx.source.permanent();
            if (!self) return;
            await ctx.fx.suspend([self.permanentId]);
            ctx.fx.gainMemory(1);
          },
        },
      ];
    }

    // [Start of Opponent's Turn] Play from digi cards → DNA digivolve.
    if (timing === EffectTiming.OnStartTurn) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-opp-turn`,
          description:
            "[Start of Opponent's Turn] By playing 1 card with the same level as one of your [Night Claw]/[Light Fang] trait Digimon from that Digimon's digivolution cards without paying the cost, 2 of your Digimon may DNA Digivolve into a Digimon card in your hand for the cost. At the end of the turn, return the Digimon played by this effect to its owner's hand.",
          optional: true,
          when: (ctx) => {
            if (!ctx.source.isOnBattleArea()) return false;
            return !ctx.source.isOwnersTurn();
          },
          canActivate: (ctx) => {
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            return mine.some((p) => {
              if (p.topCard === undefined) return false;
              const def = ctx.game.definitionOf(p.topCard);
              if (!isDigimon(def) || !hasNightClawOrLightFang(def)) return false;
              const hostLevel = def.level ?? 0;
              return p.stack.some((c) => {
                const sDef = ctx.game.definitionOf(c);
                return isDigimon(sDef) && (sDef.level ?? 0) === hostLevel;
              });
            });
          },
          resolve: async (ctx) => {
            const mine = ctx.game.player(source.ownerSeat).battleArea;
            const eligiblePerms = mine
              .filter((p) => {
                if (p.topCard === undefined) return false;
                const def = ctx.game.definitionOf(p.topCard);
                if (!isDigimon(def) || !hasNightClawOrLightFang(def)) return false;
                const hostLevel = def.level ?? 0;
                return p.stack.some((c) => {
                  const sDef = ctx.game.definitionOf(c);
                  return isDigimon(sDef) && (sDef.level ?? 0) === hostLevel;
                });
              })
              .map((p) => p.permanentId);
            if (eligiblePerms.length === 0) return;
            const chosenPermId = await ctx.ask.chooseTargets(ctx, { candidates: eligiblePerms, min: 1, max: 1 });
            if (chosenPermId.length === 0) return;
            const chosenPerm = chosenPermId[0]!;
            const hostPerm = ctx.game.permanentById(chosenPerm);
            if (!hostPerm || hostPerm.topCard === undefined) return;
            const hostLevel = ctx.game.definitionOf(hostPerm.topCard).level ?? 0;
            const stackCandidates = hostPerm.stack
              .filter((c) => {
                const def = ctx.game.definitionOf(c);
                return isDigimon(def) && (def.level ?? 0) === hostLevel;
              })
              .map((c) => c.instanceId);
            if (stackCandidates.length === 0) return;
            const toPlay = await ctx.ask.selectCards(ctx, { candidates: stackCandidates, min: 1, max: 1 });
            if (toPlay.length === 0) return;
            const playedInstances = toPlay;
            const played = await ctx.fx.playInstances(playedInstances, { payCost: false });
            const playedPermanent = played[0];
            if (playedPermanent !== undefined) {
              ctx.fx.subscribeSubTrigger({
                event: "endOfTurn",
                sourcePermanentId: playedPermanent.permanentId,
                once: true,
                description: `${cardId} returns the Digimon played from digivolution cards to hand`,
                matches: (subCtx) => subCtx.source.isOnBattleArea() && subCtx.source.isOwnersTurn(),
                run: async (subCtx) => {
                  const current = subCtx.game.permanentById(playedPermanent.permanentId);
                  if (current?.topCard !== undefined) {
                    await subCtx.fx.returnToHand([current.topCard.instanceId]);
                  }
                },
              });
            }

            // DNA digivolve
            const handDigi = ctx.game.player(source.ownerSeat).hand.filter((c) =>
              isDigimon(ctx.game.definitionOf(c)),
            );
            if (handDigi.length > 0) {
              const dnaTarget = await ctx.ask.selectCards(ctx, {
                candidates: handDigi.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (dnaTarget.length > 0) {
                const mineAfterPlay = ctx.game.player(source.ownerSeat).battleArea
                  .filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
                  .map((p) => p.permanentId);
                if (mineAfterPlay.length >= 2) {
                  const materials = await ctx.ask.chooseTargets(ctx, { candidates: mineAfterPlay, min: 2, max: 2 });
                  if (materials.length === 2) {
                    await ctx.fx.dnaDigivolveInto(materials as [string, string], dnaTarget[0]!, {
                      payCost: true,
                    });
                  }
                }
              }
            }
          },
        }),
      ];
    }

    // [Security] Play this Tamer without paying cost.
    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/play-from-security`,
          description: "[Security] Play this card without paying the memory cost.",
          optional: false,
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
