// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Inherited [When Attacking][Once Per Turn]: This Digimon linked with [Maquinamon] may
//   digivolve into a Digimon card with [Maquinamon] in its text in the hand with the
//   digivolution cost reduced by 2.
// "linked with [Maquinamon]" = the host Digimon must have a card named [Maquinamon]
//   in its linked list. Q5793's broad "in its text" matcher applies only to the
//   separately worded digivolution destination.
// `hasLinkedWith` filter is a new engine capability (see LANE_F.md).
// `reduceCost: 2` is valid on DigivolveAction (ir.ts:1006).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      condition: {
        kind: "hostHasLinkedWith",
        filter: {
          nameOrTrait: [
            {
              tokens: ["Maquinamon"],
              match: "name",
            },
          ],
        },
        raw: "This Digimon linked with [Maquinamon]",
      },
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
                tokens: ["Maquinamon"],
                match: "text",
              },
            ],
          },
          from: ["hand"],
          reduceCost: 2,
          payCost: true,
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-006", compiled);
