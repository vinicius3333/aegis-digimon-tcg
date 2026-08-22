// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "SubTrigger",
        event: "whenEffectAddsToOpponentHand",
        actions: [{
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: { kind: "trash", target: { filter: { zone: "digivolutionCards" }, count: 1 } },
          optional: true,
          abortOnDecline: true,
        }],
      }],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      actions: [{
        kind: "PlaceUnder",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        underFilter: { controller: "mine", kind: ["Tamer"] },
        optional: true,
      }],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    },
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-081", compiled);
