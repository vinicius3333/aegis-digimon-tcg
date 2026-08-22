// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-063 Leviamon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = getCompiledCard("EX5-063")!;
const deletionWatcher = compiled.effects.find((effect) => effect.trigger === "AllTurns");
if (deletionWatcher) {
  deletionWatcher.frequency = "OncePerTurn";
  deletionWatcher.actions = [{
    kind: "SubTrigger",
    event: "onDeletionOf",
    sourceFilter: { controller: "opponent", kind: ["Digimon"] },
    actions: [{ kind: "GainMemoryForDeletedDigimons" }],
  }];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-063", compiled);
