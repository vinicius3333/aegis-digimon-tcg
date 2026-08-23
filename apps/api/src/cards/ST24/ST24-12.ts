// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["DATA SQUAD"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                faceDown: true,
                position: "bottom",
                hostFilter: { kind: ["Tamer"], controller: "mine" },
              },
              count: 1,
            },
            raw: "By trashing the bottom face-down card from under any of your Tamers",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
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
      level: 2,
      traits: ["DATA SQUAD"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST24-12", compiled);
