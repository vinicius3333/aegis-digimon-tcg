import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-101 Fenriloogamon: Takemikazuchi.
// Q2900: the Trash effect listens for a qualifying level 6 Pulsemon-text Digimon
// being played. Q4712: the Tamer branch is independent of the DNA branch.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isFromTrash: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
              into: { controllerDefault: "mine" },
              payCost: true,
              optional: true,
            },
          ],
          raw: "When one of your level 6 Digimon with [Pulsemon] in its text is played",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -16000,
          duration: "forTheTurn",
        },
        {
          kind: "SetMemory",
          value: 3,
          condition: { kind: "isDnaDigivolving", raw: "DNA digivolving" },
          optional: true,
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: { kind: ["Tamer"] },
            raw: "this Digimon has a Tamer in its digivolution cards",
          },
        },
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" },
          duration: "permanent",
          condition: {
            kind: "selfDigivolutionStackMatchesFilter",
            filter: { kind: ["Tamer"] },
            raw: "this Digimon has a Tamer in its digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine" }, count: 1 },
            raw: "By trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-101", compiled);
