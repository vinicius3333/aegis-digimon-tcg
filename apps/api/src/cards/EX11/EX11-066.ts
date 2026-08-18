import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-066";

function hasVemmonInText(def: CardDefinition): boolean {
  return def.nameEn.includes("Vemmon");
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-draw-gain`,
          description:
            "[Start of Your Main Phase] By trashing 1 card with [Vemmon] in its text from " +
            "your hand, <Draw 1>. Then, gain 1 memory.",
          optional: true,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const vemmonCards = Array.from(owner.hand).filter((c) => hasVemmonInText(ctx.game.definitionOf(c)));
            if (vemmonCards.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: vemmonCards.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.trash(chosen);
              ctx.fx.draw(source.ownerSeat, 1);
              const willGain = await ctx.ask.optional(ctx, "Gain 1 memory?");
              if (willGain) {
                // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause
                // is also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit
                // this Tamer's owner explicitly rather than the turn player.
                ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.OnEnterFieldAnyone) {
      return [
        onPlay({
          source,
          effectKey: `${cardId}/on-play-trash-draw-gain`,
          description:
            "[On Play] By trashing 1 card with [Vemmon] in its text from your hand, <Draw 1>. " +
            "Then, gain 1 memory.",
          optional: true,
          canActivate: (ctx) => ctx.source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const vemmonCards = Array.from(owner.hand).filter((c) => hasVemmonInText(ctx.game.definitionOf(c)));
            if (vemmonCards.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: vemmonCards.map((c) => c.instanceId),
              min: 0,
              max: 1,
            });
            if (chosen.length > 0) {
              await ctx.fx.trash(chosen);
              ctx.fx.draw(source.ownerSeat, 1);
              const willGain = await ctx.ask.optional(ctx, "Gain 1 memory?");
              if (willGain) {
                ctx.fx.gainMemory(1);
              }
            }
          },
        }),
      ];
    }

    if (timing === EffectTiming.None) {
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/played-sub`,
          description:
            "[All Turns] When your Digimon with [Vemmon] in its text is played, by suspending " +
            "this Tamer, reveal top 2 of deck. Place all [Vemmon] cards among them as the " +
            "bottom digivolution cards of that Digimon. Trash the rest.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Vemmon Digimon played, suspend + reveal + place under.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasVemmonInText(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                const owner = subCtx.game.player(source.ownerSeat);
                const top2 = Array.from(owner.deck).slice(0, 2);
                if (top2.length === 0) return;
                const vemmonCards = top2.filter((c) => hasVemmonInText(subCtx.game.definitionOf(c)));
                const nonVemmon = top2.filter((c) => !hasVemmonInText(subCtx.game.definitionOf(c)));
                if (vemmonCards.length > 0) {
                  const subjectId = subCtx.trigger?.subjectPermanentId;
                  if (subjectId !== undefined) {
                    await subCtx.fx.placeUnder(subjectId, vemmonCards.map((c) => c.instanceId));
                  }
                }
                if (nonVemmon.length > 0) {
                  await subCtx.fx.trash(nonVemmon.map((c) => c.instanceId));
                }
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/digivolve-sub`,
          description:
            "[All Turns] When your Digimon with [Vemmon] in its text digivolves, by suspending " +
            "this Tamer, reveal top 2 of deck. Place all [Vemmon] cards among them as the " +
            "bottom digivolution cards of that Digimon. Trash the rest.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Vemmon Digimon digivolves, suspend + reveal + place under.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                const def = subCtx.game.definitionOf(subject.topCard);
                return isDigimon(def) && hasVemmonInText(def);
              },
              run: async (subCtx) => {
                const selfPerm = subCtx.source.permanent();
                if (selfPerm === undefined || selfPerm.isSuspended) return;
                const paid = subCtx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
                if (!paid) return;
                const owner = subCtx.game.player(source.ownerSeat);
                const top2 = Array.from(owner.deck).slice(0, 2);
                if (top2.length === 0) return;
                const vemmonCards = top2.filter((c) => hasVemmonInText(subCtx.game.definitionOf(c)));
                const nonVemmon = top2.filter((c) => !hasVemmonInText(subCtx.game.definitionOf(c)));
                if (vemmonCards.length > 0) {
                  const subjectId = subCtx.trigger?.subjectPermanentId;
                  if (subjectId !== undefined) {
                    await subCtx.fx.placeUnder(subjectId, vemmonCards.map((c) => c.instanceId));
                  }
                }
                if (nonVemmon.length > 0) {
                  await subCtx.fx.trash(nonVemmon.map((c) => c.instanceId));
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
