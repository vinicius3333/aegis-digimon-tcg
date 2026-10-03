import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-058";

const revealAndPlaceVemmon = [
  {
    effectTextPart:
      "[On Play] [When Digivolving] Reveal the top 3 cards of your deck. Add 1 card with [Vemmon] in its text among them to the hand. trash the rest.",
    kind: "RevealAdd" as const,
    revealCount: 3,
    add: [
      {
        filter: {
          controllerDefault: "mine" as const,
          nameOrTrait: [{ tokens: ["Vemmon"], match: "text" as const }],
        },
        count: 1,
        to: "hand" as const,
      },
    ],
    rest: "trash" as const,
  },
  {
    effectTextPart:
      "Then, you may place up to 2 [Vemmon] from your trash as 1 of your Digimon's bottom digivolution cards.",
    kind: "PlaceUnder" as const,
    target: {
      filter: {
        zone: "trash" as const,
        controller: "mine" as const,
        nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" as const }],
      },
      count: 2,
      upTo: true,
      from: ["trash" as const],
    },
    underFilter: { controller: "mine" as const, kind: ["Digimon" as const] },
    position: "bottom",
    optional: true,
  },
];

export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: revealAndPlaceVemmon },
    { trigger: "WhenDigivolving", actions: revealAndPlaceVemmon },
    {
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardReturnToDeckBottom",
          raw: "When any [Vemmon] are returned to the bottom of the deck from this Digimon's digivolution cards",
          sourceFilter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }] },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 4 },
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
