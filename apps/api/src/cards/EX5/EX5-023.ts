// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 2,
            },
            raw: "By trashing 2 cards in your hand",
          },
          // The Return is a Then clause: an unpaid head must stop this action list.
          abortOnDecline: true,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Garurumon", "X Antibody"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["WereGarurumon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                  orPrevious: true,
                },
              ],
            },
            raw: "[WereGarurumon] or [X Antibody] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "selfHasNameContaining",
            names: ["Garurumon", "Omnimon"],
            raw: "this Digimon has [Garurumon]/[Omnimon] in its name",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 1,
            },
            raw: "by trashing 1 card in your hand",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-023", compiled);
