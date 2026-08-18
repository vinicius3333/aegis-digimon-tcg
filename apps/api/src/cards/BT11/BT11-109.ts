import { EffectTiming, isDigimon, isTamer } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-109";
function hasBagraArmy(definition: CardDefinition): boolean {
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])].includes(
    "Bagra Army",
  );
}
async function main(ctx: EffectContext, source: CardSource): Promise<void> {
  const owner = ctx.game.player(source.ownerSeat);
  const hosts = owner.battleArea.filter(
    (permanent) =>
      permanent.topCard !== undefined &&
      (isDigimon(ctx.game.definitionOf(permanent.topCard)) || isTamer(ctx.game.definitionOf(permanent.topCard))),
  );
  const materials = owner.trash.filter(
    (card) => isDigimon(ctx.game.definitionOf(card)) && hasBagraArmy(ctx.game.definitionOf(card)),
  );
  if (hosts.length > 0 && materials.length > 0) {
    const chosenHost = await ctx.ask.chooseTargets(ctx, {
      candidates: hosts.map(({ permanentId }) => permanentId),
      min: 1,
      max: 1,
    });
    const chosenCards = await ctx.ask.selectCards(ctx, {
      candidates: materials.map(({ instanceId }) => instanceId),
      min: 0,
      max: Math.min(3, materials.length),
    });
    if (chosenHost[0] !== undefined && chosenCards.length > 0)
      await ctx.fx.placeUnder(chosenHost[0], chosenCards, { belowTop: true });
  }
  const hasBagra = owner.battleArea.some(
    (permanent) => permanent.topCard !== undefined && hasBagraArmy(ctx.game.definitionOf(permanent.topCard)),
  );
  if (!hasBagra) return;
  const opponents = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) => permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
    );
  if (opponents.length < 2) return;
  const moved = await ctx.ask.chooseTargets(ctx, {
    candidates: opponents.map(({ permanentId }) => permanentId),
    min: 1,
    max: 1,
  });
  const movedId = moved[0];
  if (movedId === undefined) return;
  const destinations = opponents
    .filter(({ permanentId }) => permanentId !== movedId)
    .map(({ permanentId }) => permanentId);
  const destination = await ctx.ask.chooseTargets(ctx, { candidates: destinations, min: 1, max: 1 });
  if (destination[0] !== undefined)
    await ctx.fx.relocatePermanentByEffect?.(destination[0], movedId, { belowTop: true, shedOwnCards: true });
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description:
            "[Main] Place up to 3 Bagra Army Digimon from trash under an own Digimon/Tamer, then place an opposing Digimon under another.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's [Main] effect.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    return [];
  },
};
registerCard(module);
