import type { CompiledCard, Condition } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashedThisEffect: Condition = { kind: "ifThisEffectActed" };

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[When Digivolving] You may trash 1 card in your hand to treat this Digimon as also having the colors of the trashed card for the turn.",
          kind: "Trash",
          target: {
            filter: { zone: "hand", controller: "mine", kind: ["Digimon", "Tamer", "Option"] },
            count: 1,
            upTo: true,
          },
          bindResultAs: "trashedCard",
        },
        {
          kind: "GrantStatic",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          grant: "colorFromLastTrashed",
          duration: "forTheTurn",
          condition: trashedThisEffect,
        },
        {
          effectTextPart: "Then, if this Digimon has 2 or more colors, ＜Draw 2＞. (Draw 2 cards from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 2,
          condition: {
            kind: "allOf",
            conditions: [trashedThisEffect, { kind: "selfColorCount", op: "gte", value: 2 }],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-040", compiled);
