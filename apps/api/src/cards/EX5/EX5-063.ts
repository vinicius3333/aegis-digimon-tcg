// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-063 Leviamon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = getCompiledCard("EX5-063")!;
compiled.effects = compiled.effects.filter((effect) => effect.trigger !== "AllTurns");
compiled.effects.push({
  trigger: "OnDestroyedAnyone",
  actions: [{ kind: "GainMemoryForDeletedDigimons" }],
});
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-063", compiled);
