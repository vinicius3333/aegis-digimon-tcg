import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const highestDp: Target = { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestDP" }, count: 1 };
const deleteOwn = { kind: "deleteOwn", target: self } satisfies Action["cost"];
const trashTwoTamerBottoms = {
  kind: "trashBottomFaceDownUnderTamer",
  controller: "mine",
  count: 2,
} satisfies Action["cost"];
const altCostDelete: Action = {
  kind: "Modal",
  choose: 1,
  optional: true,
  abortOnDecline: true,
  options: [
    [{ kind: "Delete", target: highestDp, cost: deleteOwn, allowCostWithoutTarget: true }],
    [{ kind: "Delete", target: highestDp, cost: trashTwoTamerBottoms, allowCostWithoutTarget: true }],
  ],
};
const playFromSecurity: Action = { kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "EndOfOpponentsTurn", isSecurity: true, actions: [playFromSecurity] },
    { trigger: "WhenDigivolving", actions: [altCostDelete] },
    { trigger: "EndOfAttack", actions: [altCostDelete] },
    {
      trigger: "OnDeletion",
      actions: [
        { kind: "Trash", chooser: "opponent", target: { filter: { controller: "opponent", zone: "hand" }, count: 1 } },
        {
          effectTextPart:
            "Then, if their hand has 7 or fewer cards, you may place this card face up as the bottom security card.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["trash"],
          toTop: false,
          faceUp: true,
          optional: true,
          condition: { kind: "handAtMost", controller: "opponent", value: 7 },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [{ kind: "GrantStatic", target: self, grant: "trait", tokens: ["Birdkin"], duration: "permanent" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { namesExact: ["Crowmon"], cost: 3, isAlternate: true },
    { level: 5, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
  ],
};

registerIrCard("BT26-082", compiled);
export default compiled;
