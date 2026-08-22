// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST24-10 Lilamon. The specialized cost pools the bottom face-down card from
// each eligible Tamer, allowing two cards to be paid across one or more Tamers.
const compiled: CompiledCard = {
  effects: [
    ...(["OnPlay", "WhenDigivolving", "WhenAttacking"] as const).map((trigger) => ({
      trigger,
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
          preventUnsuspend: "opponentNextUnsuspendPhase",
        },
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }],
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 2,
            raw: "by trashing 2 bottom face-down cards from under any of your Tamers",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    })),
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Rosemon"], match: "name" },
              { tokens: ["DATA SQUAD"], match: "trait", orPrevious: true },
            ],
          },
          actions: [],
          cost: {
            kind: "trashBottomFaceDownUnderTamer",
            controller: "mine",
            count: 1,
            raw: "by trashing the bottom face-down card from under any of your Tamers",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true }],
};

registerIrCard("ST24-10", compiled);
