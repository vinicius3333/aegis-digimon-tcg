// @ts-nocheck
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
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Angoramon"], match: "nameExact" }],
            },
            count: 1,
            fromSelectionRef: "lamortHost",
          },
          into: {
            controllerDefault: "mine",
            nameOrTrait: [{ tokens: ["Lamortmon"], match: "nameExact" }],
          },
          from: ["hand"],
          payCost: true,
          costOverride: 3,
          ignoreRequirements: true,
          optional: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["SymbareAngoramon"], match: "nameExact" }],
              },
              count: 1,
              from: ["hand"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Angoramon"], match: "nameExact" }],
            },
            bindHostAs: "lamortHost",
            raw: "by placing 1 [SymbareAngoramon] from your hand as 1 of your [Angoramon]'s bottom digivolution card",
          },
        },
      ],
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Tamer"],
          nameOrTrait: [{ tokens: ["Ruli Tsukiyono"], match: "nameExact" }],
        },
      },
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
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
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-055", compiled);
