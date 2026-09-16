import type { CardEffect, CompiledCard, Condition, Cost } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const dynasmonOrXAntibodyUnder: Condition = {
  kind: "selfHasInDigivolutionCards",
  nameOrTrait: [
    { tokens: ["Dynasmon"], match: "nameExact" },
    { tokens: ["X Antibody"], match: "trait" },
  ],
  raw: "[Dynasmon]/[X Antibody] is in this Digimon's digivolution cards",
};

const trashOwnTopSecurity: Cost = {
  kind: "trashSecurityTop",
  raw: "by trashing the top card of your security stack",
};

const boostActions: CardEffect["actions"] = [
  {
    kind: "trashSecurityTop",
    controller: "opponent",
    count: 1,
    condition: dynasmonOrXAntibodyUnder,
    cost: trashOwnTopSecurity,
    abortOnDecline: true,
    raw: "trash the top card of your opponent's security stack",
  },
  {
    kind: "ModifyDP",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    amount: 6000,
    duration: "untilOpponentTurnEnd",
    condition: dynasmonOrXAntibodyUnder,
    raw: "this Digimon gets +6000 DP until the end of your opponent's turn",
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: boostActions,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: boostActions,
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          toTop: true,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 2,
            raw: "you have 2 or fewer security cards",
          },
          amount: 1,
          raw: "＜Recovery +1 (Deck)＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Dynasmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-042", compiled);
