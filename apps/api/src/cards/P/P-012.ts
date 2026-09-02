// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4123: this [Main] effect is activated during the main phase, not as an interrupt.
// KB Q4124: the Veedramon-name requirement checks only the battle area.
// KB Q4126: the +1000 DP recipient may be any of the controller's Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-012/main",
      trigger: "Main",
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          zone: "battleArea",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Veedramon"], match: "name" }],
        },
        raw: "you have a Digimon with [Veedramon] in its name",
      },
      actions: [
        {
          kind: "Modal",
          choose: 1,
          labels: ["Draw 1", "1 of your Digimon gets +1000 DP for the turn"],
          options: [
            [{ kind: "Draw", amount: 1, controller: "mine" }],
            [
              {
                kind: "ModifyDP",
                target: {
                  filter: { controller: "mine", kind: ["Digimon"] },
                  count: 1,
                },
                amount: 1000,
                duration: "forTheTurn",
              },
            ],
          ],
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-012", compiled);
