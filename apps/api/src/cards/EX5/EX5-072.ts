// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-072")!;
export const compiled: CompiledCard = structuredClone(generated);

// Q3685: exclude this card and count each qualifying trash name once.
const reduction = compiled.effects
  .find((effect) => effect.trigger === "Static")
  ?.actions.find((action) => action.kind === "ReducePlayCost");
if (reduction?.kind === "ReducePlayCost") {
  reduction.scaling.filter.uniqueByName = true;
  reduction.scaling.filter.excludeSelf = true;
}

compiled.coverage = "full";
compiled.residual = [];
registerIrCard("EX5-072", compiled);
