import type { CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const trashableHand = { controllerDefault: "mine", zone: "hand" } satisfies Filter;
const iliadTarget = {
  controllerDefault: "mine",
  zone: "trash",
  kind: ["Digimon"],
  colors: ["Red"],
  nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }],
  orFilters: [
    {
      controllerDefault: "mine",
      zone: "trash",
      kind: ["Digimon"],
      colors: ["Blue"],
      nameOrTrait: [{ tokens: ["Iliad"], match: "trait" }],
    },
  ],
} satisfies Filter;

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: trashableHand, count: 1 } },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { filter: trashableHand, count: 1 } },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: iliadTarget, count: 1 },
          from: ["trash"],
          payCost: true,
          reduceCostBy: 4,
          optional: true,
          condition: {
            kind: "youHave",
            filter: { controllerDefault: "mine", zone: "battleArea", kind: ["Digimon"], colors: ["Blue", "Yellow"] },
          },
          cost: { kind: "return", target: { filter: { isSelfRef: true }, count: 1 }, to: "deckBottom" },
        },
      ],
    },
    {
      trigger: "Static",
      isInherited: true,
      actions: [],
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 3, traits: ["TS"], cost: 2, isAlternate: true }],
};

registerIrCard("BT26-067", compiled);
