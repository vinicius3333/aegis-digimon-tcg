import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// HAND-FIXED IR for BT19-014 — do not regenerate.
// [ShootingStarmon] is a bracketed exact card-name reference, so the PlayWithoutCost
// filter uses `nameExact`, not the substring `name` match.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "MaterialSave",
          amount: 4,
          raw: "＜Material Save 4＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] For each color in this Digimon's digivolution cards, all of your opponent's Digimon get -1000 DP for the turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -1000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              isSelfRef: true,
              zone: "digivolutionCards",
            },
            unit: "digivolutionCardColors",
          },
        },
        {
          effectTextPart: "Then, you may play 1 [ShootingStarmon] from under your Tamers without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "underTamers",
              nameOrTrait: [
                {
                  tokens: ["ShootingStarmon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["underTamers"],
          payCost: false,
          optional: true,
        },
      ],
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
                relativeToSource: true,
              },
            },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        { names: ["OmniShoutmon"] },
        { names: ["ZeigGreymon"] },
        { names: ["AtlurBallistamon"] },
        { names: ["JaegerDorulumon"] },
        { names: ["RaptorSparrowmon"] },
      ],
      count: 2,
    },
  ],
};

registerIrCard("BT19-014", compiled);
