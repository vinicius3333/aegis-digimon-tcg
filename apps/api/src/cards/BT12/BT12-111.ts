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
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
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
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        {
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
