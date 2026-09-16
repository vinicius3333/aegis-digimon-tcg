import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ownTopSecurity = {
  filter: { controller: "mine", zone: "security", position: "top" },
  count: 1,
} as const;

const trashTopOrBottomSecurity: Action = {
  kind: "SecurityManipulation",
  op: "trashTop",
  controller: "mine",
  amount: 1,
  chooseTopOrBottom: true,
  raw: "trash your top or bottom security card",
};

const placeWitchelnyTextCardAsBottomSecurity: Action = {
  kind: "SecurityManipulation",
  op: "addBottom",
  controller: "mine",
  amount: 1,
  source: {
    filter: {
      controller: "mine",
      zone: "hand",
      nameOrTrait: [{ tokens: ["Witchelny"], match: "text" }],
    },
    count: 1,
  },
  optional: true,
  condition: {
    kind: "zoneCount",
    seat: "mine",
    zone: "security",
    op: "lte",
    value: 2,
    raw: "you have 2 or fewer security cards",
  },
  raw: "you may place 1 card with [Witchelny] in its text from your hand as the bottom security card",
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "ConditionalBranch",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "gte",
            value: 3,
            raw: "you have 3 or more security cards",
          },
          ifTrue: [
            trashTopOrBottomSecurity,
            { kind: "Draw", controller: "mine", amount: 1, raw: "＜Draw 1＞" },
            { kind: "GainMemory", amount: 1, raw: "gain 1 memory" },
            placeWitchelnyTextCardAsBottomSecurity,
          ],
          raw: "If you have 3 or more security cards, trash your top or bottom security card, ＜Draw 1＞ and gain 1 memory",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "trait",
          tokens: ["Witchelny"],
          raw: "[Rule] Trait: Has [Witchelny] Type.",
        },
      ],
    },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "opponentEffect",
          sourceFilter: {
            isSelfRef: true,
            kind: ["Digimon"],
            printedTextOnly: true,
            nameOrTrait: [{ tokens: ["Dynasmon", "Witchelny"], match: "text" }],
          },
          actions: [],
          cost: {
            kind: "trash",
            target: ownTopSecurity,
            raw: "by trashing your top security card",
          },
          raw: "When this Digimon with [Dynasmon] or [Witchelny] in its text would leave the battle area by your opponent's effects, by trashing your top security card, it doesn't leave",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX13-025", compiled);
