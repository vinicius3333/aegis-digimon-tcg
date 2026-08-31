import { compiledEffects } from "@aegis/shared";
import type { CardEffect, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const cardId = "EX4-059";

export const compiled: CompiledCard = {
  ...compiledEffects[cardId]!,
  effects: [
    ...compiledEffects[cardId]!.effects.map((effect): CardEffect =>
      effect.trigger === "WhenDigivolving"
        ? {
            ...effect,
            actions: [
              {
                kind: "GainTriggeredEffect",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                gainedTrigger: "onDeletionOf",
                gainedActions: [
                  {
                    kind: "PlayWithoutCost",
                    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                    from: ["trash"],
                    payCost: false,
                    optional: true,
                  },
                ],
                duration: "untilOpponentTurnEnd",
              },
              {
                kind: "GainTriggeredEffect",
                target: {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "lte", value: 5 },
                    excludeSelf: true,
                  },
                  count: 1,
                },
                gainedTrigger: "onDeletionOf",
                gainedActions: [
                  {
                    kind: "PlayWithoutCost",
                    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                    from: ["trash"],
                    payCost: false,
                    optional: true,
                  },
                ],
                duration: "untilOpponentTurnEnd",
              },
            ],
          }
        : effect,
    ),
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          cost: {
            kind: "suspend",
            target: { filter: { controller: "mine", kind: ["Digimon"], excludeSelf: true }, count: 1 },
          },
          dpSource: { kind: "suspendedTarget" },
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "forThisAttack",
          alsoGainKeywords: [{ keyword: "Piercing" }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard(cardId, compiled);
