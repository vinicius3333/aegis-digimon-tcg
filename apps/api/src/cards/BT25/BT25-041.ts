// HAND-AUTHORED IR for BT25-041 Murasamemon.
//
// The printed effect offers two independent cost choices (add the top security card to hand or
// trash a bottom face-down card under a Tamer), followed by a choice to play a Digimon/Tamer or use
// an Option. The nested modals preserve both choices instead of tying one cost to one card kind.
import type { CompiledCard, Cost } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trait = [{ tokens: ["Glowing Dawn"], match: "trait" as const }];
const digimon = {
  kind: "PlayWithoutCost" as const,
  target: {
    filter: { controller: "mine" as const, kind: ["Digimon" as const, "Tamer" as const], nameOrTrait: trait },
    count: 1,
  },
  from: ["hand" as const],
  payCost: true,
  reduceCostBy: 3,
};
const option = {
  kind: "UseOptionWithoutCost" as const,
  filter: { controller: "mine" as const, kind: ["Option" as const], nameOrTrait: trait },
  from: ["hand" as const],
  payCost: true,
  reduceCostBy: 3,
};

function playOrUseWithCost(cost: Cost) {
  return {
    kind: "Modal" as const,
    choose: 1,
    labels: ["Play a Glowing Dawn Digimon or Tamer", "Use a Glowing Dawn Option"],
    options: [[{ ...digimon }], [{ ...option }]],
    cost,
  };
}

function turnEffect() {
  return {
    trigger: "WhenDigivolving" as const,
    actions: [
      {
        kind: "Modal" as const,
        choose: 1,
        labels: ["Add your top security card", "Trash a bottom face-down Tamer card"],
        options: [
          [
            playOrUseWithCost({
              kind: "securityToHand",
              raw: "by adding your top security card to the hand",
            }),
          ],
          [
            playOrUseWithCost({
              kind: "trashBottomFaceDownUnderTamer",
              controller: "mine",
              raw: "by trashing the bottom face-down card from under any of your Tamers",
            }),
          ],
        ],
        condition: { kind: "isYourTurn" as const, raw: "it's your turn" },
        optional: true,
        abortOnDecline: true,
      },
    ],
    frequency: "OncePerTurn" as const,
    sharedUseKey: "ir-shared-0",
  };
}

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Alliance" }] },
    { ...turnEffect(), trigger: "WhenDigivolving" },
    { ...turnEffect(), trigger: "WhenAttacking" },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true, kind: ["Digimon"], nameOrTrait: trait }, count: 1, isSelf: true },
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            raw: "By trashing the bottom face-down card from under any of your Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["Glowing Dawn"], cost: 3, isAlternate: true }],
};

export { compiled };
registerIrCard("BT25-041", compiled);
