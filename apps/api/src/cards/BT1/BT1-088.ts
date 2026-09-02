import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      condition: { kind: "youHaveGreenLevelAtLeastInBattle", value: 5 },
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 1,
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          add: [{ filter: { kind: ["Digimon"] }, count: 1, to: "hand" }],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["security"],
          payCost: false,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-088", compiled);
export default compiled;
