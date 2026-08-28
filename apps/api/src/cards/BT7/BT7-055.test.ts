import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT7-055.js";

describe("BT7-055 Ebonwumon", () => {
  it("publishes the unsuspend cost only during the opponent's turn", () => {
    expect(runtimeCompiledCard("BT7-055")?.effects[1]).toMatchObject({
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Restrict",
          target: { count: "all" },
          restriction: "unsuspendHandTrashCost",
          duration: "untilOpponentTurnEnd",
        },
      ],
    });
  });

  it("suspends an opposing Digimon and gains memory for all opposing suspended Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-055", as: "ebon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target" },
            { card: "BT1-011", suspended: true, as: "already" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ebon"));

    expect(s.perm("target").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("requires the opponent to trash a hand card before an effect can unsuspend their Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT7-055", as: "ebon" }] },
        1: {
          battleArea: [{ card: "BT1-010", suspended: true, as: "target" }],
          hand: [{ card: "BT1-011", as: "payment" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);

    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("payment").instanceId)).toBe(true);
  });
});
