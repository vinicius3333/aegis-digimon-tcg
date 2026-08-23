// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const mamemonOrRoyalKnight = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  nameOrTrait: [
    { tokens: ["Mamemon"], match: "name" },
    { tokens: ["Royal Knight"], match: "trait" },
  ],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                playCostLte: 10,
                nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                playCostLte: 10,
                nameOrTrait: [{ tokens: ["Mamemon"], match: "name" }],
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "trash",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: mamemonOrRoyalKnight, count: "all" },
          effect: { kind: "keyword", keyword: { keyword: "Jamming", raw: "＜Jamming＞" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: mamemonOrRoyalKnight.nameOrTrait },
            raw: "this Digimon has [Mamemon] in its name or the [Royal Knight] trait",
          },
        },
        {
          kind: "Aura",
          target: { filter: mamemonOrRoyalKnight, count: "all" },
          effect: { kind: "keyword", keyword: { keyword: "Reboot", raw: "＜Reboot＞" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: mamemonOrRoyalKnight.nameOrTrait },
            raw: "this Digimon has [Mamemon] in its name or the [Royal Knight] trait",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-074", compiled);
