// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [{
        kind: "GainMemory",
        amount: 2,
        condition: {
          kind: "opponentHas",
          filter: { controllerDefault: "opponent", kind: ["Digimon"], suspended: true },
          raw: "your opponent has a suspended Digimon in play",
        },
      }],
    },
    {
      trigger: "WhenAttacking",
      attackScope: "ally",
      actions: [{
        kind: "RevealAdd",
        revealCount: 3,
        digivolveOption: {
          into: { controllerDefault: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 6 }, colors: ["Green"] },
          payCost: false,
          optional: true,
        },
        add: [],
        rest: "deckBottomAnyOrder",
        reverseBottomOrder: true,
        cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        optional: true,
        abortOnDecline: true,
      }],
    },
    {
      trigger: "Security",
      actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, from: ["security"], payCost: false }],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-089", compiled);
