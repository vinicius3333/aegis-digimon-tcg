import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  cardId: "BT3-093",
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Blue"] },
              count: 1,
              to: "hand",
              optional: true,
            },
            {
              filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"] },
              count: 1,
              to: "hand",
              optional: true,
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-093", compiled);
export default compiled;
