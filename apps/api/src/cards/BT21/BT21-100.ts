import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              nameOrTrait: [{ tokens: ["Takato Matsuki"], match: "nameExact" }],
            },
            raw: "you have [Takato Matsuki]",
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] ＜Draw 1＞ and trash 1 card in your hand.",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "[Main] ＜Draw 1＞ and trash 1 card in your hand.",
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    },
    {
      trigger: "YourTurn",
      keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "any", kind: ["Digimon"], deleteCause: "byEffect" },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Guilmon", "Growlmon"], match: "name" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Growlmon", "Gallantmon", "Megidramon"], match: "name" }],
              },
              payCost: false,
              from: ["trash"],
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart: "[Security] Gain 1 memory.",
          kind: "GainMemory",
          amount: 1,
        },
        { kind: "PlaceInBattleAreaSelf" },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT21-100", compiled);
