// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentHand = { zone: "hand", controller: "opponent" };
const opponentDigimon = { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 7, scaling: { per: 3, unit: "cards", filter: opponentHand, levelCeilingAdd: -1 } } };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isFromTrash: true,
      actions: [{
        kind: "SubTrigger",
        event: "whenOneOfYoursDigivolves",
        sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Barbamon (X Antibody)"], match: "nameExact" }] },
        raw: "when your Digimon digivolves into [Barbamon (X Antibody)]",
        actions: [
          { kind: "Return", to: "deckBottom", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
          { kind: "ActivateMain" },
        ],
      }],
    },
    {
      trigger: "Main",
      actions: [
        { kind: "Trash", chooser: "opponent", target: { filter: opponentHand, count: 1 }, condition: { kind: "handAtLeast", seat: "opponent", value: 5 } },
        { kind: "Delete", target: { filter: opponentDigimon, count: 1 } },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX8-072", compiled);
