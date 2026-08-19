// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const targetFilter = {
  controller: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Guilmon", "Growlmon", "Gallantmon", "Megidramon"], match: "name" },
    { tokens: ["Hero"], match: "trait" },
  ],
};
const suspendCost = {
  kind: "suspend",
  target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
  raw: "by suspending this Tamer",
};

function watcher(event: string) {
  return {
    kind: "SubTrigger",
    event,
    sourceFilter: { controller: "mine", kind: ["Digimon"] },
    actions: [
      {
        kind: "SelectBind",
        target: { filter: targetFilter, count: 1 },
        bindAs: "takatoTarget",
        cost: suspendCost,
        optional: true,
        abortOnDecline: true,
      },
      {
        kind: "GainKeyword",
        target: { fromSelectionRef: "takatoTarget" },
        keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
        duration: "untilOpponentTurnEnd",
      },
      {
        kind: "ModifyDP",
        target: { fromSelectionRef: "takatoTarget" },
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
