import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-054.js";

describe("BT3-054 Blossomon", () => {
  it("may suspend an own Digimon to reduce its digivolution cost by 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-044", as: "base" },
            { card: "BT1-010", as: "cost" },
          ],
          hand: [{ card: "BT3-054", as: "blossomon" }],
        },
        1: { battleArea: [{ card: "BT1-019", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("blossomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("cost").isSuspended || s.perm("base").isSuspended, 5000);

    expect(s.state.memory).toBe(3);
    expect(s.perm("cost").isSuspended || s.perm("base").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(false);
  });
});
