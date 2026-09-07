import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By suspending this Digimon",
          },
          abortOnDecline: true,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: { hasInheritedEffects: true, controller: "mine", kind: ["Tamer"], colors: ["Red"] },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
              abortOnDecline: true,
            },
            {
              kind: "PlaceUnder",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              underFilter: { lastPlayed: true, controllerDefault: "mine", kind: ["Tamer"] },
              condition: { kind: "ifThisEffectActed", raw: "you did" },
            },
          ],
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
};

registerIrCard("BT21-012", compiled);
