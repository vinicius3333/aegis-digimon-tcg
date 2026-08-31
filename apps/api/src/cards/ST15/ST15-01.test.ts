import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST15-01 Koromon", () => {
  it("gains +1000 DP once when any attack target switches", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "ST15-12", as: "host", dp: 11000, under: ["BT1-009", "ST15-01"] },
          { card: "BT1-009", as: "firstAttacker" },
          { card: "BT1-009", as: "secondAttacker" },
        ],
      },
      1: {
        battleArea: [
          { card: "ST15-12", dp: 1000, as: "firstBlocker" },
          { card: "ST15-12", dp: 1000, as: "secondBlocker" },
        ],
        security: ["BT1-001", "BT1-001"],
      },
    });
    const baseDP = s.perm("host").baseDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("firstAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("firstBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("host").currentDP).toBe(baseDP + 1000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "blockWindowOpened").length === 2);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("secondBlocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.filter((event) => event.kind === "combatResolved").length === 2);
    expect(s.perm("host").currentDP).toBe(baseDP + 1000);
  });

  it("does not grant DP to a host without Koromon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST15-12", as: "host", dp: 11000, under: ["BT1-009"] }] },
      1: { battleArea: [{ card: "ST15-12", dp: 1000, as: "blocker" }] },
    });
    const baseDP = s.perm("host").baseDP;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.perm("host").currentDP).toBe(baseDP);
  });
});
