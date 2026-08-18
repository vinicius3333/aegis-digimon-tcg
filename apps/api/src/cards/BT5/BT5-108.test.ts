import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-108.js";

describe("BT5-108 Earth Shaker", () => {
  it("deletes one unsuspended level 4 and one unsuspended level 5", async () => {
    const s = setupEngine({ 0: { battleArea: ["BT5-071"], hand: [{ card: "BT5-108", as: "option" }] }, 1: { battleArea: [{ card: "BT5-023", as: "level4" }, { card: "BT5-013", as: "level5" }, { card: "BT5-024", as: "suspended", suspended: true }] } }, { autoSelectCards: true });
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    expect(s.state.players[1]!.battleArea[0]!.permanentId).toBe(s.perm("suspended").permanentId);
  });

  it("activates its full Main effect from security", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT5-108", as: "securityOption", faceUp: true }] }, 1: { battleArea: [{ card: "BT5-023", as: "level4" }, { card: "BT5-013", as: "level5" }] } }, { autoSelectCards: true });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
