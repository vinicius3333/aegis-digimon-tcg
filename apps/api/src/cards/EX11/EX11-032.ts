import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  digivolutionRequirement: [],
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
              nameOrTrait: [{ tokens: ["Pteromon"], match: "nameExact" }],
            },
            count: 1,
          },
          into: { isSelfRef: true },
          costOverride: 3,
          payCost: true,
          ignoreRequirements: true,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Shoto Kazama"], match: "nameExact" }],
            },
            raw: "you have [Shoto Kazama]",
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Galemon"], match: "nameExact" }],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "by placing 1 [Galemon] from your trash as any of your [Pteromon]'s bottom digivolution card",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Pteromon"], match: "nameExact" }],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
          },
        },
      ],
      isFromHand: true,
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] You may suspend 1 Digimon.",
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
          effectTextPart:
            "Then, you may play 1 3000 DP or lower green Digimon card with [Avian] or [Bird] in any of its traits from your hand without paying the cost. For each suspended Digimon, add 1000 to this effect's DP maximum.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
              dp: {
                op: "lte",
                value: 3000,
              },
              nameOrTrait: [{ tokens: ["Avian", "Bird"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          dpCeilingModifier: {
            mode: "raiseCeiling",
            amount: 1000,
            scaling: {
              per: 1,
              filter: {
                controllerDefault: "any",
                suspended: true,
                kind: ["Digimon"],
              },
              unit: "cards",
            },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenBattleWon",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                  nameOrTrait: [{ tokens: ["Vortex Warriors"], match: "trait" }],
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
          raw: "whenBattleWon",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-032", compiled);
