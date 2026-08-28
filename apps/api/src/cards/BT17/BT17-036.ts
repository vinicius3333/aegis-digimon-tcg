// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT17-036's second All Turns clause is specifically effect-driven trash from security;
// `whenEffectTrashesFromSecurity` excludes ordinary security checks and non-trash relocations.
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
