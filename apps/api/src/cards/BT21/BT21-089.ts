import type { Action, CompiledCard, Cost, Filter, SubTriggerEvent } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const targetFilter: Filter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Guilmon", "Growlmon", "Gallantmon", "Megidramon"], match: "name" },
    { tokens: ["Hero"], match: "trait" },
  ],
};
const suspendCost: Cost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Tamer",
};

function watcher(event: SubTriggerEvent): Action {
  return {
    kind: "SubTrigger",
    event,
    sourceFilter: { controller: "mine", kind: ["Digimon"] },
    actions: [
      {
        kind: "GainKeyword",
        target: { filter: targetFilter, count: 1 },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        duration: "untilOpponentTurnEnd",
        cost: suspendCost,
        optional: true,
        abortOnDecline: true,
      },
      {
        kind: "ModifyDP",
        target: { filter: {}, count: 1, sameTarget: true },
        amount: 2000,
        duration: "untilOpponentTurnEnd",
        condition: {
          kind: "combinedTrashCount",
          op: "gte",
          value: 10,
          raw: "there are 10 or more total cards in both players' trashes",
        },
      },
    ],
  };
}

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: { controllerDefault: "opponent", kind: ["Digimon"] },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    { trigger: "AllTurns", actions: [watcher("whenPlayed"), watcher("whenOneOfYoursDigivolves")] },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-089", compiled);
