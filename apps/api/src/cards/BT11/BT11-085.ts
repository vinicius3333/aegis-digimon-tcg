// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playLevelThree: any = {
  kind: "PlayWithoutCost",
  target: {
    filter: {
      controller: "mine",
    kind: ["Digimon"],
      colors: ["Blue", "Purple"],
      levels: [3],
      hostFilter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue", "Purple"] },
    },
    count: 1,
  },
  from: ["digivolutionCards"],
  payCost: false,
  optional: true,
};

const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [playLevelThree] },
    { trigger: "WhenDigivolving", actions: [playLevelThree] },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "SubTrigger",
        event: "whenPlayed",
        sourceFilter: { controllerDefault: "mine", kind: ["Digimon"] },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-085", compiled);
