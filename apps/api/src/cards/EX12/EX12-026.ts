// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-026 Shellmon
// [Digivolve] Lv.3 w/[Shambala] trait: Cost 2
// <Blocker>
// [On Play][When Digivolving] Trash the bottom 2 digivolution cards of 1 of your
//   opponent's Digimon. Then, 1 of their Digimon with 1 or fewer digivolution cards
//   can't attack or block until their turn ends.
// [Rule] Trait: Has [Aquatic] Type.
// [Inherited][When Attacking][Once Per Turn] If your hand has 7 or fewer cards, <Draw 1>
//
// TrashDigivolution: fromTop:false => bottom 2 digivolution cards of 1 opponent Digimon.
// SelectBind captures the Restrict target once so both attack/block restrictions apply
// to the SAME Digimon (the text says "1 of their Digimon").
// digivolutionCardsAtMost:1 is enforced by the interpreter's permanent filter matching.
const compiled: CompiledCard = {
  effects: [
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
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
            bindAs: "restrictTarget",
          },
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "restrictTarget",
            filter: {},
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "restrictTarget",
            filter: {},
          },
          restriction: "block",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
            bindAs: "restrictTarget",
          },
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "restrictTarget",
            filter: {},
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "restrictTarget",
            filter: {},
          },
          restriction: "block",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "handAtMost",
            value: 7,
            raw: "your hand has 7 or fewer cards",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Shambala"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-026", compiled);
