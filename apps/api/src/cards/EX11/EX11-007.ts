// @ts-nocheck
import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const grantTarget = {
  filter: {
    controller: "mine" as const,
    kind: ["Digimon"],
    nameOrTrait: [
      { tokens: ["Tyrannomon"], match: "name" as const },
      { tokens: ["Reptile", "Dinosaur"], match: "trait" as const },
    ],
  },
  count: 1 as const,
};

// Both keywords belong to the same printed "1 of your Digimon" selection. Encode
// Piercing as the additional keyword on the same action so target selection occurs once.
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
      names: ["Koromon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX11-007", compiled);
