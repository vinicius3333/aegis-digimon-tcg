import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-audited IR.
//
// CR 16-36-1 scopes ＜Decode＞ to "THAT Digimon's digivolution cards". `applyDecodeHostScope`
// now injects that scope, but the IR states it explicitly with `hostFilter: { isSelfRef: true }`
// so the `from: ["digivolutionCards"]` pool can never span a neighbouring stack.
//
// "[Aqua] or [Sea Animal] in any of its traits" is `traitContains`, not `trait`: no printed
// trait is literally "Aqua" — the clause covers Aquatic, Aquabeast and Ancient Aquabeast, which
// the persisted record's exact `match: "trait"` matched not at all.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Evade",
          raw: "＜Evade＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  hostFilter: { isSelfRef: true },
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "traitContains",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "traitContains",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "traitContains",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 Digimon card with [Aqua] or [Sea Animal] in any of its traits from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  digivolutionCardsCompareToSource: "lte",
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              to: "deckBottom",
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

registerIrCard("EX11-018", compiled);
