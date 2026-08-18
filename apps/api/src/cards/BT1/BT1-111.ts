import { EffectTiming, isDigimon } from "@aegis/shared";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import { activated, security } from "../../engine/effects/builders.js";
import { registerCard } from "../../engine/effects/registry.js";
const cardId = "BT1-111";
async function resolveModal(ctx: EffectContext, source: CardSource): Promise<void> {
  const all = ctx.game
    .player(ctx.game.opponentOf(source.ownerSeat))
    .battleArea.filter((p) => p.topCard !== undefined && isDigimon(ctx.game.definitionOf(p.topCard)))
    .map((p) => p.permanentId);
  if (!all.length) return;
  const lowDP = all.filter((permanentId) => (ctx.game.permanentById(permanentId)?.currentDP ?? Infinity) <= 5000);
  const modes = [{ label: "Suspend 1 opposing Digimon", candidates: all, count: 1 }];
  if (lowDP.length >= 2) {
    modes.push({
      label: "Suspend 2 opposing Digimon with 5000 DP or less",
      candidates: lowDP,
      count: 2,
    });
  }
  const modeIndex =
    modes.length === 1
      ? 0
      : await ctx.ask.chooseOption(
          ctx,
          modes.map(({ label }) => label),
        );
  const mode = modes[modeIndex] ?? modes[0]!;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: mode.candidates,
    min: mode.count,
    max: mode.count,
  });
  await ctx.fx.suspend(chosen);
}
const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption)
      return [
        activated({
          source,
          effectKey: `${cardId}/main`,
          description: "[Main] Suspend 1 opposing Digimon or 2 with 5000 DP or less.",
          resolve: async (ctx) => {
            await resolveModal(ctx, source);
          },
        }),
      ];
    if (timing === EffectTiming.SecuritySkill)
      return [
        security({
          source,
          effectKey: `${cardId}/security`,
          description: "[Security] Activate this card's Main effect.",
          resolve: async (ctx) => {
            await resolveModal(ctx, source);
          },
        }),
      ];
    return [];
  },
};
registerCard(module);
export default module;
