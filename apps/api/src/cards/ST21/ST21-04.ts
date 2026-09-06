// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST21-04 Zudomon
// Errata (2025-04-18): [On Play] [When Digivolving] From 1 of your opponent's Digimon,
//   trash any 1 digivolution card for every 2 colors your Tamers have. Then, return 1 of
//   their Digimon with 1 or fewer digivolution cards to the hand.
// [Your Turn] [Once Per Turn] When your other Digimon are played or digivolve, if any of
//   them have the [ADVENTURE] trait, 1 of your Digimon gains <Alliance> for the turn.
//   Then, 1 of your Digimon may attack.
// [Inherited] <Alliance>
//
// KB Q4472: must give <Alliance> (not optional).
// KB Q4473: can choose different Digimon for Alliance and attack.
// KB Q4474: attack part is optional ("may attack").
// KB Q4699: can process the attack part even if ADVENTURE condition isn't met.
//
// `digivolutionCardsAtMost:1` is enforced by the interpreter's permanent
// filter matcher (CAP-H-02).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            upTo: false,
          },
          amount: 1,
          position: "top",
          scaling: {
            per: 2,
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "colors",
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            upTo: false,
          },
          amount: 1,
          position: "top",
          scaling: {
            per: 2,
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "colors",
          },
        },
        {
          kind: "Return",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              digivolutionCardsAtMost: 1,
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
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
                keyword: "Alliance",
                raw: "＜Alliance＞",
              },
              duration: "forTheTurn",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
                raw: "any of them have the [ADVENTURE] trait",
              },
            },
            {
              kind: "Attack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
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
                keyword: "Alliance",
                raw: "＜Alliance＞",
              },
              duration: "forTheTurn",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
                raw: "any of them have the [ADVENTURE] trait",
              },
            },
            {
              kind: "Attack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["ADVENTURE"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST21-04", compiled);
