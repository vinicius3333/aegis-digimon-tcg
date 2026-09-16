import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtMost", value: 4 } }],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          effectTextPart:
            "[End of Your Turn] By suspending this Tamer, 1 of your [TS] trait Digimon gains +1000 DP for the turn for each memory your opponent has.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
            },
            count: 1,
          },
          amount: 1000,
          scaling: { unit: "memory", per: 1, filter: { controller: "opponent" } },
          duration: "forTheTurn",
          optional: true,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
            },
          },
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "by suspending this Tamer",
          },
          abortOnDecline: true,
        },
        {
          effectTextPart: "Then, it may attack.",
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              zone: "battleArea",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["TS"], match: "trait" }],
            },
            count: 1,
            sameTarget: true,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-086", compiled);
