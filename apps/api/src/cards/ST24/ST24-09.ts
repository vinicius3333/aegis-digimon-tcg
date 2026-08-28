// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "PlaceUnder",
          fromDeckTop: true,
          target: {
            filter: {
              controller: "mine",
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              {
                tokens: ["DATA SQUAD"],
                match: "trait",
              },
            ],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "PlaceUnder",
          fromDeckTop: true,
          target: {
            filter: {
              controller: "mine",
            },
            count: 1,
          },
          underFilter: {
            controller: "mine",
            kind: ["Tamer"],
            nameOrTrait: [
              {
                tokens: ["DATA SQUAD"],
                match: "trait",
              },
            ],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["DATA SQUAD"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST24-09", compiled);
