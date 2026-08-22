import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import { onPlay, security, staticModifier, turnTiming } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "EX11-055";
const hasMainTrait = (def: CardDefinition) =>
  (def.types ?? []).some((trait) => trait === "Composite" || trait === "Wicked God");
const isGazimon = (def: CardDefinition) => isDigimon(def) && ["Gazimon", "Gizamon"].includes(def.nameEn);

async function drawAndGainMemory(
  ctx: Parameters<NonNullable<Parameters<typeof onPlay>[0]["resolve"]>>[0],
  source: CardSource,
): Promise<void> {
  const candidates = Array.from(ctx.game.player(source.ownerSeat).hand).filter((card) =>
    hasMainTrait(ctx.game.definitionOf(card)),
  );
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map((card) => card.instanceId),
    min: 0,
    max: 1,
  });
  if (chosen.length !== 1 || (await ctx.fx.trash(chosen, { byEffectSeat: source.ownerSeat })).length !== 1) return;
  ctx.fx.gainMemoryForSeat(source.ownerSeat, 1, { isTamerEffect: true });
  await ctx.fx.draw(source.ownerSeat, 1);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnEnterFieldAnyone || timing === EffectTiming.OnStartMainPhase) {
      const effect =
        timing === EffectTiming.OnEnterFieldAnyone
          ? onPlay({
              source,
              effectKey: `${cardId}/on-play`,
              description:
                "[On Play] By trashing 1 [Composite] or [Wicked God] trait card from your hand, draw 1 and gain 1 memory.",
              optional: true,
              resolve: async (ctx) => drawAndGainMemory(ctx, source),
            })
          : turnTiming({
              source,
              effectKey: `${cardId}/start-main`,
              description:
                "[Start of Your Main Phase] By trashing 1 [Composite] or [Wicked God] trait card from your hand, draw 1 and gain 1 memory.",
              resolve: async (ctx) => drawAndGainMemory(ctx, source),
            });
      return [effect];
    }
    if (timing === EffectTiming.None)
      return [
        staticModifier({
          source,
          effectKey: `${cardId}/deletion-play`,
          description:
            "[All Turns] When one of your [Composite] or [Wicked God] trait Digimon is deleted, by suspending this Tamer, you may play 1 [Gazimon] or [Gizamon] from your hand without paying the cost.",
          when: () => source.isOnBattleArea(),
          resolve: async (ctx) => {
            const self = source.permanent();
            if (self === undefined) return;
            ctx.fx.subscribeSubTrigger({
              event: "onDeletionOf",
              sourcePermanentId: self.permanentId,
              once: false,
              description: `${cardId}: deletion play`,
              matches: (subCtx) => {
                const id = subCtx.trigger?.subjectPermanentId;
                const subject = id === undefined ? undefined : subCtx.game.permanentById(id);
                return (
                  subject !== undefined &&
                  subject.controllerSeat === source.ownerSeat &&
                  subject.topCard !== undefined &&
                  isDigimon(subCtx.game.definitionOf(subject.topCard)) &&
                  hasMainTrait(subCtx.game.definitionOf(subject.topCard))
                );
              },
              run: async (subCtx) => {
                const current = subCtx.game.permanentById(self.permanentId);
                const hand = Array.from(subCtx.game.player(source.ownerSeat).hand).filter((card) =>
                  isGazimon(subCtx.game.definitionOf(card)),
                );
                if (current === undefined || current.isSuspended || hand.length === 0) return;
                const chosen = await subCtx.ask.selectCards(subCtx, {
                  candidates: hand.map((card) => card.instanceId),
                  min: 0,
                  max: 1,
                });
                if (chosen.length === 0) return;
                await subCtx.fx.suspend([self.permanentId], { byEffectSeat: source.ownerSeat });
                if (subCtx.game.permanentById(self.permanentId)?.isSuspended)
                  await subCtx.fx.playInstances(chosen, { payCost: false });
              },
            });
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Play this card without paying its memory cost.",
          resolve: async (ctx) => ctx.fx.playFromSecurity(source.instanceId, { payCost: false }),
        }),
      ];
    return [];
  },
};

registerCard(module);
export default module;
