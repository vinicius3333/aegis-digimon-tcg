import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT5-046.js";
import "./BT5-102.js";

describe("BT5-102 Wisselen", () => {
  it("restricts up to two opposing Digimon from attacking and blocking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-102", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT5-047", as: "first" },
            { card: "BT5-048", as: "second" },
            { card: "BT5-049", as: "third" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        observe(s.engine).isRestricted(s.perm("first"), "attack") &&
        observe(s.engine).isRestricted(s.perm("second"), "block"),
    );
    for (const alias of ["first", "second"]) {
      expect(observe(s.engine).isRestricted(s.perm(alias), "attack")).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm(alias), "block")).toBe(true);
    }
    expect(observe(s.engine).isRestricted(s.perm("third"), "attack")).toBe(false);
  });

  it("gains 2 memory when you control a Digi-Burst Digimon", async () => {
    const s = setupEngine(
      { 0: { battleArea: ["BT5-046"], hand: [{ card: "BT5-102", as: "option" }] } },
      { autoSelectCards: true },
    );
    s.state.memory = 8;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === 4);
    expect(s.state.memory).toBe(4);
  });

  it("security restricts only attacks for the turn and applies the memory clause", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT5-046"], security: [{ card: "BT5-102", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT5-047", as: "target" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(false);
    expect(s.state.memory).toBe(2);
  });
});
