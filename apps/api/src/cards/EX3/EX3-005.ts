// Hand-authored override: the inherited attack gate is structured as selfHasOnPlayEffect.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Hina Kurihara"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "lte",
                    value: 3000,
                  },
                },
                count: 1,
              },
            },
          ],
          raw: "When you play a [Hina Kurihara]",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 3000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfHasOnPlayEffect",
            raw: "this Digimon has an [On Play] effect",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-005", compiled);
