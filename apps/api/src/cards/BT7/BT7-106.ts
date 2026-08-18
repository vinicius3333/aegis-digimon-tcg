import { EffectTiming, isDigimon } from "@aegis/shared";
import type { CardDefinition, Permanent } from "@aegis/shared";
import { activated, security } from "../../engine/effects/builders.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import type { Effect } from "../../engine/effects/Effect.js";
import type { EffectContext } from "../../engine/effects/EffectContext.js";
import type { EffectModule } from "../../engine/effects/EffectModule.js";
import { matchNameOrTrait } from "../../engine/effects/interpreter.js";
import { registerCard } from "../../engine/effects/registry.js";

const cardId = "BT7-106";

function isXAntibody(def: CardDefinition): boolean {
  return matchNameOrTrait(def, { tokens: ["X-Antibody"], match: "trait" });
}

function opposingDigimon(ctx: EffectContext, source: CardSource): Permanent[] {
  return ctx.game.player(ctx.game.opponentOf(source.ownerSeat)).battleArea.filter((permanent) =>
    permanent.topCard !== undefined && isDigimon(ctx.game.definitionOf(permanent.topCard)),
  );
}

function hasLoadedXAntibody(ctx: EffectContext, source: CardSource): boolean {
  return ctx.game.player(source.ownerSeat).battleArea.some((permanent) =>
    permanent.topCard !== undefined &&
    permanent.stack.length >= 5 &&
    isXAntibody(ctx.game.definitionOf(permanent.topCard)),
  );
}

async function resolveMain(ctx: EffectContext, source: CardSource): Promise<void> {
  const opponents = opposingDigimon(ctx, source);
  const normal = opponents.filter((permanent) =>
    ctx.game.definitionOf(permanent.topCard!).playCost <= 6,
  );
  const upgraded = hasLoadedXAntibody(ctx, source)
    ? opponents.filter((permanent) => !isXAntibody(ctx.game.definitionOf(permanent.topCard!)))
    : [];

  let candidates = normal;
  if (upgraded.length > 0) {
    if (normal.length === 0) {
      candidates = upgraded;
    } else {
      const choice = await ctx.ask.chooseOption(ctx, [
        "Delete a Digimon with play cost 6 or less.",
        "Instead, delete a Digimon without X-Antibody in its traits.",
      ]);
      if (choice === 1) candidates = upgraded;
    }
  }
  if (candidates.length === 0) return;
  const chosen = await ctx.ask.chooseTargets(ctx, {
    candidates: candidates.map((permanent) => permanent.permanentId),
    min: 1,
    max: 1,
  });
  if (chosen.length > 0) await ctx.fx.deletePermanent(chosen);
}

const module: EffectModule = {
  cardId,
  effectsForTiming(timing: EffectTiming, source: CardSource): Effect[] {
    if (timing === EffectTiming.OnUseOption) {
      return [activated({
        source,
        effectKey: `${cardId}/main`,
        description:
          "Delete 1 opposing Digimon with play cost 6 or less, or use the X-Antibody alternative instead.",
        optional: false,
        resolve: (ctx) => resolveMain(ctx, source),
      })];
    }
    if (timing === EffectTiming.SecuritySkill) {
      return [security({
        source,
        effectKey: `${cardId}/security`,
        description: "[Security] Activate this card's [Main] effect.",
        optional: false,
        resolve: (ctx) => resolveMain(ctx, source),
      })];
    }
    return [];
  },
};

registerCard(module);
export default module;
