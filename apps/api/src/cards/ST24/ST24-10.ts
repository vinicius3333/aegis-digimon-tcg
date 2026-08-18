import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for ST24-10 (Lilamon).
// Fix: Suspend and Restrict must use fromSelectionRef:'A' to target the selected opponent
// Digimon/Tamer (not a DATA SQUAD trait Digimon that this card owns, which was the runtime record error).
// The TrashDigivolution targets own Tamer's bottom face-down digi-cards (PARTIAL: no face-down filter).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          raw: "[All Turns] [Once Per Turn] When this Digimon with [Rosemon] in its name or the [DATA SQUAD] trait would leave the battle area, by trashing the bottom face-down card from under any of your Tamers, it doesn't leave.",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
              },
              count: 1,
            },
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      frequency: "OncePerTurn",
      condition: {
        kind: "youHave",
        filter: {
          controller: "mine",
          kind: ["Digimon"],
        },
        count: 1,
        matchPredicate: "TamerWithOneFaceDownSource",
      },
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
            bindAs: "A",
          },
        },
        {
          kind: "Suspend",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
          restriction: "unsuspend",
          duration: "untilYourTurnEnd",
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
          },
          payCost: false,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      frequency: "OncePerTurn",
      condition: {
        kind: "youHave",
        filter: {
          controller: "mine",
          kind: ["Digimon"],
        },
        count: 1,
        matchPredicate: "TamerWithOneFaceDownSource",
      },
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
            bindAs: "A",
          },
        },
        {
          kind: "Suspend",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
          restriction: "unsuspend",
          duration: "untilYourTurnEnd",
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
          },
          payCost: false,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      condition: {
        kind: "youHave",
        filter: {
          controller: "mine",
          kind: ["Digimon"],
        },
        count: 1,
        matchPredicate: "TamerWithOneFaceDownSource",
      },
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
            bindAs: "A",
          },
        },
        {
          kind: "Suspend",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
        },
        {
          kind: "Restrict",
          target: {
            filter: {},
            count: 1,
            fromSelectionRef: "A",
          },
          restriction: "unsuspend",
          duration: "untilYourTurnEnd",
        },
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            count: 1,
          },
          amount: 2,
          fromTop: false,
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
          },
          payCost: false,
          from: ["hand"],
        },
      ],
    },
  ],
  coverage: "partial",
  residual: [
    "PARTIAL: TrashDigivolution targets own Tamer's bottom face-down digi-cards; no 'isFaceDown' filter in IR; approximated as any 2 bottom digi-cards of a Tamer",
  ],
  digivolutionRequirement: [
    {
      cost: 3,
      isAlternate: true,
      traits: ["DATA SQUAD"],
    },
  ],
};

registerIrCard("ST24-10", compiled);
