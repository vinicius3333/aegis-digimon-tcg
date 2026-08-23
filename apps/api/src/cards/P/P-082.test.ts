import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-082.js";

describe("P-082 Kunemon", () => {
  it("suspends an opponent Digimon with a green Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-082", as: "source" }], battleArea: [{ card: "BT1-088", as: "tamer" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend without a green Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-082", as: "source" }], battleArea: [{ card: "BT1-086", as: "blue-tamer" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("target").isSuspended).toBe(false);
  });
});
