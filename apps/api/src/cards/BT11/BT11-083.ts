import { CardColor, EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { staticModifier, whenDigivolving } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-083";
function traits(definition: CardDefinition): string[] {
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])];
}
function returnCandidate(definition: CardDefinition): boolean {
  return (
    definition.nameEn.includes("Mirei Mikagura") ||
    ["Angel", "Archangel", "Fallen Angel"].some((trait) => traits(definition).includes(trait))
  );
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.WhenDigivolving)
      return [
        whenDigivolving({
          source,
          effectKey: `${cardId}/trash-return`,
          description:
            "[When Digivolving] Trash 1 hand card to return Mirei or an Angel-family card from trash to hand.",
          resolve: async (ctx) => {
            const hand = ctx.game.player(source.ownerSeat).hand.map(({ instanceId }) => instanceId);
            if (hand.length === 0) return;
            const discarded = await ctx.ask.selectCards(ctx, { candidates: hand, min: 0, max: 1 });
            if (discarded.length !== 1) return;
            const trashed = await ctx.fx.trash(discarded, { byEffectSeat: source.ownerSeat });
            if (trashed.length !== 1) return;
            const candidates = ctx.game
              .player(source.ownerSeat)
              .trash.filter(
                (card) =>
                  !trashed.some(({ instanceId }) => instanceId === card.instanceId) &&
                  returnCandidate(ctx.game.definitionOf(card)),
              );
            if (candidates.length === 0) return;
            const chosen = await ctx.ask.selectCards(ctx, {
              candidates: candidates.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
            });
            if (chosen.length === 1) await ctx.fx.returnToHand(chosen);
          },
        }),
      ];
    if (timing !== EffectTiming.None) return [];
    return [
      staticModifier({
        source,
        effectKey: `${cardId}/memory-when-ange-mirei-played`,
        description: "[Your Turn][Once Per Turn] When Angewomon or Mirei is played, gain 1 memory.",
        maxPerTurn: 1,
        when: () => source.isOwnersTurn(),
        resolve: async (ctx) => {
          const self = source.permanent();
          if (self === undefined) return;
          ctx.fx.subscribeSubTrigger({
            event: "whenPlayed",
            sourcePermanentId: self.permanentId,
            once: false,
            oncePerTurnKey: `${source.instanceId}/${cardId}/memory`,
            description: "BT11-083 memory",
            matches: (subCtx) => {
              const id = subCtx.trigger.subjectPermanentId;
              const played = id === undefined ? undefined : subCtx.game.permanentById(id);
              return (
                played?.controllerSeat === source.ownerSeat &&
                played.topCard !== undefined &&
                ["Angewomon", "Mirei Mikagura"].some((name) =>
                  subCtx.game.definitionOf(played.topCard!).nameEn.includes(name),
                )
              );
            },
            run: async (subCtx) => {
              subCtx.fx.gainMemory(1);
            },
          });
        },
      }),
      staticModifier({
        source,
        effectKey: `${cardId}/inherited-retaliation-aura`,
        description:
          "Inherited [Opponent's Turn] With a yellow Digimon, all own Angel-family Digimon gain Retaliation.",
        isInherited: true,
        when: () => !source.isOwnersTurn(),
        resolve: async (ctx) => {
          const owner = ctx.game.player(source.ownerSeat);
          const hasYellow = owner.battleArea.some(
            (permanent) =>
              permanent.topCard !== undefined &&
              isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
              ctx.game.definitionOf(permanent.topCard).colors.includes(CardColor.Yellow),
          );
          if (!hasYellow) return;
          for (const permanent of owner.battleArea) {
            if (
              permanent.topCard !== undefined &&
              isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
              ["Angel", "Archangel", "Fallen Angel"].some((trait) =>
                traits(ctx.game.definitionOf(permanent.topCard!)).includes(trait),
              )
            ) {
              ctx.fx.grantKeyword(permanent.permanentId, "Retaliation", EffectDuration.Permanent);
            }
          }
        },
      }),
    ];
  },
};
registerCard(module);
