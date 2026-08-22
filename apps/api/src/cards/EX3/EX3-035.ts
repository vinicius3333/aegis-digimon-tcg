// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      optional: true,
      actions: [
        {
          kind: "Return",
          target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Four Great Dragons"], match: "trait" }] }, count: 1 },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        { kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -6000, duration: "forTheTurn" },
        { kind: "Return", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Magnadramon"], match: "name" }] }, count: 1 }, to: "deckBottom", bindResultAs: "magnadramon" },
        { kind: "Return", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Azulongmon"], match: "name" }] }, count: 1 }, to: "deckBottom", bindResultAs: "azulongmon" },
        { kind: "Return", target: { filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Megidramon"], match: "name" }] }, count: 1 }, to: "deckBottom", bindResultAs: "megidramon" },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 2,
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "bindingExists", ref: "magnadramon" },
              { kind: "bindingExists", ref: "azulongmon" },
              { kind: "bindingExists", ref: "megidramon" },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-035", compiled);
