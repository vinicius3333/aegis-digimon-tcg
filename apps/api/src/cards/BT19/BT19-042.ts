import type { CardEffect, CompiledCard, Condition, Cost } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/**
 * "[Dynasmon]/[X Antibody] is in this Digimon's digivolution cards".
 *
 * `[Dynasmon]` is a BRACKETED name, so it is an EXACT match (`nameExact`); a substring `name`
 * would also accept "Dynasmon (X Antibody)" — which happens to carry the [X Antibody] trait
 * anyway, so the two arms are kept honest rather than collapsed. `[X Antibody]` is a trait
 * token, matched exactly.
 */
const dynasmonOrXAntibodyUnder: Condition = {
  kind: "selfHasInDigivolutionCards",
  nameOrTrait: [
    { tokens: ["Dynasmon"], match: "nameExact" },
    { tokens: ["X Antibody"], match: "trait" },
  ],
  raw: "[Dynasmon]/[X Antibody] is in this Digimon's digivolution cards",
};

/**
 * Printed: "by trashing the top card of your security stack, trash the top card of your
 * opponent's security stack, and this Digimon gets +6000 DP".
 *
 * Only YOUR top security card is the cost — the opponent's trash is part of the payload, not a
 * second half of an atomic compound cost (contrast BT19-043, whose "by trashing BOTH players'
 * top security cards" is atomic and is confirmed so by KB Q3096). An empty opponent security
 * stack therefore does not stop the clause; an empty own stack does.
 *
 * "By doing X" is a mandatory processing condition (Official Rule Manual: text containing
 * "by doing" indicates a condition), so the cost is not optional.
 */
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
      // "[Digivolve][Dynasmon]" is a bracketed exact name: a substring `names` gate would let
      // "Dynasmon (X Antibody)" itself take the cost-1 route.
      namesExact: ["Dynasmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-042", compiled);
