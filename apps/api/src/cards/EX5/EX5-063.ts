// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-063 Leviamon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = getCompiledCard("EX5-063")!;
const deletionWatcher = compiled.effects.find((effect) => effect.trigger === "AllTurns");
const deletionTrigger = deletionWatcher?.actions.find((action) => action.kind === "SubTrigger");
if (deletionTrigger?.kind === "SubTrigger") {
  const gain = deletionTrigger.actions.find((action) => action.kind === "GainMemory");
  if (gain?.kind === "GainMemory") {
    gain.scaling = { per: 1, unit: "deletedDigimons" };
  }
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-063", compiled);
