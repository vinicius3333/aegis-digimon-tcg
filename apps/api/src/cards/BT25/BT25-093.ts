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
              zone: ["battleArea", "breeding"],
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
          effectTextPart:
            "[Main] Delete all of your opponent's Digimon with the lowest DP. If this effect didn't delete, trash 1 of your opponent's Option cards in the battle area.",
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
          effectTextPart:
            "[Main] Delete all of your opponent's Digimon with the lowest DP. If this effect didn't delete, trash 1 of your opponent's Option cards in the battle area.",
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
          effectTextPart: "Then, you may link this card to 1 of your Digimon on the field without paying the cost.",
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
            // KB Q6441/Q6443: this [Main] link may also target a Digimon in the breeding area.
            orFilters: [{ controller: "mine", kind: ["Digimon"], zone: "breeding" }],
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
