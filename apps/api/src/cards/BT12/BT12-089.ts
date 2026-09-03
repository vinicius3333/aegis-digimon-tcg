import { type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2, controller: "mine" } }],
    },
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      condition: {
        kind: "allOf",
        conditions: [
          { kind: "memoryAtLeast", value: 4, controller: "mine" },
          {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }],
            },
          },
          {
            kind: "selfHasMinTrash",
            count: 1,
            filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Growlmon"], match: "nameExact" }] },
          },
          {
            kind: "selfHasMinTrash",
            count: 1,
            filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "nameExact" }] },
          },
        ],
      },
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              zone: "battleArea",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Guilmon"], match: "name" }],
            },
            count: 1,
            bindAs: "bt12_089_host",
          },
        },
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                { tokens: ["Takato Matsuki"], match: "nameExact" },
                { tokens: ["Growlmon"], match: "nameExact" },
                { tokens: ["WarGrowlmon"], match: "nameExact" },
              ],
            },
            count: 3,
            requiredNamesExact: ["Takato Matsuki", "Growlmon", "WarGrowlmon"],
          },
          mixedSources: { battleAreaPermanents: true, trash: true },
          destination: { filter: { boundRef: "bt12_089_host" }, count: 1 },
          underSelectionRef: "bt12_089_host",
          position: "bottom",
          order: "any",
        },
        {
          kind: "Digivolve",
          target: { fromSelectionRef: "bt12_089_host", filter: {}, count: 1, bindAs: "bt12_089_evolved" },
          into: {
            location: "hand",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Gallantmon"], match: "nameExact" }],
          },
          from: ["hand"],
          payCost: true,
          costOverride: 4,
          ignoreLevelRequirement: true,
          optional: true,
          abortOnDecline: true,
          bindResultAs: "bt12_089_evolved",
        },
        {
          kind: "ModifyDP",
          target: { fromSelectionRef: "bt12_089_host", filter: {}, count: 1 },
          amount: 2000,
          duration: "forTheTurn",
          condition: { kind: "ifThisEffectDigivolved" },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-089", compiled);
export { compiled };
