import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-010.js";

describe("EX1-010 Phoenixmon", () => {
  it("has Security Attack +1 and draws 2 when attacking a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-010", as: "phoenixmon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("phoenixmon"), "SecurityAttack")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenixmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });

  it("draws before the opponent receives the Blocker response window (Q3200)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-010", as: "phoenixmon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenixmon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("blocker").permanentId }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
  });

  it("does not draw when the attack targets a Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-010", as: "phoenixmon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { battleArea: [{ card: "BT1-009", as: "target", suspended: true }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("phoenixmon").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("phoenixmon").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
