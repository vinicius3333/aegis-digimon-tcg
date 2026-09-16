import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Creepymon (X Antibody)"],
                match: "nameExact",
              },
            ],
          },
          actions: [
            {
              kind: "ActivateMain",
              cost: {
                kind: "return",
                to: "deckBottom",
                target: {
                  filter: {
                    isSelfRef: true,
                    zone: "trash",
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by returning this card to the bottom of the deck",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "gte",
                value: 6,
              },
            },
            count: 1,
          },
        },
        {
          kind: "TrashTopDeck",
          controller: "opponent",
          amount: 3,
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "if this effect didn't delete",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-096", compiled);
