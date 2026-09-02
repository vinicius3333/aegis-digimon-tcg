import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon"],
          count: 2,
          payCost: false,
          cost: {
            kind: "place",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Doomsday Clock"], match: "name" }] },
              count: 1,
              from: ["hand", "trash"],
            },
            raw: "By placing 1 [Doomsday Clock] from your hand or trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
                },
                count: 1,
              },
              optional: true,
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

registerIrCard("BT17-059", compiled);
