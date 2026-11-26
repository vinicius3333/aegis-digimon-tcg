import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          cost: {
            kind: "compound",
            costs: [
              { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              {
                kind: "suspend",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
                  },
                  count: 1,
                },
              },
            ],
            raw: "By suspending this Tamer and 1 of your Digimon with the [ALYSION] trait",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD03-06", compiled);
