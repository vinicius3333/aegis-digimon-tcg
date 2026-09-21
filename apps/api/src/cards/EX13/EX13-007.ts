import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const returnFromTrash = (): Action[] => [
  {
    kind: "Trash",
    target: {
      filter: {
        zone: "hand",
        controller: "mine",
      },
      count: 1,
    },
    raw: "By trashing 1 card in your hand",
    optional: true,
    abortOnDecline: true,
  },
  {
    kind: "Return",
    target: {
      filter: {
        zone: "trash",
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [
          {
            tokens: ["Gallantmon"],
            match: "name",
          },
        ],
        orFilters: [
          {
            zone: "trash",
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Red"],
          },
        ],
      },
      count: 1,
    },
    to: "hand",
    optional: true,
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: returnFromTrash(),
    },
    {
      trigger: "OnPlay",
      actions: returnFromTrash(),
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 2000,
          scope: "self",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("EX13-007", compiled);
