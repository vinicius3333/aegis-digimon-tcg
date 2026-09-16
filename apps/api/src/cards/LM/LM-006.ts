import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          from: ["trash"],
          payCost: true,
          reduceCostByScaling: {
            per: 1,
            unit: "namedCount",
            countSource: "returnedTamerPlayCost",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
              },
              count: 1,
            },
            to: "deckBottom",
            storeAsPlayCost: "returnedTamerPlayCost",
            raw: "By returning 1 of your Tamers to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Trash the bottom 3 digivolution cards of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 3,
          fromTop: false,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Trash the bottom 3 digivolution cards of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 3,
          fromTop: false,
        },
        {
          kind: "Restrict",
          target: {
            filter: {
              digivolutionCards: "none",
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "attack",
          duration: "untilOpponentTurnEnd",
          whileMatchesTargetFilter: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-006", compiled);
