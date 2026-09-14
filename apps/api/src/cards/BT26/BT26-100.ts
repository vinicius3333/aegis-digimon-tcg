import type { CompiledCard, Condition, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const titan: Filter = { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }] };
const titanCard: Filter = {
  controller: "mine",
  kind: ["Digimon", "Tamer"],
  levelComparison: { op: "lte", value: 4 },
  nameOrTrait: [{ tokens: ["Titan"], match: "trait" }],
};
const titanDigimon: Filter = { ...titan, levelComparison: { op: "lte", value: 4 } };
const noFaceUpSecurity: Condition = { kind: "faceUpSecurityAtMost", controller: "mine", value: 0 };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "WaiveColorRequirement",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: noFaceUpSecurity,
        },
      ],
    },
    {
      trigger: "AllTurns",
      isSecurity: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: titan, count: "all" },
          keyword: { keyword: "Blocker" },
          duration: "permanent",
        },
        {
          kind: "ModifyDP",
          target: { filter: titan, count: "all" },
          amount: 3000,
          duration: "permanent",
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                { tokens: ["Plutomon"], match: "name" },
                { tokens: ["Titamon"], match: "name" },
              ],
            },
          },
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] Add your bottom security card to the hand and place this card face up as the bottom security card.",
          kind: "SecurityManipulation",
          op: "toHand",
          controller: "mine",
          amount: 1,
          toTop: false,
        },
        {
          effectTextPart:
            "[Main] Add your bottom security card to the hand and place this card face up as the bottom security card.",
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: false,
          faceUp: true,
        },
        {
          effectTextPart:
            "Then, you may play 1 level 4 or lower [Titan] trait card from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: { filter: titanCard, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: titanDigimon, count: 1 },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-100", compiled);
