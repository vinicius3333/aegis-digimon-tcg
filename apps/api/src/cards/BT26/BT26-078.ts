import type { Action, CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self: Target = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const chronomonOrTitan: Pick<Filter, "nameOrTrait"> = {
  nameOrTrait: [
    { tokens: ["Chronomon"], match: "text" },
    { tokens: ["Titan"], match: "trait" },
  ],
};
const eligibleTrashCard: Filter = {
  controller: "mine",
  zone: "trash",
  kind: ["Digimon", "Tamer"],
  playCostLte: 12,
  ...chronomonOrTitan,
};
const deleteToPlay: Action = {
  kind: "PlayWithoutCost",
  target: { filter: eligibleTrashCard, count: 1 },
  from: ["trash"],
  payCost: false,
  optional: true,
  cost: { kind: "deleteOwn", target: self },
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [deleteToPlay] },
    { trigger: "WhenDigivolving", actions: [deleteToPlay] },
    {
      trigger: "Trash",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], ...chronomonOrTitan },
          actions: [
            { kind: "Return", to: "deckBottom", target: self, optional: true, abortOnDecline: true },
            {
              kind: "GainKeyword",
              target: { sourceRef: "triggerSubject", filter: {}, count: 1 },
              keyword: { keyword: "Rush" },
              duration: "forTheTurn",
            },
            {
              kind: "GainKeyword",
              target: { sourceRef: "triggerSubject", filter: {}, count: 1 },
              keyword: { keyword: "Execute" },
              duration: "forTheTurn",
            },
            {
              kind: "GrantStatic",
              target: { sourceRef: "triggerSubject", filter: {}, count: 1 },
              grant: "effects",
              tokens: ["Execute"],
              duration: "forTheTurn",
            },
          ],
          fireCondition: {
            kind: "allOf",
            conditions: [{ kind: "isYourTurn" }, { kind: "memoryAtLeast", value: 5, controller: "opponent" }],
            raw: "it's your turn and your opponent has 5 or more memory",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["TS"], cost: 5, isAlternate: true }],
};

registerIrCard("BT26-078", compiled);
export default compiled;
