import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] If your opponent has 5 or fewer security cards, they place 1 card from their hand as the bottom security card.",
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "opponent",
          amount: 1,
          source: "hand",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "security",
            op: "lte",
            value: 5,
            raw: "your opponent has 5 or fewer security cards",
          },
        },
        {
          effectTextPart: "Then, trash their top security card.",
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] If your opponent has 5 or fewer security cards, they place 1 card from their hand as the bottom security card.",
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "opponent",
          amount: 1,
          source: "hand",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "security",
            op: "lte",
            value: 5,
            raw: "your opponent has 5 or fewer security cards",
          },
        },
        {
          effectTextPart: "Then, trash their top security card.",
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
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
          amount: 4000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-024", compiled);
