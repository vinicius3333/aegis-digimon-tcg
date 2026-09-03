import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "opponentHas",
            filter: { zone: "battleArea", controllerDefault: "opponent", kind: ["Digimon"], suspended: true },
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Green"],
            levelComparison: { op: "eq", value: 5 },
          },
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              digivolveOption: {
                into: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  colors: ["Green"],
                  levelComparison: { op: "eq", value: 6 },
                },
                target: { filter: { isTriggerSource: true }, count: 1 },
                payCost: false,
                optional: true,
              },
              add: [],
              rest: "deckBottomAnyOrder",
              cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
              optional: true,
              abortOnDecline: true,
            },
          ],
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
registerIrCard("BT5-089", compiled);
