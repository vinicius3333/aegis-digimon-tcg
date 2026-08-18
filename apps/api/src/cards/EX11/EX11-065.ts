import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { turnTiming, security, staticModifier } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-065";

function hasMineralOrRock(def: CardDefinition): boolean {
  return (def.types ?? []).some((t) => t === "Mineral" || t === "Rock");
}

async function placeUnderFromHandOrTrash(
  ctx: Parameters<NonNullable<Parameters<typeof turnTiming>[0]["resolve"]>>[0],
  source: CardSource,
  subjectPermanentId: string,
): Promise<void> {
  const selfPerm = source.permanent();
  if (selfPerm === undefined || selfPerm.isSuspended) return;
  const paid = ctx.fx.payActivationCost?.(selfPerm.permanentId, "suspend");
  if (!paid) return;
  const owner = ctx.game.player(source.ownerSeat);
  const fromHand = Array.from(owner.hand).filter((c) => hasMineralOrRock(ctx.game.definitionOf(c)));
  const fromTrash = Array.from(owner.trash).filter((c) => hasMineralOrRock(ctx.game.definitionOf(c)));
  const allCandidates = [...fromHand, ...fromTrash];
  if (allCandidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: allCandidates.map((c) => c.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length > 0) {
    await ctx.fx.placeUnder(subjectPermanentId, chosen);
  }
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnStartMainPhase) {
      return [
        turnTiming({
          source,
          effectKey: `${cardId}/start-main-trash-for-memory`,
          description:
            "[Start of Your Main Phase] By trashing 1 [Mineral] or [Rock] trait card from " +
            "your hand or your Digimon's digivolution cards, gain 1 memory.",
          optional: true,
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const owner = ctx.game.player(source.ownerSeat);
            const mineralCards = Array.from(owner.hand).filter((c) => hasMineralOrRock(ctx.game.definitionOf(c)));
            if (mineralCards.length > 0) {
              const chosen = await ctx.ask.selectCards(ctx, {
                candidates: mineralCards.map((c) => c.instanceId),
                min: 0,
                max: 1,
              });
              if (chosen.length > 0) {
                await ctx.fx.trash(chosen);
                // `when` only gates isOnBattleArea(), not isOwnersTurn(), so this clause is
                // also a candidate at the OPPONENT's Start-of-Main-Phase firing; credit this
                // Tamer's owner explicitly rather than the turn player.
                ctx.fx.gainMemoryForSeat(source.ownerSeat, 1);
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
            "[All Turns] When your Digimon is played, by suspending this Tamer, you may place " +
            "1 [Mineral]/[Rock] trait card from your hand or trash as the bottom digivolution " +
            "card of that Digimon.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenPlayed",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Digimon played, suspend + place under.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                return isDigimon(subCtx.game.definitionOf(subject.topCard));
              },
              run: async (subCtx) => {
                await placeUnderFromHandOrTrash(subCtx, source, subCtx.trigger!.subjectPermanentId!);
              },
            });
          },
        }),
        staticModifier({
          source,
          effectKey: `${cardId}/digivolve-sub`,
          description:
            "[All Turns] When your Digimon digivolves, by suspending this Tamer, you may place " +
            "1 [Mineral]/[Rock] trait card from your hand or trash as the bottom digivolution " +
            "card of that Digimon.",
          when: (ctx) => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "whenOneOfYoursDigivolves",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: When Digimon digivolves, suspend + place under.`,
              matches: (subCtx) => {
                const subjectId = subCtx.trigger?.subjectPermanentId;
                if (subjectId === undefined) return false;
                const subject = subCtx.game.permanentById(subjectId);
                if (subject === undefined || subject.topCard === undefined) return false;
                if (subject.controllerSeat !== source.ownerSeat) return false;
                return isDigimon(subCtx.game.definitionOf(subject.topCard));
              },
              run: async (subCtx) => {
                await placeUnderFromHandOrTrash(subCtx, source, subCtx.trigger!.subjectPermanentId!);
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
