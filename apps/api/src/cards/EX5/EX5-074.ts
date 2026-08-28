// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-074")!;
export const compiled: CompiledCard = structuredClone(generated);
for (const effect of compiled.effects) {
  for (const action of effect.actions) {
    if (action.kind === "ModifyDP" && action.cost?.kind === "return") {
      action.scaling = { per: 1, usePaidCount: true, unit: "cards" };
    }
  }
}
const allTurns = compiled.effects.find((effect) => effect.trigger === "AllTurns");
if (allTurns) {
  allTurns.actions = [
    {
      kind: "GrantStatic",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      grant: "immuneToOpponentDigimonEffects",
      duration: "permanent",
    },
  ];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-074", compiled);
