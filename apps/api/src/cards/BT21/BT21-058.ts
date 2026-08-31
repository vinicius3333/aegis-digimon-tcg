import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "BT21-058";

const revealAndPlaceVemmon = [
  {
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
