import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Raid",
            raw: "＜Raid＞",
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              // "(other than [Sea Animal])" narrows the [Animal] substring only: [Sea Animal]
              // must not count as an [Animal] match, but a card that also carries [Avian],
              // [Bird], [Beast] or [Sovereign] still qualifies on that trait. Splitting the
              // conflict-free tokens into their own branch keeps the card-level exclusion
              // confined to the branch that needs it. Residual gap: no filter primitive
              // excludes one trait from a substring scan, so a card carrying BOTH
              // [Sea Animal] and another [...Animal] spelling is still rejected. No
              // printed card has that pair.
              or: [
                { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
                { nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Sovereign"], match: "traitContains" }] },
                {
                  nameOrTrait: [{ tokens: ["Animal"], match: "traitContains" }],
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      isInherited: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              // "(other than [Sea Animal])" narrows the [Animal] substring only: [Sea Animal]
              // must not count as an [Animal] match, but a card that also carries [Avian],
              // [Bird], [Beast] or [Sovereign] still qualifies on that trait. Splitting the
              // conflict-free tokens into their own branch keeps the card-level exclusion
              // confined to the branch that needs it. Residual gap: no filter primitive
              // excludes one trait from a substring scan, so a card carrying BOTH
              // [Sea Animal] and another [...Animal] spelling is still rejected. No
              // printed card has that pair.
              or: [
                { nameOrTrait: [{ tokens: ["CS"], match: "trait" }] },
                { nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Sovereign"], match: "traitContains" }] },
                {
                  nameOrTrait: [{ tokens: ["Animal"], match: "traitContains" }],
                  excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-012", compiled);
