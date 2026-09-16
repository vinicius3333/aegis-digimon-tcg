import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levels: [3],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] ＜Draw 1＞ (Draw 1 card from your deck).",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart:
            "Then, trash 1 card in your hand. If a Digimon card with [Cerberusmon] in its name or [X Antibody] is in this Digimon's digivolution cards, activate this Digimon's [On Play] effects.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
        {
          kind: "ReactivateEffect",
          fromTrigger: "OnPlay",
          count: 1,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Cerberusmon"],
                  match: "name",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "a Digimon card with [Cerberusmon] in its name or [X Antibody] is in this Digimon's digivolution cards",
          },
        },
        {
          kind: "ActivateForeignEffect",
          zone: "digivolutionCards",
          fromTriggers: ["OnPlay"],
          filter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Gammamon"], match: "nameExact" }],
          },
          count: 1,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
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
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By deleting 1 of your other Digimon",
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
};

registerIrCard("EX5-061", compiled);
