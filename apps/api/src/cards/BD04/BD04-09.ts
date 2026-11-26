import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Boss"], match: "trait" }],
            },
            raw: "you have a Digimon with the [Boss] trait",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainTriggeredEffect",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          gainedTrigger: "onDeletionOf",
          gainedActions: [
            {
              kind: "PlayWithoutCost",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              from: ["trash"],
              payCost: false,
              suspended: true,
              condition: {
                kind: "anyOf",
                conditions: [
                  { kind: "selfHasNameContaining", names: ["Leomon"] },
                  { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Boss"], match: "trait" }] } },
                ],
                raw: "this Digimon had [Leomon] in its name or the [Boss] trait",
              },
            },
          ],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart: "[Security] Suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
        { effectTextPart: "Then, add this card to the hand.", kind: "AddToHandSelf" },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD04-09", compiled);
