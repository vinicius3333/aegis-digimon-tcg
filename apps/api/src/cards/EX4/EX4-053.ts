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
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Purple"],
                nameOrTrait: [
                  {
                    tokens: ["Ravemon"],
                    match: "name",
                  },
                  {
                    tokens: ["Bird", "Avian"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Keenan Crier"],
                    match: "nameExact",
                  },
                ],
              },
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
          },
          chooser: "opponent",
          condition: {
            kind: "not",
            condition: { kind: "triggerRemovalCause", removalCause: "byBattle" },
            raw: "deleted outside of a battle",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-053", compiled);
