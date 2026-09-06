import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: { isSelfRef: true },
          fireCondition: {
            kind: "triggerDefenderMatchesFilter",
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
          },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "untilEndOfBattle",
            },
          ],
          raw: "when this Digimon battles an opponent's Digimon with no digivolution cards",
        },
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
          fireCondition: {
            kind: "allOf",
            conditions: [
              { kind: "triggerDefenderIsSelf" },
              {
                kind: "triggerAttackerMatchesFilter",
                filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
              },
            ],
          },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "untilEndOfBattle",
            },
          ],
          raw: "when this Digimon is attacked by an opponent's Digimon with no digivolution cards",
        },
        {
          kind: "SubTrigger",
          event: "whenBlocked",
          sourceFilter: { isSelfRef: true },
          fireCondition: {
            kind: "triggerDefenderMatchesFilter",
            filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "none" },
          },
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "untilEndOfBattle",
            },
          ],
          raw: "when this Digimon blocks an opponent's Digimon with no digivolution cards",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST2-01", compiled);
