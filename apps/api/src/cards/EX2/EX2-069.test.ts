import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-069.js";

describe("EX2-069 Fist of the Beast King", () => {
  it("unsuspends Leomon or Beelzemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-044", as: "beelzemon", suspended: true }],
          hand: [{ card: "EX2-069", as: "option" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("beelzemon").isSuspended);
    expect(s.perm("beelzemon").isSuspended).toBe(false);
  });

  it("unsuspends exactly one selected Leomon-or-Beelzemon and leaves an unrelated Digimon suspended", async () => {
    const preferredInstanceIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-017", as: "leomon", suspended: true },
            { card: "EX2-044", as: "beelzemon", suspended: true },
            { card: "EX2-014", as: "unrelated", suspended: true },
          ],
          hand: [{ card: "EX2-069", as: "option" }],
        },
      },
      { autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferredInstanceIds },
    );
    preferredInstanceIds.push(s.perm("leomon").permanentId);
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("leomon").isSuspended);
    expect(s.perm("leomon").isSuspended).toBe(false);
    expect(s.perm("beelzemon").isSuspended).toBe(true);
    expect(s.perm("unrelated").isSuspended).toBe(true);
  });

  it("activates its Main effect from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX2-069", as: "securityOption", faceUp: true }],
        battleArea: [{ card: "EX2-017", as: "leomon", suspended: true }],
      },
    });
    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));
    expect(s.perm("leomon").isSuspended).toBe(false);
  });

  it("does not waive the blue color requirement without Beelzemon in play", async () => {
    const s = setupEngine({ 0: { battleArea: ["EX2-019"], hand: [{ card: "EX2-069", as: "option" }] } });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
  });
});
