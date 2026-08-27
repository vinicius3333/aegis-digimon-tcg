import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-053.js";

describe("BT4-053 Roachmon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-053", as: "roachmon" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("roachmon").currentDP).toBe(s.perm("roachmon").baseDP);
  });

  it("digivolves legally from a green level 3 without adding an effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT4-051", as: "base", under: ["BT4-004"] }],
        hand: [{ card: "BT4-053", as: "evolving" }],
        deck: ["BT4-052"],
      },
    });
    s.state.memory = 1;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "BT4-053");

    expect(s.perm("base").stack).toHaveLength(2);
    expect(s.perm("base").currentDP).toBe(s.perm("base").baseDP);
    expect(s.events.some(({ kind }) => kind === "effectActivated")).toBe(false);
  });
});
