import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-026")!);
const watcher = compiled.effects.find((effect) => effect.trigger === "AllTurns");
if (watcher !== undefined) {
  watcher.actions = [{
    kind: "SubTrigger",
    event: "whenDigivolutionTrashed",
    sourceFilter: { controller: "opponent", kind: ["Digimon"] },
    actions: [{ kind: "GainMemory", amount: 1 }],
  }];
}

registerIrCard("BT12-026", compiled);

export default compiled;
