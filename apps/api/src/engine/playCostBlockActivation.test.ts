import { getCardDefinition } from "@aegis/shared";
import { expect, it } from "vitest";
import { compiled as original } from "../cards/BT1/BT1-010.js";
import { registerIrCard } from "./effects/interpreter.js";
import { setupEngine, settle } from "./testkit/harness.js";
import "../cards/index.js";

it.each([false, true])(
  "preserves unrelated pay-time effects while gating nested reduction payments (blocked=%s)",
  async (blocked) => {
    registerIrCard("BT1-010", {
      effects: [
        {
          trigger: "BeforePayCost",
          actions: [
            {
              kind: "CostGatedBlock",
              cost: {
                kind: "trash",
                target: { filter: { cardId: "BT1-009", controller: "mine", zone: "hand" }, from: ["hand"], count: 1 },
              },
              actions: [
                {
                  kind: "ReducePlayCost",
                  payment: { kind: "payCost", cost: { kind: "payMemory", memory: 0 } },
                  amount: { kind: "fixed", value: 2 },
                },
              ],
            },
          ],
        },
        { trigger: "BeforePayCost", actions: [{ kind: "GainMemory", amount: 1 }] },
      ],
      coverage: "full",
      residual: [],
    });
    try {
      const s = setupEngine(
        {
          0: {
            battleArea: blocked ? ["ST12-03"] : [],
            hand: [
              { card: "BT1-010", as: "played" },
              { card: "BT1-009", as: "payment" },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );
      s.state.memory = 8;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() =>
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("played").instanceId),
      );
      expect(s.state.memory).toBe(9 - getCardDefinition("BT1-010")!.playCost! + (blocked ? 0 : 2));
      expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("payment").instanceId)).toBe(
        blocked,
      );
      expect(s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("payment").instanceId)).toBe(
        !blocked,
      );
    } finally {
      registerIrCard("BT1-010", original);
    }
  },
);
