// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelLte: "returnedDigimonLevel",
                },
                count: 1,
              },
              to: "hand",
            },
          ],
          cost: {
            kind: "return",
            target: {
              filter: {
                isSelfRef: true,
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "traitContains",
                  },
                ],
              },
              count: 1,
              isSelf: true,
            },
            to: "deckBottom",
            storeAs: "returnedDigimonLevel",
            raw: "by returning this Digimon with [Aqua]/[Sea Animal] in one of its traits to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-002", compiled);
