import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [
                {
                  tokens: ["TS"],
                  match: "trait",
                },
              ],
            },
            raw: "you have a card w/[TS] trait",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: "all",
          },
        },
        {
          kind: "Trash",
          target: {
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Option"],
              placedInBattleAreaByEffect: true,
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "if this effect didn't delete",
          },
        },
        {
          kind: "Link",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
          },
          recipient: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          allowBreedingRecipient: true,
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      isLinked: true,
      frequency: "OncePerTurn",
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
  linkRequirement: [{ traits: ["TS"], cost: 3 }],
};

registerIrCard("BT25-093", compiled);
