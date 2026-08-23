// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-027 TeslaJellymon
// [Digivolve] [Jellymon]/Lv.3 w/[DS] trait: Cost 2
// [Main][Once Per Turn] You may play or use 1 card with [Jellymon] in its text or the
//   [DS] trait from your hand with the cost reduced by 2.
// [Inherited][When Attacking][Once Per Turn] <Draw 1>. Then, if your hand has 7 or more
//   cards, trash 1 card in your hand.
//
// "play or use": PlayWithoutCost(payCost:true, reduceCostBy:2) covers Digimon/Tamer play.
// UseOptionWithoutCost(payCost:true, reduceCostBy:2) covers the Option use path — now that
// UseOptionWithoutCost honors reduceCostBy, this is fully encodable (EX12-050 pattern).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a matching card", "Use a matching Option"],
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    nameOrTrait: [
                      {
                        tokens: ["Jellymon"],
                        match: "text",
                      },
                      {
                        tokens: ["DS"],
                        match: "trait",
                      },
                    ],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
            [
              {
                kind: "UseOptionWithoutCost",
                filter: {
                  controller: "mine",
                  kind: ["Option"],
                  nameOrTrait: [
                    {
                      tokens: ["Jellymon"],
                      match: "text",
                    },
                    {
                      tokens: ["DS"],
                      match: "trait",
                    },
                  ],
                },
                from: ["hand"],
                payCost: true,
                reduceCostBy: 2,
                optional: true,
              },
            ],
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
          condition: {
            kind: "handAtLeast",
            value: 7,
            raw: "your hand has 7 or more cards",
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
      names: ["Jellymon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      traits: ["DS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-027", compiled);
