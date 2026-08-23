// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              or: [
                { nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "traitContains" }] },
                { nameOrTrait: [{ tokens: ["Vortex Warriors"], match: "trait" }] },
              ],
            },
            count: 1,
          },
          condition: {
            kind: "lastSuspendedIsMine",
            raw: "this effect suspended your Digimon",
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: false,
          optional: true,
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect unsuspended",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controllerDefault: "any",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              or: [
                { nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "traitContains" }] },
                { nameOrTrait: [{ tokens: ["Vortex Warriors"], match: "trait" }] },
              ],
            },
            count: 1,
          },
          condition: {
            kind: "lastSuspendedIsMine",
            raw: "this effect suspended your Digimon",
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          withoutSuspending: false,
          optional: true,
          condition: {
            kind: "ifThisEffectActed",
            raw: "this effect unsuspended",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-047", compiled);
