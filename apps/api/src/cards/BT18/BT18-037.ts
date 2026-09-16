import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          searchZone: "security",
          filter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Hybrid", "Ten Warriors"],
                match: "trait",
              },
            ],
          },
          count: 1,
          to: "hand",
          bindResultAs: "searched",
          optional: true,
        },
        {
          kind: "Recover",
          amount: 1,
          condition: {
            kind: "bindingExists",
            ref: "searched",
            raw: "if you added",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "hand",
            op: "lte",
            value: 7,
            raw: "you have 7 or fewer cards in your hand",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Koji Minamoto"],
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
    },
    {
      names: ["KendoGarurumon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT18-037", compiled);
