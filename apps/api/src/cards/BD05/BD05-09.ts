import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

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
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              nameOrTrait: [{ tokens: ["Wizard"], match: "traitContains" }],
            },
            raw: "you have a purple Digimon with [Wizard] in any of its traits",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" },
          effect: { kind: "modifyDP", amount: 2000 },
          while: {
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

registerIrCard("BD05-09", compiled);
