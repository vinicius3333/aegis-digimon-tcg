import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Evade",
          raw: "＜Evade＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: {
            kind: "TreatAsLevel",
            level: 6,
            context: "DNADigivolution",
            intoNames: ["Examon"],
          },
          tokens: [],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: [
            {
              filter: {
                isSelfRef: true,
              },
              zone: "battleArea",
              count: 1,
            },
            {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Dramon"],
                    match: "name",
                  },
                ],
              },
              zone: "battleArea",
              count: 1,
            },
          ],
          into: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              hasDnaDigivolutionRequirement: true,
            },
            count: 1,
          },
          payCost: true,
          optional: true,
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
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Evade",
              raw: "＜Evade＞",
            },
          },
          while: {
            kind: "selfHasNameContaining",
            names: ["Dramon", "Examon"],
            raw: "this Digimon has [Dramon] or [Examon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Coredramon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-020", compiled);
