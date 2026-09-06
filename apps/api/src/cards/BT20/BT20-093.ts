import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT20-093 Unleash the Dragon Gene — Option card
// [Main] You may play 1 Digimon card with [Dracomon]/[Examon] in its text from your hand
//   with the play cost reduced by 3. Then, place this card in the battle area.
// [All Turns] When any of your Digimon with [Dracomon]/[Examon] in their texts would leave
//   the battle area other than in battle, <Delay>.
//   · 2 of your Digimon may DNA digivolve into [Examon] in the hand.
// [Security] You may play 1 Digimon card with [Dracomon] in its name from your hand or
//   trash without paying the cost. Then, place this card in the battle area.
//
// KB Q4433: Main plays a card with [Dracomon] or [Examon] in its text.
// KB Q4436: DNA digivolve via <Delay> doesn't leave the battle area.
// Audit: cost reduction is part of the play (reduceCostBy:3, not separate Replacement).
// Audit: Replacement leaveCause:otherThanBattle gates "other than in battle."
// Q4436: resolve reactive Delay before departure so the threatened Digimon can be DNA material.
// Audit: PlaceInBattleAreaSelf is mandatory after optional play (optional:false).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dracomon", "Examon"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          reduceCostBy: 3,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            zone: "battleArea",
            nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [{ tokens: ["Examon"], match: "nameExact" }],
                zone: "hand",
              },
              payCost: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dracomon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-093", compiled);
