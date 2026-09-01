// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Manual audit correction: the number of Tamers deleted is based on cards trashed from the
// opponent's hand by this effect, not on the opponent's total board/card count.
// The All Turns watcher observes other Digimon/Tamers regardless of controller, then trashes
// the opponent's top security card (not an arbitrary opponent permanent).

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "opponent",
            },
            count: 1,
            untilHandSize: 5,
          },
          trackCount: "trashedThisEffect",
          chooser: "opponent",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          scaling: {
            per: 2,
            unit: "namedCount",
            countSource: "trashedThisEffect",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "hand",
              controller: "opponent",
            },
            count: 1,
            untilHandSize: 5,
          },
          trackCount: "trashedThisEffect",
          chooser: "opponent",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            count: 1,
          },
          scaling: {
            per: 2,
            unit: "namedCount",
            countSource: "trashedThisEffect",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Composite"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                raw: "by deleting 1 of your Digimon with the [Composite] trait Digimon",
              },
              optional: true,
              abortOnDecline: true,
            },
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
          sourceFilter: {
            excludeSelf: true,
            kind: ["Digimon", "Tamer"],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              amount: 1,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Millenniummon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-075", compiled);
