import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "CostModifier",
          costType: "use",
          mode: "reduce",
          amount: 3,
          handResident: true,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "permanent",
          condition: {
            kind: "allOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Wizard"], match: "trait" }],
                },
              },
              {
                kind: "youHave",
                filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Digimon"], countMax: 1 },
              },
            ],
            raw: "you have no Digimon other than 1 [Wizard] trait Digimon",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Delete 1 of your opponent's Digimon with the lowest level.",
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
        },
      ],
    },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD05-10", compiled);
