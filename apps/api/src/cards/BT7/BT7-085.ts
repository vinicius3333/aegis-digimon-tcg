import { CardColor, type CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
    {
      trigger: "Main",
      frequency: "OncePerTurn",
      sharedUseKey: "main-digivolve",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Hybrid"], match: "traitContains" }] },
            from: ["trash"],
            count: 5,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          order: "any",
          optional: true,
          trackCount: "bt7TakuyaHybridCount",
        },
        {
          kind: "Digivolve",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["EmperorGreymon"], match: "nameExact" }],
          },
          from: ["hand"],
          payCost: true,
          optional: true,
          virtualBase: { level: 5, colors: [CardColor.Red] },
          condition: { kind: "namedCountAtLeast", countSource: "bt7TakuyaHybridCount", count: 5 },
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 2000 },
          while: { kind: "true" },
        },
      ],
    },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "securityAttack", amount: 1 },
          while: { kind: "selfDpAtLeast", value: 10000 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT7-085", compiled);
