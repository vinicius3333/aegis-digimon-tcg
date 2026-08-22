// @ts-nocheck
import { getCompiledCard } from "@aegis/shared";
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const generated = getCompiledCard("EX5-065")!;
export const compiled: CompiledCard = structuredClone(generated);

// Replace the parser residual with the concrete add-digivolution watcher.
const yourTurn = compiled.effects.find((effect) => effect.trigger === "YourTurn");
if (yourTurn) {
  yourTurn.actions = [{
    kind: "SubTrigger",
    event: "onAddDigivolutionCards",
    sourceFilter: { controller: "mine", kind: ["Digimon"] },
    actions: [
      { kind: "Suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true, abortOnDecline: true },
      { kind: "GainMemory", amount: 1 },
    ],
  }];
}
compiled.coverage = "full";
compiled.residual = [];

registerIrCard("EX5-065", compiled);
