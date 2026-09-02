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
// digivolutionCards:"hasAny" keeps the trash clause on a Digimon that actually has sources,
// matching the set convention (EX12-033/EX12-035) — and the Restrict below still resolves
// independently when no such Digimon exists.
// restriction:"attackOrBlock" is one selection that records BOTH prohibitions on the same
// Digimon, which is what "1 of their Digimon ... can't attack or block" requires; two
// separate Restrict actions would open two independent target choices.
// digivolutionCardsAtMost:1 is checked once, at resolution: per KB Q6753 the prohibition
// stays after the Digimon later gains digivolution cards, so the restriction must NOT be
// continuous or re-matched against the target filter.
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
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
          },
          restriction: "attackOrBlock",
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
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
          },
          restriction: "attackOrBlock",
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
