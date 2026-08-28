// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentLv4 = { controllerDefault: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 } };
const tamerBottomCost = { kind: "trashBottomFaceDownUnderTamer", controller: "mine" };
const trashOpponentHand = {
  kind: "CostGatedBlock",
  cost: { ...tamerBottomCost, count: 1 },
  optional: true,
  abortOnDecline: true,
  actions: [
    {
      kind: "Trash",
      chooser: "opponent",
      target: { filter: { controllerDefault: "opponent", zone: "hand" }, count: 1 },
    },
  ],
};
const reactInto = {
  controllerDefault: "mine",
  zone: "trash",
  kind: ["Digimon"],
  nameOrTrait: [
    // "[Ravemon]" is a bracket-only card reference (§2-3-1-2): exact name, so
    // "Ravemon: Burst Mode" does not qualify.
    { tokens: ["Ravemon"], match: "nameExact" },
    { tokens: ["DATA SQUAD"], match: "trait" },
  ],
};
const reactiveDigivolve = {
  kind: "Digivolve",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  into: { filter: reactInto, count: 1 },
  from: ["trash"],
  payCost: true,
  costDelta: -1,
  optional: true,
};
const avianTrash = {
  controllerDefault: "mine",
  zone: "trash",
  kind: ["Digimon", "Tamer"],
  playCostLte: 5,
  nameOrTrait: [
    // "[Avian] or [Bird] in any of its traits" is the substring form (§2-3-2-4), so
    // "Mysterious Bird" / "Giant Bird" qualify; "the [DATA SQUAD] trait" stays exact (§2-3-2-3).
    { tokens: ["Avian"], match: "traitContains" },
    { tokens: ["Bird"], match: "traitContains" },
    { tokens: ["DATA SQUAD"], match: "trait" },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [{ kind: "Delete", target: { filter: opponentLv4, count: 1 } }, trashOpponentHand],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenHandTrashed",
          fireCondition: { kind: "triggerHandTrashedSeat", seat: "opponent" },
          actions: [reactiveDigivolve],
        },
        {
          kind: "SubTrigger",
          event: "whenDigivolutionTrashed",
          sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true },
          actions: [reactiveDigivolve],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: avianTrash, count: 1 },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
};

registerIrCard("BT26-076", compiled);
