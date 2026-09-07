import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-102 Mastemon
// Text:
//   <Barrier>  <Partition ([Angewomon] & [LadyDevimon])>
//   [When Digivolving] You may play 1 level 5 or lower yellow or purple card from your
//   hand or trash without paying the cost. Then, if this Digimon's stack has 2 or more
//   same-level cards, trash the top cards of both players' security stacks so that they
//   have 3 cards left.
//   [All Turns] [Once Per Turn] When security stacks are removed from, you may place 1
//   Digimon as the bottom security card.
//
// KB Q5391: Either player's Digimon can be placed as the bottom security card.
// KB Q5392: The Partition trigger does NOT fire when this effect places self as security.
//
// Audit notes:
//   1. `leaveCount: 3` trashes each player's top security cards down to 3.
//   2. The same-level condition includes this Digimon's top card (BT22-031 Q4879).
//   3. The All Turns watcher accepts either player's Digimon (KB Q5391).
export const compiled: CompiledCard = {
  // Printed cost headers. `traits` is EXACT trait matching (CR 2-3-2-3): the printed
  // "w/[CS] trait" must not accept a trait that merely contains "cs" (trait substring
  // matching is case-insensitive, so "Abadin Electronics" would match a substring gate).
  digivolutionRequirement: [{ level: 5, traits: ["CS"], cost: 5, isAlternate: true }],
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        { color: "Yellow", level: 5 },
        { color: "Purple", level: 5 },
      ],
    },
  ],
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
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Partition",
          raw: "＜Partition ([Angewomon] & [LadyDevimon])＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow", "Purple"],
              levelComparison: { op: "lte", value: 5 },
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "mine",
          bothPlayers: true,
          leaveCount: 3,
          condition: {
            kind: "selfDigivolutionStackHasSameLevelPair",
            raw: "this Digimon's stack has 2 or more same-level cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          // "When security stacks are removed from" names BOTH stacks. Security-removal
          // watchers read `sourceFilter.controller` as the watched stack direction and
          // DEFAULT TO "mine" (interpreter/actions/subTrigger.ts securityRemovalGate), so
          // without this the trigger missed every removal from the opponent's stack.
          sourceFilter: { controller: "any" },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "addBottom",
              controller: "any",
              amount: 1,
              source: {
                filter: {
                  isDigimon: true,
                  controller: "any",
                },
                count: 1,
                upTo: false,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT23-102", compiled);
