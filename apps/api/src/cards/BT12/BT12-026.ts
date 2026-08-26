import { getCompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled = structuredClone(getCompiledCard("BT12-026")!);
const whenDigivolving = compiled.effects.find((effect) => effect.trigger === "WhenDigivolving");
const placementCost = whenDigivolving?.actions[0]?.cost;
if (whenDigivolving !== undefined && typeof placementCost === "object") {
  whenDigivolving.actions = [
    {
      kind: "TrashDigivolution",
      target: {
        filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
        count: 2,
      },
      amount: 2,
      fromTop: false,
      cost: placementCost,
      optional: true,
      abortOnDecline: true,
    },
  ];
}
const watcher = compiled.effects.find((effect) => effect.trigger === "AllTurns");
if (watcher !== undefined) {
  watcher.actions = [
    {
      kind: "SubTrigger",
      event: "whenDigivolutionTrashed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [{ kind: "GainMemory", amount: 1 }],
    },
  ];
}

registerIrCard("BT12-026", compiled);

export default compiled;
