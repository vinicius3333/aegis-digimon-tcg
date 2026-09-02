import type { CardEffect, CompiledCard, Cost } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-059 — Machinedramon ACE.
// The De-Digivolve resolves first. The subsequent protection is an optional, all-or-nothing
// payment: exactly two level 5 or lower Machine/Cyborg/ME cards from hand or trash are placed
// underneath this Digimon before the stack-trash lock is installed.
const placeTwoMaterials: Cost = {
  kind: "place",
  target: {
    filter: {
      controller: "mine",
      levelComparison: { op: "lte", value: 5 },
      nameOrTrait: [{ tokens: ["Machine", "Cyborg", "ME"], match: "trait" }],
    },
    count: 2,
    from: ["hand", "trash"],
  },
  destination: "digivolutionStack",
  position: "bottom",
  host: "self",
  raw: "By placing 2 level 5 or lower [Machine], [Cyborg] or [ME] trait cards from your hand or trash as this Digimon's bottom digivolution cards",
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [{ keyword: "BlastDigivolve", raw: "＜Blast Digivolve＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Reboot", raw: "＜Reboot＞" }],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Fragment", amount: 2, raw: "＜Fragment (2)＞" }],
    },
    ...(["OnPlay", "WhenDigivolving", "WhenAttacking"] as const).map((trigger): CardEffect => ({
      trigger,
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 3,
        },
        {
          kind: "StackTrashLock",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          duration: "untilOpponentTurnEnd",
          cost: placeTwoMaterials,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    })),
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["Cyborg", "ME"], cost: 3, isAlternate: true }],
};

export { compiled };
registerIrCard("EX12-059", compiled);
