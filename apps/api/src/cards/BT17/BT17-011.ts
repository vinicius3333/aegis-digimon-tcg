// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          onto: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Red"],
            },
            count: 1,
          },
          asLevel: 3,
          from: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
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
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["AncientGreymon"],
                match: "name",
              },
            ],
          },
          payCost: true,
          from: ["hand"],
          costOverride: 3,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["BurningGreymon"],
                      match: "name",
                    },
                  ],
                },
                raw: "[BurningGreymon] is in this Digimon's digivolution cards",
              },
              {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon", "Tamer"],
                  colors: ["Blue", "Green"],
                },
                raw: "you have a blue or green Digimon or Tamer",
              },
            ],
            raw: "[BurningGreymon] is in this Digimon's digivolution cards or you have a blue or green Digimon or Tamer",
          },
        },
        {
          kind: "DelayedDelete",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "ifThisEffectDigivolved",
            raw: "digivolved by this effect",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Takuya Kanbara"],
      cost: 2,
      isAlternate: true,
    },
    {
      names: ["BurningGreymon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-011", compiled);
export { compiled };
