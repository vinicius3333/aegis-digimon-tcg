// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const beatbreak = {
  filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] },
  count: 1,
};
const startCost = {
  kind: "place",
  target: {
    filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] },
    count: 1,
  },
  underFilter: self.filter,
  host: "self",
  destination: "digivolutionStack",
  position: "bottom",
  faceDown: true,
};
const attackBody = [
  {
    kind: "CostGatedBlock",
    cost: { kind: "suspend", target: self },
    optional: true,
    abortOnDecline: true,
    actions: [
      // `position: "top"` is the fromDeckTop encoding for the TRUE bottom of the cards under
      // this Tamer (Q7151): the engine reads `position !== "top"` as belowTop there.
      {
        kind: "PlaceUnder",
        fromDeckTop: true,
        target: { filter: {}, count: 1 },
        position: "top",
        faceDown: true,
      },
      // One chosen Digimon gains BOTH keywords; two separate GainKeyword actions would open
      // two independent target choices and could split the grants across two Digimon.
      {
        kind: "GainKeyword",
        target: beatbreak,
        keyword: { keyword: "Collision" },
        keywords: [{ keyword: "Blocker" }],
        duration: "untilEachTurnEnd",
      },
    ],
  },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: startCost,
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            { kind: "GainMemory", amount: 1 },
          ],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          actions: attackBody,
          raw: "When a Digimon attacks, by suspending this Tamer, place the top card of your deck face down under this Tamer. After, 1 of your [BEATBREAK] trait Digimon gains ＜Collision＞ and ＜Blocker＞ for the turn.",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-093", compiled);
