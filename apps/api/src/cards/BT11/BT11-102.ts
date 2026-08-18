import { EffectDuration, EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition } from "@aegis/shared";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT11-102";
function hasInsect(definition: CardDefinition): boolean {
  return [...(definition.types ?? []), ...(definition.forms ?? []), ...(definition.attributes ?? [])].some((trait) =>
    trait.includes("Insect"),
  );
}
async function suspendOpponents(ctx: EffectContext, source: CardSource, maximumDP?: number): Promise<string[]> {
  const candidates = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined &&
        !permanent.isSuspended &&
        isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
        (maximumDP === undefined || permanent.currentDP <= maximumDP),
    )
    .map(({ permanentId }) => permanentId);
  const count = Math.min(2, candidates.length);
  if (count === 0) return [];
  const chosen = await ctx.ask.chooseTargets(ctx, { candidates, min: count, max: count });
  if (chosen.length > 0) await ctx.fx.suspend(chosen, { byEffectSeat: source.ownerSeat });
  return chosen;
}
async function main(ctx: EffectContext, source: CardSource): Promise<void> {
  const insects = ctx.game
    .player(source.ownerSeat)
    .battleArea.filter(
      (permanent) =>
        permanent.topCard !== undefined &&
        isDigimon(ctx.game.definitionOf(permanent.topCard)) &&
        hasInsect(ctx.game.definitionOf(permanent.topCard)),
    );
  if (insects.length === 0) return;
  const selected = await ctx.ask.chooseTargets(ctx, {
    candidates: insects.map(({ permanentId }) => permanentId),
    min: 1,
    max: 1,
  });
  const insect = selected[0] === undefined ? undefined : ctx.game.permanentById(selected[0]);
  if (insect === undefined) return;
  const suspended = await suspendOpponents(ctx, source, insect.currentDP);
  if (suspended.length === 0) return;
  const lock = await ctx.ask.chooseTargets(ctx, { candidates: suspended, min: 1, max: 1 });
  if (lock[0] !== undefined) ctx.fx.restrict(lock[0], "unsuspend", EffectDuration.UntilNextUntap);
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
            "[Main] Use an Insect Digimon's DP to suspend 2 opposing Digimon, then prevent 1 suspended Digimon from unsuspending next phase.",
          resolve: async (ctx) => main(ctx, source),
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Suspend 2 opposing Digimon.",
          resolve: async (ctx) => {
            await suspendOpponents(ctx, source);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
