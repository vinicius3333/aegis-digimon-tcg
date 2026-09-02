import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const handDigimon: Filter = { controller: "mine", zone: "hand", kind: ["Digimon"] };
const myotismonText: Filter = { nameOrTrait: [{ tokens: ["Myotismon"], match: "text" }] };
const body: Action[] = [
  {
    kind: "CostGatedBlock",
    cost: { kind: "trash", target: { filter: handDigimon, count: 1 }, storeAs: "trashedDigimonLevel" },
    actions: [
      {
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"], levelLte: "trashedDigimonLevel" }, count: 1 },
      },
      {
        kind: "Draw",
        controller: "mine",
        amount: 2,
        condition: { kind: "lastTrashedMatchesFilter", filter: myotismonText },
      },
    ],
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: body },
    { trigger: "Security", actions: body, isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-099", compiled);
