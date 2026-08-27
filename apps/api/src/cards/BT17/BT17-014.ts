// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              zone: "battleArea",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Takuya Kanbara"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          into: {
            filter: {
              isSelfRef: true,
            },
          },
          payCost: true,
          costOverride: 3,
          asLevel: 4,
          asColors: ["Red"],
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Agunimon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 [Agunimon] and 1 [BurningGreymon] from your trash under 1 of your [Takuya Kanbara]s",
            underFilter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Takuya Kanbara"],
                  match: "name",
                },
              ],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
          },
          additionalCosts: [
            {
              kind: "place",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["BurningGreymon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
                from: ["trash"],
              },
              raw: "By placing 1 [Agunimon] and 1 [BurningGreymon] from your trash under 1 of your [Takuya Kanbara]s",
              underFilter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Takuya Kanbara"],
                    match: "name",
                  },
                ],
              },
              destination: "digivolutionStack",
              position: "bottom",
              host: "target",
            },
          ],
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
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
          grant: "noSecurityOptionEffects",
          duration: "permanent",
          condition: {
            kind: "selfHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Hybrid"],
                  match: "trait",
                },
                {
                  tokens: ["Ten Warriors"],
                  match: "trait",
                },
              ],
            },
            raw: "this Digimon has the [Hybrid] or [Ten Warriors] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-014", compiled);
export { compiled };
