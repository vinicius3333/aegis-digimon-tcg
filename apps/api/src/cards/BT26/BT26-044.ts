import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentTarget = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } satisfies Target;
const altDigivolve = {
  kind: "Digivolve",
  from: ["hand"],
  payCost: true,
  costDelta: -1,
  useAlternateCost: true,
  optional: true,
  abortOnDecline: true,
  target: { filter: { isSelfRef: true }, count: 1 },
  into: {
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["Vegetation"], match: "trait" },
      { tokens: ["Fairy"], match: "trait" },
      { tokens: ["DATA SQUAD"], match: "trait" },
    ],
  },
} satisfies Action;
const reactive = {
  kind: "SubTrigger",
  event: "whenSuspended",
  sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
  actions: [altDigivolve],
} satisfies Action;
const tamerTrashReactive = {
  kind: "SubTrigger",
  event: "whenDigivolutionTrashed",
  sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true },
  actions: [altDigivolve],
} satisfies Action;
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        { kind: "Suspend", target: opponentTarget, optional: true },
        { kind: "Restrict", target: opponentTarget, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Suspend", target: opponentTarget, optional: true },
        { kind: "Restrict", target: opponentTarget, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
      ],
    },
    { trigger: "YourTurn", frequency: "OncePerTurn", actions: [reactive, tamerTrashReactive] },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          optional: true,
          sourceFilter: {
            isSelfRef: true,
            nameOrTrait: [
              { tokens: ["Rosemon"], match: "name" },
              { tokens: ["DATA SQUAD"], match: "trait" },
            ],
          },
          cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine", count: 1 },
          actions: [],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
};
registerIrCard("BT26-044", compiled);
export default compiled;
