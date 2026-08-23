import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-083.js";

describe("P-083 Floramon", () => {
  it("prevents an opponent Digimon from unsuspending with a green Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-083", as: "source" }],
          battleArea: [{ card: "BT1-088", as: "tamer" }],
          deck: ["BT1-009", "BT1-009"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }], deck: ["BT1-009", "BT1-009"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").isSuspended).toBe(true);

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);

    await advance(s.engine).verb.unsuspend([s.perm("target").permanentId]);
    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not prevent unsuspending without a green Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-083", as: "source" }], battleArea: [{ card: "BT1-086", as: "blue-tamer" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });
});
