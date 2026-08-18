import { EffectTiming, isDigimon, isTamer, type Seat } from "@aegis/shared";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { activated, onDeletion } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT12-015";
const AGUNIMON = "Agunimon";
const BURNING_GREYMON = "BurningGreymon";
const TAKUYA = "Takuya Kanbara";

function memoryFor(ctx: EffectContext, seat: Seat): number {
  return seat === ctx.game.state.turnSeat ? ctx.game.state.memory : -ctx.game.state.memory;
}

function takuyaHosts(ctx: EffectContext, source: CardSource): string[] {
  return Array.from(ctx.game.player(source.ownerSeat).battleArea)
    .filter((permanent) => {
      if (permanent.topCard === undefined) return false;
      const definition = ctx.game.definitionOf(permanent.topCard);
      return isTamer(definition) && definition.nameEn === TAKUYA;
    })
    .map(({ permanentId }) => permanentId);
}

function trashCandidates(ctx: EffectContext, source: CardSource, name: string) {
  return Array.from(ctx.game.player(source.ownerSeat).trash).filter((card) => {
    const definition = ctx.game.definitionOf(card);
    return isDigimon(definition) && definition.nameEn === name;
  });
}

function canActivateHandMain(ctx: EffectContext, source: CardSource): boolean {
  return (
    memoryFor(ctx, source.ownerSeat) + 10 >= 3 &&
    takuyaHosts(ctx, source).length > 0 &&
    trashCandidates(ctx, source, AGUNIMON).length > 0 &&
    trashCandidates(ctx, source, BURNING_GREYMON).length > 0
  );
}

async function chooseOneTrashMaterial(
  ctx: EffectContext,
  source: CardSource,
  name: string,
): Promise<string | undefined> {
  const candidates = trashCandidates(ctx, source, name);
  const [chosen] = await ctx.ask.selectCards(ctx, {
    candidates: candidates.map(({ instanceId }) => instanceId),
    min: 1,
    max: 1,
    visibleCards: candidates.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
  });
  return chosen;
}

async function resolveHandMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const hosts = takuyaHosts(ctx, source);
  if (hosts.length === 0) return;
  const [hostPermanentId] = hosts.length === 1
    ? hosts
    : await ctx.ask.chooseTargets(ctx, { candidates: hosts, min: 1, max: 1 });
  if (hostPermanentId === undefined) return;

  const agunimon = await chooseOneTrashMaterial(ctx, source, AGUNIMON);
  if (agunimon === undefined) return;
  const burningGreymon = await chooseOneTrashMaterial(ctx, source, BURNING_GREYMON);
  if (burningGreymon === undefined) return;

  const selected = [agunimon, burningGreymon];
  const ordered = ctx.ask.orderCards === undefined
    ? selected
    : await ctx.ask.orderCards(ctx, {
        candidates: selected,
        visibleCards: Array.from(ctx.game.player(source.ownerSeat).trash)
          .filter(({ instanceId }) => selected.includes(instanceId))
          .map(({ instanceId, cardId }) => ({ instanceId, cardId })),
        destination: "stackBottom",
      });
  if (ordered.length !== 2) return;

  const placed = await ctx.fx.placeUnder(hostPermanentId, ordered, { belowTop: true });
  if (placed.length !== 2) return;
  await ctx.fx.digivolveFromInstance(hostPermanentId, source.instanceId, {
    payCost: true,
    costOverride: 3,
    ignoreRequirements: true,
  });
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing, source): Effect[] {
    if (timing === EffectTiming.OnDeclaration) {
      return [activated({
        source,
        effectKey: `${cardId}/hand-main-stack-and-digivolve`,
        description:
          "[Hand][Main] Place Agunimon and BurningGreymon from trash under Takuya, " +
          "then digivolve into Aldamon for the digivolution cost.",
        isFromHand: true,
        canActivate: (ctx) => canActivateHandMain(ctx, source),
        resolve: (ctx) => resolveHandMain(ctx, source),
      })];
    }
    if (timing === EffectTiming.OnDestroyedAnyone) {
      return [onDeletion({
        source,
        effectKey: `${cardId}/return-takuya`,
        description: "[On Deletion] Return Takuya Kanbara from trash to hand.",
        resolve: async (ctx) => {
          const cards = ctx.game.player(source.ownerSeat).trash.filter((card) =>
            isTamer(ctx.game.definitionOf(card)) && ctx.game.definitionOf(card).nameEn.includes(TAKUYA)
          );
          if (cards.length === 0) return;
          const selected = await ctx.ask.selectCards(ctx, {
            candidates: cards.map(({ instanceId }) => instanceId),
            min: 1,
            max: 1,
            visibleCards: cards.map(({ instanceId, cardId: visibleCardId }) => ({ instanceId, cardId: visibleCardId })),
          });
          if (selected.length > 0) await ctx.fx.returnToHand(selected);
        },
      })];
    }
    return [];
  },
};

registerCard(module);
export default module;
