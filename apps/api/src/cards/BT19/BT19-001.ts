import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Xros Heart", "Blue Flare"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            raw: "By placing 1 Digimon card with the [Xros Heart]/[Blue Flare] trait rom your hand under any of your Tamers",
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-001", compiled);
