import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-068.js";
import "./BT10-042.js";
import "./BT10-110.js";
import "./BT10-112.js";

describe("BT10-110 Seiken Meppa", () => {
  it("returns itself after Security", async () => {
    const s = setupEngine(
      { 0: { security: [{ card: "BT10-110", as: "option", faceUp: true }] } },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
  });

  it("unsuspends Jesmon GX and activates one of that Digimon's When Digivolving effects", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-112", as: "jesmon", suspended: true }, "BT9-109"],
          hand: [
            { card: "BT10-110", as: "option" },
            { card: "BT10-068", as: "royalKnight" },
            { card: "BT6-082", as: "sister" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 8;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("jesmon").stack.some((card) => card.instanceId === s.inst("royalKnight").instanceId));
    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(s.perm("jesmon").stack.some((card) => card.instanceId === s.inst("royalKnight").instanceId)).toBe(true);
  });

  it("does not waive its white color requirement without a Royal Knight", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "non-royal-knight" }, "BT9-109"],
        hand: [{ card: "BT10-110", as: "option" }],
      },
    });
    s.state.memory = 8;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("still unsuspends Jesmon GX but cannot activate its effect while Venusmon suppresses it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-112", as: "jesmon", suspended: true, under: ["BT6-111"] }],
          hand: [
            { card: "BT10-110", as: "option" },
            { card: "BT10-068", as: "royalKnight" },
            { card: "BT6-082", as: "sister" },
          ],
        },
        1: { battleArea: ["BT10-042"], security: ["BT1-001", "BT1-002", "BT1-003"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(observe(s.engine).keywordAmount(s.perm("jesmon"), "SecurityAttack")).toBeGreaterThan(0);
    // Venusmon only forbids attacks aimed at itself; it does not broadly disable
    // Jesmon's attacks against the player or another Digimon.
    expect(observe(s.engine).isRestricted(s.perm("jesmon"), "attack")).toBe(false);
    expect(observe(s.engine).timingEffectDisabled(s.perm("jesmon"), "whenDigivolving")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.perm("jesmon").isSuspended).toBe(false);
    expect(observe(s.engine).timingEffectDisabled(s.perm("jesmon"), "whenDigivolving")).toBe(true);
    expect(s.perm("jesmon").stack.some((card) => card.instanceId === s.inst("royalKnight").instanceId)).toBe(false);
    expect(
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.instanceId === s.inst("sister").instanceId),
    ).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("jesmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("jesmon").isSuspended).toBe(true);
  });
});
