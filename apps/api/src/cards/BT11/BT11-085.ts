import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const playLevelThree: Action = {
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

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [playLevelThree] },
    { trigger: "WhenDigivolving", actions: [playLevelThree] },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", kind: ["Digimon"], byEffect: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-085", compiled);
