import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] ＜Draw 1＞ (Draw 1 card from your deck).",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart:
            "Then, you may play 1 [Deva] trait Digimon card without the same name as the cards in your battle area or trash from your hand to an empty space in your breeding area without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Deva"],
                  match: "trait",
                },
              ],
            },
            count: 1,
            upTo: true,
          },
          payCost: false,
          from: ["hand"],
          breeding: true,
          notSameNameAs: ["battleArea", "trash"],
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Piercing",
            },
          },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Four Sovereigns", "God Beast"], match: "trait" }] },
            raw: "this Digimon has the [Four Sovereigns]/[God Beast] trait",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-040", compiled);
