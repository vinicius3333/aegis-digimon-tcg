import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q1267: the hand-size branch is decided when the effect resolves; reaching
// eight cards after a hand return does not re-enter the deck-bottom branch.
const target: Target = {
  filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
  count: 1,
  bindAs: "fullMoonTarget",
};

const mainActions: Action[] = [
  { kind: "SelectBind", target },
  {
    kind: "Return",
    target: { filter: {}, count: 1, fromSelectionRef: "fullMoonTarget" },
    to: "deckBottom",
    condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "gte", value: 8 },
  },
  {
    kind: "Return",
    target: { filter: {}, count: 1, fromSelectionRef: "fullMoonTarget" },
    to: "hand",
    condition: { kind: "zoneCount", seat: "opponent", zone: "hand", op: "lt", value: 8 },
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: mainActions },
    { trigger: "Security", actions: mainActions, isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-103", compiled);
