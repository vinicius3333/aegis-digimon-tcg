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
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          // The reduction applies to this effect's own digivolution. A sibling
          // wouldDigivolve replacement would only be installed after this action
          // resolves, so it could never affect the payment.
          reduceCostScaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "any",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
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
          payCost: true,
          optional: true,
          condition: {
            kind: "isYourTurn",
            raw: "it's your turn",
          },
          reduceCostScaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "any",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
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
