import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

// Suzune Kazuki — EX8-066 (Blue Tamer).
//
// Clause 1 — [Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.
//   Fully implemented: turnTiming builder + canActivate opponent-Digimon guard.
//
// Clause 2 — [All Turns] When one of your Digimon is played or digivolves, if any of them
//   have the [Ice-Snow] trait, by suspending this Tamer, trash any 1 digivolution card from
//   your opponent's Digimon.
//
const cardId = "EX8-066";

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-phase-gain-memory`,
          description: "[Start of Your Main Phase] If your opponent has a Digimon, gain 1 memory.",
          when: (ctx) => ctx.source.isOnBattleArea() && ctx.source.isOwnersTurn(),
          canActivate: (ctx) => {
            const opp = ctx.game.opponentOf(source.ownerSeat);
            return ctx.game
              .player(opp)
              .battleArea.some(
                (p) => !p.inBreeding && p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)),
              );
          },
          resolve: async (ctx) => {
            ctx.fx.gainMemory(1);
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/ice-snow-play-or-digivolve-trash-stack`,
          description:
            "[All Turns] When one of your Digimon is played or digivolves, if it has the " +
            "[Ice-Snow] trait, by suspending this Tamer, trash 1 digivolution card from " +
            "your opponent's Digimon.",
          resolve: async (ctx) => {
            const host = ctx.source.permanent();
            if (host === undefined) return;
            const ownerSeat = source.ownerSeat;
            const opponentSeat = ctx.game.opponentOf(ownerSeat);
            const install = (event: "whenPlayed" | "whenOneOfYoursDigivolves") => {
              ctx.fx.subscribeSubTrigger({
                event,
                sourcePermanentId: host.permanentId,
                once: false,
                description: `${cardId}: an owned Ice-Snow Digimon was ${event === "whenPlayed" ? "played" : "digivolved"}.`,
                matches: (subCtx) => {
                  const subjectId = subCtx.trigger?.subjectPermanentId;
                  if (subjectId === undefined) return false;
                  const subject = subCtx.game.permanentById(subjectId);
                  if (subject === undefined || subject.controllerSeat !== ownerSeat || subject.topCard === undefined)
                    return false;
                  return (subCtx.game.definitionOf(subject.topCard).types ?? []).includes("Ice-Snow");
                },
                run: async (subCtx) => {
                  const currentHost = subCtx.game.permanentById(host.permanentId);
                  if (currentHost === undefined || currentHost.isSuspended) return;
                  const candidates = Array.from(subCtx.game.player(opponentSeat).battleArea).flatMap((p) =>
                    p.stack.map((card) => ({ hostPermanentId: p.permanentId, instanceId: card.instanceId })),
                  );
                  if (candidates.length === 0) return;
                  const chosen = await subCtx.ask.selectCards(subCtx, {
                    candidates: candidates.map((entry) => entry.instanceId),
                    min: 1,
                    max: 1,
                  });
                  if (chosen.length === 0) return;
                  const selected = candidates.find((entry) => entry.instanceId === chosen[0]);
                  if (selected === undefined) return;
                  await subCtx.fx.suspend([currentHost.permanentId], { byEffectSeat: ownerSeat });
                  await subCtx.fx.trashDigivolutionCards(selected.hostPermanentId, [selected.instanceId], {
                    byEffectSeat: ownerSeat,
                    byEffectCardId: cardId,
                  });
                },
              });
            };
            install("whenPlayed");
            install("whenOneOfYoursDigivolves");
          },
        }),
      ];
    }

    if (timing === EffectTiming.SecuritySkill) {
      return [
        security({
          source,
          effectKey: `${cardId}/security-play`,
          description: "[Security] Play this card without paying its cost.",
          resolve: async (ctx) => {
            await ctx.fx.playFromSecurity(ctx.source.instanceId, { payCost: false });
          },
        }),
      ];
    }

    return [];
  },
};

registerCard(module);
export default module;
