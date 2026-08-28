// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentDigimon = { controller: "opponent", kind: ["Digimon"] };

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDiscardSecurity",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: opponentDigimon, count: 1 },
          keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: { kind: "memoryAtMost", controller: "mine", value: 2 },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectRemovesFromSecurity",
          fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: opponentDigimon, count: 1 },
              keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
              duration: "untilOpponentTurnEnd",
              cost: {
                kind: "suspend",
                target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
                raw: "by suspending this Tamer",
              },
              optional: true,
            },
          ],
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

registerIrCard("BT15-084", compiled);
