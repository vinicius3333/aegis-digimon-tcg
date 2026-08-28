import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-090.js";

describe("BT6-090 Izzy Izumi & Joe Kido", () => {
  it("gains 2 memory at turn start when the opponent has 2 Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT6-090", as: "tamer" }] },
      1: { battleArea: ["BT1-010", "BT1-011"] },
    });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("may suspend on the opponent's turn to draw when an own black Digimon is deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-090", as: "tamer" },
            { card: "BT6-066", as: "black" },
          ],
          deck: [{ card: "BT6-001", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("black").permanentId], "byEffect");

    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toContain(s.inst("drawn").instanceId);
  });

  it("does not draw when its optional suspension is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT6-090", as: "tamer" },
            { card: "BT6-066", as: "black" },
          ],
          deck: [{ card: "BT6-001", as: "notDrawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.deletePermanent([s.perm("black").permanentId], "byEffect");
    await settle(() => s.perm("tamer").isSuspended === false && s.state.players[0]!.deck.length === 1);

    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
