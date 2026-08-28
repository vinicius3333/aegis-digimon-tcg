import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-002.js";
import "./BT1-022.js";
import "./BT1-091.js";

describe("BT1-002 Bebydomon", () => {
  it("gives +2000 DP while its Digimon has Piercing during its turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-022", as: "host", dp: 5000, under: ["BT1-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("does not give +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-022", as: "host", dp: 5000, under: ["BT1-002"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("gives +2000 DP when Piercing is granted by an Option card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-010", as: "host", dp: 2000, under: ["BT1-002"] }],
          hand: [{ card: "BT1-091", as: "scrapClaw" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("scrapClaw").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("host").currentDP === 4000);

    expect(s.perm("host").currentDP).toBe(4000);
  });
});
