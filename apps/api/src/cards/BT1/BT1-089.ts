// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          condition: {
            kind: "allOf",
            conditions: [{ kind: "youHaveGreenLevelAtLeastInBattle", value: 5 }, { kind: "breedingActionAvailable" }],
          },
          options: [
            [{ kind: "Hatch" }],
            [
              {
                kind: "MovePermanent",
                direction: "toBattle",
                target: {
                  filter: {
                    controller: "mine",
                    zone: "breeding",
                    kind: ["Digimon"],
                    levelComparison: { op: "gte", value: 3 },
                  },
                  count: 1,
                },
              },
            ],
          ],
          optionConditions: [
            { kind: "breedingAreaEmpty" },
            {
              kind: "youHave",
              filter: {
                controllerDefault: "mine",
                zone: "breeding",
                kind: ["Digimon"],
                levelComparison: { op: "gte", value: 3 },
              },
            },
          ],
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-089", compiled);
export default compiled;
