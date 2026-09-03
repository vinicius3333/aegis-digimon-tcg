import type { Action, CompiledCard, Filter } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const xrosHeart: Filter = {
  controller: "mine",
  zone: "underTamers",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }],
  dp: { op: "lte", value: 4000 },
};
const playFromTamer: Action = {
  kind: "PlayWithoutCost",
  target: { filter: xrosHeart, count: 1 },
  from: ["underTamers"],
  payCost: false,
  optional: true,
};
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Play a Xros Heart Digimon", "Unsuspend Shoutmon EX6 and ShootingStarmon, then attack"],
          options: [
            [playFromTamer],
            [
              {
                kind: "Attack",
                target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
                attackPlayer: true,
                mandatory: true,
                cost: {
                  kind: "unsuspendNamed",
                  targets: [
                    {
                      filter: {
                        controller: "mine",
                        kind: ["Digimon"],
                        nameOrTrait: [{ tokens: ["Shoutmon EX6"], match: "name" }],
                        suspended: true,
                      },
                      count: 1,
                    },
                    {
                      filter: {
                        controller: "mine",
                        kind: ["Digimon"],
                        nameOrTrait: [{ tokens: ["ShootingStarmon"], match: "name" }],
                        suspended: true,
                      },
                      count: 1,
                    },
                  ],
                  raw: "by unsuspending 1 [Shoutmon EX6] and 1 [ShootingStarmon]",
                },
              },
            ],
          ],
        },
      ],
    },
    { trigger: "Security", actions: [playFromTamer], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-090", compiled);
