import { describe, expect, it } from "vitest";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import "./EX11-054.js";

describe("EX11-054 Owen Dreadnought", () => {
  it("suspends to draw and boosts only a Progress Digimon when a Reptile is played", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT1-010", as: "reptile" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("progress").currentDP === 10000, 600);

    expect(s.perm("owen").isSuspended).toBe(true);
    expect(s.perm("progress").currentDP).toBe(10000);
  });

  it("leaves Owen unsuspended and draws nothing when the suspend cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT21-025", as: "progress" },
            { card: "EX11-054", as: "owen" },
          ],
          hand: [{ card: "BT1-010", as: "reptile" }],
          deck: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const handBefore = s.state.players[0]!.hand.length;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("reptile").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => false, 60);

    expect(s.decisions.some((d) => d.req.kind === "optional")).toBe(true);
    expect(s.perm("owen").isSuspended).toBe(false);
    // The Reptile left the hand, and no <Draw 1> replaced it.
    expect(s.state.players[0]!.hand.length).toBe(handBefore - 1);
  });
});
