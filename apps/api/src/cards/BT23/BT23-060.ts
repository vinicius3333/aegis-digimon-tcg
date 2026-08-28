import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for BT23-060 (Machinedramon).
//
// The AUTO-GENERATED header was removed (card-module contract) to preserve this hand-edit.
// The [When Attacking] clause had no activate-foreign verb, so the runtime record emitted
// RawUnparsed. It is now the structured `ActivateForeignEffect` action (interpreter case
// "ActivateForeignEffect"): borrow a face-up [Zaxon] trait security card's [On Play] effect
// and run it as this Digimon's effect. KB Q5331 — the borrowed [On Play]'s "by" condition
// must be processed (runEffect resolves the whole borrowed CardEffect, so it is).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Reboot",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 8000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 8000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ActivateForeignEffect",
          zone: "security",
          fromTriggers: ["OnPlay"],
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            faceUp: true,
            nameOrTrait: [
              {
                tokens: ["Zaxon"],
                match: "trait",
              },
            ],
          },
          count: 1,
          optional: false,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["CS"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-060", compiled);
