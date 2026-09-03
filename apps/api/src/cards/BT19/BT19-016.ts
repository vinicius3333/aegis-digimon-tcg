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
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Blue Flare"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 [Blue Flare] trait Digimon card from your hand under any of your Tamers",
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Blue Flare"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 [Blue Flare] trait Digimon card from your hand under any of your Tamers",
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-016", compiled);
