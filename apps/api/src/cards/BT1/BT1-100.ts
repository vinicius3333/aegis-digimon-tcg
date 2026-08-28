// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const sourceLess = { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" };
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Restrict",
          target: { filter: sourceLess, count: "all" },
          whileMatchesTargetFilter: true,
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Restrict",
          target: { filter: sourceLess, count: "all" },
          whileMatchesTargetFilter: true,
          restriction: "attack",
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-100", compiled);
export default compiled;
