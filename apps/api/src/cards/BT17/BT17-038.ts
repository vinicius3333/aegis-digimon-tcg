import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The Plug-In branch has no printed cost ceiling; only the yellow branch is capped at 5.
// Keep the parent ceiling at the runtime's explicit no-ceiling sentinel and put the yellow
// ceiling on its OR branch. Q2785's color requirement still applies to both branches.
// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -6000,
          duration: "forTheTurn",
        },
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            playCostLte: 99,
            or: [
              {
                nameOrTrait: [
                  {
                    tokens: ["Plug-In"],
                    match: "name",
                  },
                ],
              },
              {
                colors: ["Yellow"],
                playCostLte: 5,
              },
            ],
          },
          allowMultiColor: true,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          fireCondition: {
            kind: "triggerOptionCostAtLeast",
            value: 2,
            raw: "when you use an Option card with a cost of 2 or more",
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              restriction: "beReturned",
              duration: "untilOpponentTurnEnd",
              byOpponentEffectsOnly: true,
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
      names: ["Sakuyamon: Maid Mode"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-038", compiled);
