import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentAction: CompiledCard["effects"][number] = {
  trigger: "OpponentsTurn",
  actions: [
    {
      kind: "SubTrigger",
      event: "whenOpponentAttacks",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [
        {
          kind: "Trash",
          target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, count: 5 },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Return",
          target: { filter: { controller: "any", kind: ["Tamer"] }, count: "all" },
          to: "hand",
        },
      ],
    },
    {
      kind: "SubTrigger",
      event: "whenAnyDigivolves",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [
        {
          kind: "Trash",
          target: { filter: { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }, count: 5 },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Return",
          target: { filter: { controller: "any", kind: ["Tamer"] }, count: "all" },
          to: "hand",
        },
      ],
    },
  ],
};

const compiled: CompiledCard = {
  digiXrosRequirement: [{ materials: [{ names: ["DarkKnightmon"] }, { names: ["Bagramon"] }], count: 3 }],
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play][When Digivolving] Delete 1 of your opponent's Digimon.",
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
          effectTextPart:
            "Then, you may place up to 5 Digimon cards with a [Bagra Army] trait from your trash into this Digimon's digivolution cards.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 5,
            upTo: true,
          },
          from: ["trash"],
          underFilter: { isSelfRef: true },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play][When Digivolving] Delete 1 of your opponent's Digimon.",
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
          effectTextPart:
            "Then, you may place up to 5 Digimon cards with a [Bagra Army] trait from your trash into this Digimon's digivolution cards.",
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Bagra Army"], match: "trait" }],
            },
            count: 5,
            upTo: true,
          },
          from: ["trash"],
          underFilter: { isSelfRef: true },
          optional: true,
        },
      ],
    },
    opponentAction,
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-111", compiled);
export { compiled };
