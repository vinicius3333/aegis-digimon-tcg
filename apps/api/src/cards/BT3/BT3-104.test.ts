import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-104.js";

describe("BT3-104 Positron Laser", () => {
  it("prevents attacks and blocks, then returns a suspended stack with blue present", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-020", "BT3-044"], hand: [{ card: "BT3-104", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT3-045", as: "returned", suspended: true, under: [{ card: "BT3-044", as: "source" }] },
            { card: "BT3-046", as: "restricted" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.some((card) => card.cardId === "BT3-045"));
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("source").instanceId)).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "block")).toBe(true);
  });

  it("applies the Security attack restriction and return clause", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT3-020"], security: [{ card: "BT3-104", as: "securityOption", faceUp: true }] },
        1: {
          battleArea: [
            { card: "BT3-045", as: "returned", suspended: true },
            { card: "BT3-046", as: "restricted" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.state.players[1]!.hand.some((card) => card.cardId === "BT3-045")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("restricted"), "attack")).toBe(true);
  });
});
