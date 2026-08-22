// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentLv4 = { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } };
const tamerBottomCost = { kind: "trashBottomFaceDownUnderTamer", controller: "mine" };
const trashOpponentHand = { kind: "Trash", chooser: "opponent", target: { filter: { controllerDefault: "opponent", zone: "hand" }, count: 1 }, cost: tamerBottomCost, optional: true };
const reactInto = { controllerDefault: "mine", zone: "trash", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ravemon"], match: "name" }, { tokens: ["DATA SQUAD"], match: "trait" }] };
const reactiveDigivolve = { kind: "Digivolve", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, into: { filter: reactInto, count: 1 }, from: ["trash"], payCost: true, costDelta: -1, optional: true };
const avianTrash = { controllerDefault: "mine", zone: "trash", kind: ["Digimon", "Tamer"], playCostLte: 5, nameOrTrait: [
  { tokens: ["Avian"], match: "trait" }, { tokens: ["Bird"], match: "trait" }, { tokens: ["DATA SQUAD"], match: "trait" },
] };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [
      { kind: "Delete", target: { filter: opponentLv4, count: 1 } },
      trashOpponentHand,
    ] },
    { trigger: "YourTurn", actions: [
      { kind: "SubTrigger", event: "whenHandTrashed", sourceFilter: { isSelfRef: true }, frequency: "OncePerTurn", actions: [reactiveDigivolve] },
      { kind: "SubTrigger", event: "whenDigivolutionTrashed", sourceFilter: { isSelfRef: true }, frequency: "OncePerTurn", actions: [reactiveDigivolve] },
    ] },
    { trigger: "OnDeletion", isInherited: true, actions: [{ kind: "PlayWithoutCost", target: { filter: avianTrash, count: 1 }, from: ["trash"], payCost: false, optional: true }] },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-076", compiled);
