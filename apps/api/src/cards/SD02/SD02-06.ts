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
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          fromTop: false,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
            },
            raw: "you have a Digimon with the [ALYSION] trait",
          },
          cost: {
            kind: "suspend",
            optional: true,
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
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

registerIrCard("SD02-06", compiled);
