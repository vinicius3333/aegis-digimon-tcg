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
          effectTextPart: "[When Digivolving] 1 of your opponent's Digimon gets -6000 DP for the turn.",
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
          effectTextPart:
            "Then, you may use 1 Option card with [Plug-In] in its name in its name or 1 yellow Option card with a cost of 5 or less from your hand without paying the cost.",
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
      // Printed "[Digivolve][Sakuyamon: Maid Mode]: Cost 1" carries no "in name", so the base
      // name must EQUAL the route name, not merely contain it (coordinator route-name decision;
      // cardData.ts namesExact vs names). No catalog card's name is a strict superstring of
      // "Sakuyamon: Maid Mode", so the exact/substring distinction has no observable near-name
      // case here, but the exact form is the correct model of the printed route.
      namesExact: ["Sakuyamon: Maid Mode"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-038", compiled);
