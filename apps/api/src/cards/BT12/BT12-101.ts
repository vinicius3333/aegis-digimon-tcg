import type { CompiledCard, Filter, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opposingDigimon: Target = {
  filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" },
  count: 1,
};
const ownGreenDigimon: Filter = { controller: "mine", zone: "battleArea", kind: ["Digimon"], colors: ["Green"] };
const freeBlue: Target = {
  filter: {
    controller: "mine",
    zone: "hand",
    kind: ["Digimon"],
    colors: ["Blue"],
    levelComparison: { op: "lte", value: 4 },
    nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
  },
  count: 1,
};

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Trash the top 3 digivolution cards of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: opposingDigimon,
          amount: 3,
          fromTop: true,
        },
        {
          effectTextPart:
            "Then, if you have a green Digimon in play, you may play 1 level 4 or lower blue Digimon card with a [Free] trait from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: freeBlue,
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: { kind: "youHave", filter: ownGreenDigimon },
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

export default registerIrCard("BT12-101", compiled);
