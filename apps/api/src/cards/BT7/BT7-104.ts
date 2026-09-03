import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const main: CompiledCard["effects"][number]["actions"] = [
  {
    kind: "SelectBind",
    target: {
      filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["X-Antibody"], match: "trait" }] },
      count: 1,
      bindAs: "xAntibodyTarget",
    },
  },
  {
    kind: "Draw",
    controller: "mine",
    amount: 1,
    scaling: { per: 1, unit: "digivolutionCardsOfFiltered", filter: { boundRef: "xAntibodyTarget" } },
    raw: "Draw 1 for each digivolution card of the chosen Digimon.",
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: main },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "AddToHandSelf" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-104", compiled);
