// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-043")!;
export const compiled: CompiledCard = structuredClone(generated);

// The generated record already contains the printed play trigger; attach the
// supported dynamic DP ceiling and retire its stale residual marker.
const playTrigger = compiled.effects.find((effect) => effect.trigger === "YourTurn" && !effect.isInherited);
for (const effect of compiled.effects ?? []) {
  if (effect.trigger !== "Main" && effect.trigger !== "WhenDigivolving") continue;
  effect.sharedUseKey = "ir-shared-0";
  effect.actions = effect.actions.filter((action) => action.kind !== "Replacement");
  const play = effect.actions.find((action) => action.kind === "PlayWithoutCost");
  if (play?.kind === "PlayWithoutCost") {
    play.reduceCostBy = 4;
    play.reduceCostByIf = {
      amount: 3,
      condition: {
        kind: "selfDigivolutionStackHasTrait",
        filter: {
          nameOrTrait: [
            { tokens: ["Leopardmon"], match: "name" },
            { tokens: ["X Antibody"], match: "nameExact" },
          ],
        },
        raw: "a card with [Leopardmon] in its name or [X Antibody] is in this Digimon's digivolution cards",
      },
    };
  }
}
const playWatcher = playTrigger?.actions.find((action) => action.kind === "SubTrigger");
if (playWatcher?.kind === "SubTrigger") {
  const bounce = playWatcher.actions.find((action) => action.kind === "Return");
  if (bounce?.kind === "Return") {
    bounce.target.filter.dp = { op: "lte", value: 5000 };
    bounce.dpCeilingScaling = {
      amount: 3000,
      per: 1,
      filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true },
      unit: "cards",
    };
  }
  playTrigger.actions = [playWatcher];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-043", compiled);
