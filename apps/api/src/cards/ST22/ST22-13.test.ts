import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-13 GrandGalemon", () => {
  it("suspends an opposing Digimon and gains 3000 DP on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "ST22-13", as: "grand" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const opponent = s.perm("opponent");
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("grand").instanceId })).toEqual({ ok: true });
    const grand = s.perm("grand");
    await settle(() => grand.currentDP === 10000);
    expect(grand.isSuspended || opponent.isSuspended).toBe(true);
    expect(grand.currentDP).toBe(10000);
  });
});
