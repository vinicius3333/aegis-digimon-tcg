import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dnaBody = [
  {
    effectTextPart: "[On Play] [When Digivolving] Delete 1 of your opponent's Digimon with 3000 DP or less.",
    kind: "Delete",
    target: {
      filter: {
        controller: "opponent",
        kind: ["Digimon"],
        dp: { op: "lte", value: 3000 },
      },
      count: 1,
    },
  },
  {
    effectTextPart:
      "Then, if it's your turn, 2 of your Digimon may DNA digivolve into a Digimon card with [Imperialdramon] in its name or the [Free] trait in the hand.",
    kind: "DnaDigivolve",
    materials: {
      filter: {
        controller: "mine",
        kind: ["Digimon"],
      },
      count: 2,
    },
    into: {
      controllerDefault: "mine",
      kind: ["Digimon"],
      zone: "hand",
      nameOrTrait: [
        { tokens: ["Imperialdramon"], match: "name" },
        { tokens: ["Free"], match: "trait" },
      ],
    },
    payCost: true,
    optional: true,
    condition: { kind: "isYourTurn", raw: "it's your turn" },
  },
] satisfies Action[];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: dnaBody,
    },
    {
      trigger: "WhenDigivolving",
      actions: dnaBody,
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ] satisfies Action[],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-011", compiled);
