import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-016.js";
import "./BT4-098.js";

describe("BT4-098 Atomic Inferno", () => {
  it("boosts a Hybrid and grants Security Attack +1", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT4-016", as: "target" }], hand: [{ card: "BT4-098", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.perm("target").currentDP === s.perm("target").baseDP + 3000 &&
        observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 2,
    );
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(2);
  });

  it("applies the DP clause to one selected Hybrid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT4-011", as: "first" },
            { card: "BT4-015", as: "second" },
          ],
          hand: [{ card: "BT4-098", as: "option" }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("first").currentDP !== s.perm("first").baseDP);
    expect(s.perm("first").currentDP).toBe(s.perm("first").baseDP + 3000);
    expect(s.perm("second").currentDP).toBe(s.perm("second").baseDP);
  });

  it("grants all own Digimon Security Attack +1 from security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT4-016", as: "first" },
          { card: "BT4-018", as: "second" },
        ],
        security: [{ card: "BT4-098", as: "securityOption", faceUp: true }],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).keywordAmount(s.perm("first"), "SecurityAttack")).toBe(2);
    expect(observe(s.engine).keywordAmount(s.perm("second"), "SecurityAttack")).toBe(1);
  });

  it("grants the security aura to an own Digimon played afterward", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT4-098", as: "securityOption", faceUp: true }] },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    s.putOnBoard(0, { card: "BT4-018", as: "entrant" });
    await settle(() => observe(s.engine).keywordAmount(s.perm("entrant"), "SecurityAttack") === 1);

    expect(observe(s.engine).keywordAmount(s.perm("entrant"), "SecurityAttack")).toBe(1);
  });
});
