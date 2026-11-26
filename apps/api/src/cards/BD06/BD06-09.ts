import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import type { Filter } from "@aegis/shared/effects/ir/filters/filter";
import { registerIrCard } from "#api/engine/effects/interpreter";

const alysionTrait: Filter["nameOrTrait"] = [{ tokens: ["ALYSION"], match: "trait" }];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", kind: ["Digimon"], colors: ["Green"], nameOrTrait: alysionTrait },
            raw: "you have a green Digimon with the [ALYSION] trait",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
              suspended: true,
              nameOrTrait: alysionTrait,
            },
            count: "all",
          },
          effect: { kind: "modifyDP", amount: 1000 },
          raw: "All of your suspended green Digimon with the [ALYSION] trait get +1000 DP",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD06-09", compiled);
