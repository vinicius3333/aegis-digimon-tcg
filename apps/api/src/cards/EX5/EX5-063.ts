import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** EX5-063 Leviamon — generated IR is the executable source of truth. */
export const compiled: CompiledCard = getCompiledCard("EX5-063")!;
// The generated [All Turns] clause did not model "When an opponent's Digimon is deleted, gain 1
// memory for each Digimon." That is a deletion watcher, not a continuous modifier: the
// onDeletionOf bus fires once per deleted permanent, so a flat +1 body already scales with a
// simultaneous batch (KB Q6037) and credits this card's controller rather than the turn player
// (KB Q6038). Digivolution-stack cards are not permanents and so never fire it.
compiled.effects = compiled.effects.filter((effect) => effect.trigger !== "AllTurns");
compiled.effects.push({
  trigger: "AllTurns",
  actions: [
    {
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [{ kind: "GainMemory", amount: 1 }],
      raw: "When an opponent's Digimon is deleted, gain 1 memory for each Digimon.",
    },
  ],
});
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-063", compiled);
