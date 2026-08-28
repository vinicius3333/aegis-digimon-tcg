import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("ST15-15 Breakthrough of Courage", () => {
  it("rejects use without a black source or a Tai Kamiya Tamer", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "ST15-15", as: "option" }],
        battleArea: [{ card: "BT1-009", as: "redDigimon" }],
      },
    });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: false,
      reason: "color-requirement-unmet",
    });
    expect(s.state.memory).toBe(4);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("a red Tai waives color, unsuspends one Digimon, and protects only a Greymon from Digimon effects", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST15-15", as: "option" }],
          battleArea: [
            { card: "BT1-085", as: "tai" },
            { card: "ST15-08", as: "greymon", suspended: true },
            { card: "BT1-009", as: "nonGreymon", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        !s.perm("greymon").isSuspended && observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Digimon"),
    );

    expect(s.state.memory).toBe(0);
    expect(s.perm("greymon").isSuspended).toBe(false);
    expect(s.perm("nonGreymon").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Option")).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("nonGreymon"), "beAffected", "Digimon")).toBe(false);
  });

  it("Security activates the full Main effect without paying cost or meeting color requirements", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "ST15-15", as: "securityOption", faceUp: true }],
          battleArea: [{ card: "ST15-08", as: "greymon", suspended: true }],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 1;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.state.memory).toBe(1);
    expect(s.perm("greymon").isSuspended).toBe(false);
    expect(observe(s.engine).hasRestriction(s.perm("greymon"), "beAffected", "Digimon")).toBe(true);
  });
});
