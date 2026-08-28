import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 3,
            upTo: true,
            from: ["trash"],
          },
          underFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
          position: "bottom",
          optional: true,
        },
        {
          kind: "SelectBind",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, bindAs: "movedDigimon" },
          optional: true,
        },
        {
          kind: "PlaceUnder",
          target: { filter: {}, count: 1, fromSelectionRef: "movedDigimon" },
          targetIsPermanent: true,
          underFilter: { controller: "opponent", kind: ["Digimon"] },
          position: "bottom",
          shedOwnCards: true,
          optional: true,
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
          },
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT11-109", compiled);
