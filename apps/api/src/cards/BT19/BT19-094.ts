// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored IR correction: model the trash-trigger branch outcome and the
// Main delete-until-security-count clause with structured result conditions.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Lucemon (X Antibody)"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "trashTop",
              controller: "opponent",
              optionalFor: "opponent",
              amount: 1,
              bindResultAs: "opponentSecurityTrashedBySeventh",
              cost: {
                kind: "return",
                target: {
                  filter: {
                    zone: "trash",
                    controller: "mine",
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by returning this card from the trash to the bottom of the deck",
              },
            },
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
              condition: {
                kind: "bindingEmpty",
                ref: "opponentSecurityTrashedBySeventh",
              },
            },
          ],
          raw: "whenOneOfYoursDigivolves",
        },
      ],
      isFromTrash: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "DeleteUntilCount",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          untilCountSource: "mineSecurityCount",
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "ifThisEffectActed",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-094", compiled);
