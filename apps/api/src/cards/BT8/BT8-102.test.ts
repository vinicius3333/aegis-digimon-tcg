import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT8-102.js";

describe("BT8-102 Samadhi Shanti", () => {
  it("suspends your Digimon as the cost and locks the opposing target", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-016", as: "mine" }], hand: [{ card: "BT8-102", as: "option" }] },
        1: { battleArea: [{ card: "BT8-032", as: "target" }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mine").isSuspended && s.perm("target").isSuspended);

    expect(s.perm("mine").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });

  it("suspends an opposing Tamer from Security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT8-102", as: "option", faceUp: true }] },
        1: { battleArea: [{ card: "BT8-038", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));
    await settle(() => s.perm("tamer").isSuspended);

    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("does not lock a target that was already suspended before this effect", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT8-016", as: "mine" }], hand: [{ card: "BT8-102", as: "option" }] },
        1: { battleArea: [{ card: "BT8-032", as: "target", suspended: true }] },
      },
      { autoSelectCards: true, autoAcceptOptional: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("mine").isSuspended && s.perm("target").isSuspended);

    expect(s.perm("mine").isSuspended).toBe(true);
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(false);
  });
});
