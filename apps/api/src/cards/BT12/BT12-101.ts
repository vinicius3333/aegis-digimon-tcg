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
        { kind: "TrashDigivolution", target: opposingDigimon, amount: 3, fromTop: true },
        {
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
