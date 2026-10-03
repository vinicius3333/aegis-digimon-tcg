import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            zone: "hand",
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 3,
              raw: "reduce the play cost by 3",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["LadyDevimon", "Mirei Mikagura"],
                      match: "nameExact",
                    },
                  ],
                },
                raw: "you have [LadyDevimon] or [Mirei Mikagura]",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Add your top security card to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          effectTextPart: "Then, if you have 3 or fewer security cards, ＜Recovery +1 (Deck)＞.",
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Add your top security card to the hand.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: true,
        },
        {
          effectTextPart: "Then, if you have 3 or fewer security cards, ＜Recovery +1 (Deck)＞.",
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
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

registerIrCard("BT23-031", compiled);
