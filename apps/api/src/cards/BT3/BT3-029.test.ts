import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT3-029.js";

describe("BT3-029 Goldramon", () => {
  it("unsuspends once when another own Digimon is played", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-029", as: "goldramon", suspended: true }], hand: [{ card: "BT1-011", as: "played" }] } });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("goldramon").isSuspended, 5000);

    expect(s.perm("goldramon").isSuspended).toBe(false);
  });
});
