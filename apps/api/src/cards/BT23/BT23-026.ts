import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
              amount: -2000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  baseGrantedDigivolve: [
    {
      target: { namesExact: ["Antylamon"] },
      cost: 3,
      ignoreRequirements: true,
      condition: { kind: "tamerHasExactName", name: "Makiko Date" },
    },
  ],
  digivolutionRequirement: [
    {
      namesExact: ["Kokomon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["CS"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-026", compiled);
