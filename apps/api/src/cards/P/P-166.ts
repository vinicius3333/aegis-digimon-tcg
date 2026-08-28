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
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
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
                tokens: ["Bird", "Avian"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          raw: "reduce this effect's digivolution cost by 1",
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
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
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
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
                tokens: ["Bird", "Avian"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          mode: "reduceCost",
          amount: 1,
          raw: "reduce this effect's digivolution cost by 1",
          scaling: {
            per: 1,
            filter: {
              controllerDefault: "mine",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
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
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-166", compiled);
