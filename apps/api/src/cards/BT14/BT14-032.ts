import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] Add the top card of your security stack to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart:
            "Then, you may place 1 card with [Sukamon] in its name from your hand on top of your security stack.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [
                {
                  tokens: ["Sukamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          toTop: true,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-032", compiled);
