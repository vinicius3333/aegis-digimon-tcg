import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
    },
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has a Digimon",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "CostGatedBlock",
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
              actions: [
                {
                  kind: "SelectBind",
                  target: {
                    filter: {
                      controller: "mine",
                      kind: ["Digimon"],
                      nameOrTrait: [
                        { tokens: ["Greymon"], match: "name" },
                        { tokens: ["CS"], match: "trait" },
                      ],
                    },
                    count: 1,
                    bindAs: "yuukoProtectedDigimon",
                  },
                },
                {
                  kind: "GrantImmunity",
                  target: {
                    filter: {},
                    fromSelectionRef: "yuukoProtectedDigimon",
                    count: 1,
                  },
                  immuneFrom: "opponentEffects",
                  duration: "forTheTurn",
                },
                {
                  kind: "ModifyDP",
                  target: {
                    filter: {},
                    fromSelectionRef: "yuukoProtectedDigimon",
                    count: 1,
                  },
                  amount: 3000,
                  duration: "forTheTurn",
                },
              ],
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
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 3000,
              duration: "forTheTurn",
              condition: {
                kind: "selfHasName",
                names: ["Eater Eve"],
                raw: "this Digimon is [Eater Eve]",
              },
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

registerIrCard("BT22-083", compiled);
