import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-060.js";

describe("BT4-060 Lotosmon", () => {
  it("suspends a level 4 or lower Digimon played by either player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-060" }] },
      1: { hand: [{ card: "BT1-009", as: "rookie" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 4;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("rookie").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009" && p.isSuspended));

    expect(s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT1-009")?.isSuspended).toBe(true);
  });

  it("does not suspend a level 5 Digimon when it is played", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-060" }] },
      1: { hand: [{ card: "BT1-023", as: "ultimate" }] },
    });
    s.state.turnSeat = 1;
    s.state.memory = 6;
    await s.engine.recomputeContinuousEffects();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("ultimate").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some((p) => p.topCard?.cardId === "BT1-023"), 5000);

    expect(s.state.players[1]!.battleArea.find((p) => p.topCard?.cardId === "BT1-023")?.isSuspended).toBe(false);
  });
});
