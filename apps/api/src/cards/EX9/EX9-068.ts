import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  coverage: "full",
  residual: [],
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } }],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            playCostGte: 7,
            nameOrTrait: [{ tokens: ["Cyborg", "Machine", "DM"], match: "trait" }],
          },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "Draw", controller: "mine", amount: 1 },
            { kind: "GainMemory", amount: 1 },
            {
              kind: "PlaceUnder",
              target: { filter: { zone: "hand", controller: "mine" }, count: 1, allowZero: true },
              from: ["hand"],
              underFilter: { isTriggerSource: true },
              position: "bottom",
              faceDown: true,
              optional: true,
            },
          ],
          raw: "When one of your play cost 7 or higher Cyborg, Machine or DM Digimon is played",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          payCost: false,
        },
      ],
    },
  ],
};

registerIrCard("EX9-068", compiled);
export default compiled;
