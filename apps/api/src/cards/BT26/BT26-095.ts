// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const beatbreak = { nameOrTrait: [{ tokens: ["BEATBREAK"], match: "trait" }] };
const startCost = {
  kind: "place",
  target: { filter: { controller: "mine", zone: "hand", ...beatbreak }, count: 1 },
  underFilter: self.filter,
  host: "self",
  destination: "digivolutionStack",
  position: "bottom",
  faceDown: true,
};
const deletionBody = [
  {
    kind: "CostGatedBlock",
    cost: { kind: "suspend", target: self },
    optional: true,
    abortOnDecline: true,
    actions: [
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 } },
      {
        kind: "PlaceUnder",
        target: {
          filter: {
            controller: "mine",
            zone: "trash",
            kind: ["Digimon", "Tamer", "Option"],
            ...beatbreak,
          },
          count: 1,
        },
        underFilter: self.filter,
        position: "bottom",
        faceDown: true,
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
          event: "onDeletionOf",
          sourceFilter: { kind: ["Digimon"] },
          actions: deletionBody,
          raw: "When any Digimon are deleted, by suspending this Tamer, ＜Draw 1＞ and trash 1 card in your hand. After, place 1 [BEATBREAK] trait non-Digi-Egg card from your trash face down under this Tamer.",
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

registerIrCard("BT26-095", compiled);
