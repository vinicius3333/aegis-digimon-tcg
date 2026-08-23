// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          add: [
            { filter: { controllerDefault: "mine", kind: ["Digimon"], levels: [3] }, count: 1, to: "hand" },
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Tamer"],
                colors: ["Red", "Blue", "Yellow", "Green", "Black", "Purple"],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      attackScope: "opponent",
      actions: [
        {
          kind: "MovePermanent",
          direction: "toBattle",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], location: "breedingArea", dp: { op: "gt", value: 0 } },
            count: 1,
            cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1 } },
            optional: true,
          },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT14-088", compiled);
