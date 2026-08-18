import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-100.js";
import "./BT3-101.js";
import "../BT4/BT4-060.js";
import "../BT5/BT5-099.js";

describe("historical multicolor control options", () => {
  it("chains Lotosmon suspension, source control, Bifrost, and scaled Spiral Masquerade", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: ["BT4-060", "BT3-020", "BT3-032"],
          hand: [
            { card: "BT1-009", as: "rookie" },
            { card: "BT3-100", as: "deathParade" },
            { card: "BT3-101", as: "bifrost" },
            { card: "BT5-099", as: "spiral" },
          ],
        },
        1: {
          battleArea: [
            {
              card: "BT5-046",
              as: "boss",
              dp: 18000,
              under: ["BT3-021", "BT3-022"],
            },
          ],
        },
      },
      { autoSelectCards: true },
    );

    s.state.turnSeat = 0;
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("rookie").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT1-009" && p.isSuspended));

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("deathParade").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("boss").stack.length === 0 && s.perm("boss").isSuspended);

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("bifrost").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("boss"), "SecurityAttack") === -1);
    await settle();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("spiral").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("boss").currentDP === 3000);

    // Bifrost contributes -3000 first; Spiral Masquerade then contributes
    // -3000 for each of the four Digimon in play.
    expect(s.perm("boss").currentDP).toBe(3000);
    expect(observe(s.engine).keywordAmount(s.perm("boss"), "SecurityAttack")).toBe(-1);
  });
});
