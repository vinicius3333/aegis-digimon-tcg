import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-084.js";

describe("BT6-084 Sistermon Ciel", () => {
  it("gives Huckmon and Royal Knights +2000 DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT6-084", as: "ciel" },
          { card: "BT6-009", as: "huckmon" },
          { card: "BT6-016", as: "royalKnight" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("huckmon").currentDP).toBe(s.perm("huckmon").baseDP + 2000);
    expect(s.perm("royalKnight").currentDP).toBe(s.perm("royalKnight").baseDP + 2000);
  });

  it("gains one memory on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT6-084", as: "source" }] } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 1);
    expect(s.state.memory).toBe(1);
  });
});
