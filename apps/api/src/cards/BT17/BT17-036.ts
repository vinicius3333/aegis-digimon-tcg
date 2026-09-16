import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          actions: [],
          cost: {
            kind: "trashSecurityTop",
            raw: "by trashing the top card of your security stack, prevent it",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectTrashesFromSecurity",
          raw: "[All Turns] [Once Per Turn] When a card is trashed from your security stack by an effect, this Digimon with [Leon Alexander] in its digivolution cards may digivolve into a Digimon card with [Pulsemon]\u00a0in its text in the hand without paying the cost.",
          effectTextPart:
            "[All Turns] [Once Per Turn] When a card is trashed from your security stack by an effect, this Digimon with [Leon Alexander] in its digivolution cards may digivolve into a Digimon card with [Pulsemon]\u00a0in its text in the hand without paying the cost.",
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  isSelfRef: true,
                  digivolutionStackNameOrTrait: [
                    {
                      tokens: ["Leon Alexander"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Pulsemon"],
                    match: "text",
                  },
                ],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "selfTopHasText",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Pulsemon"],
                  match: "text",
                },
              ],
            },
            raw: "this Digimon has [Pulsemon] in its text",
          },
          cost: {
            kind: "trashSecurityTop",
            raw: "by trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      texts: ["Pulsemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-036", compiled);
