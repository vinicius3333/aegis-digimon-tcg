import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-027.js";

describe("EX1-027 Leomon", () => {
  it("recovers 1 after a real security battle with 3 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon" }, "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "recovered" }, "BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 6000 }],
        deck: ["BT1-001"],
        hand: ["BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "securityChecked") && s.state.pendingDecision === undefined,
    );
    expect(s.events.some((event) => event.kind === "securityRecovered" && event.seat === 0 && event.amount === 1)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not recover when its owner has more than 3 security cards", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon" }, "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "deckTop" }, "BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 6000 }],
        deck: ["BT1-001"],
        hand: ["BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "securityChecked") && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.events.some((event) => event.kind === "securityRecovered")).toBe(false);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("counts the checked card as removed for the 3-or-fewer condition (Q3211)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon" }, "BT1-001", "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "recovered" }, "BT1-001"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 6000 }],
        deck: ["BT1-001"],
        hand: ["BT1-009"],
      },
    });
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.events.some((event) => event.kind === "securityChecked") && s.state.pendingDecision === undefined,
    );
    expect(s.events.some((event) => event.kind === "securityRecovered" && event.seat === 0 && event.amount === 1)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
