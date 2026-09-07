import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

/** BT25-086 Dan Yuki — audited against the catalog and KB Q6405-Q6408/Q6713. */
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
