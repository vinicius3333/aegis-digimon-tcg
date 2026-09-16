import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "RestrictDigivolveInto",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            colors: ["White"],
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          effectTextPart: "[End of Opponent's Turn] Delete this Digimon.",
          kind: "Delete",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
        },
        {
          effectTextPart:
            "Then, you may play 1 Digimon card with the [Dark Masters] trait, other than [Puppetmon], from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              excludeNames: ["Puppetmon"],
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Dark Masters"],
                  match: "trait",
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
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-052", compiled);
export { compiled };
