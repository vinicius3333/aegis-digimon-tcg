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
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["ADVENTURE"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "zoneColorCount",
            cardType: "Tamer",
            filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
            op: "gte",
            value: 3,
            raw: "your Tamers with the [ADVENTURE] trait have 3 or more total colors",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["ADVENTURE"],
                match: "trait",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "zoneColorCount",
            cardType: "Tamer",
            filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
            op: "gte",
            value: 3,
            raw: "your Tamers with the [ADVENTURE] trait have 3 or more total colors",
          },
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
      traits: ["ADVENTURE"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST21-08", compiled);
