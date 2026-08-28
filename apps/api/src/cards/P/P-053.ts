// @ts-nocheck
// Hand-authored override for P-053.
// runtime-effect fix: the [When Attacking] effect also lowers ALL opponent Security Digimon
// by -2000 for the turn ("1 of your opponent's Digimon AND all of your opponent's
// Security Digimon"). Added the missing ModifySecurityDP action.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
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
          amount: -5000,
          duration: "forTheTurn",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer in play",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
          amount: -2000,
          duration: "forTheTurn",
        },
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -2000,
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-053", compiled);
