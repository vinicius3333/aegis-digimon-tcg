import type { Action, CompiledCard, Target } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const grantTarget: Target = {
  filter: {
    controller: "mine",
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["Tyrannomon"], match: "name" },
      { tokens: ["Reptile", "Dinosaur"], match: "trait" },
    ],
  },
  count: 1,
};

const grantRaidAndPiercing = (): Action[] => [
  {
    kind: "GainKeyword",
    target: grantTarget,
    keyword: { keyword: "Raid", raw: "＜Raid＞" },
    keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }],
    duration: "forTheTurn",
  },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenMoving",
      actions: grantRaidAndPiercing(),
    },
    {
      trigger: "OnPlay",
      actions: grantRaidAndPiercing(),
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 1000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Koromon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX11-007", compiled);
