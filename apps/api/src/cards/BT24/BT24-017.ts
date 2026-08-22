// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };
const returnTwo = {
  kind: "return",
  target: { filter: { controller: "opponent", zone: "trash" }, count: 2 },
  to: "deckBottom",
};

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Progress", raw: "＜Progress＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Delete", target: { filter: { ...opponentDigimon, superlative: "lowestDP" }, count: 1 } },
        {
          kind: "CostGatedBlock",
          cost: returnTwo,
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "PlayToken",
              tokens: ["Petrification Token"],
              count: 2,
              payCost: false,
              controller: "mine",
              placedAs: "opponentDigimon",
            },
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 2000,
              duration: "untilOpponentTurnEnd",
              scaling: { per: 1, unit: "cards", filter: opponentDigimon },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, colors: ["Red"], cost: 3 }],
};

registerIrCard("BT24-017", compiled);

registerIrCard("TOKEN-Petrification-Token", {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "suspend",
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          amount: 1,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
});
