import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-027.js";

describe("EX1-027 Leomon", () => {
  it("recovers 1 after a real security battle with 3 or fewer security cards", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon" }, "BT1-009", "BT1-010"],
        deck: [{ card: "BT1-009", as: "recovered" }, "BT1-011"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 6000 }],
        deck: ["BT1-012"],
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
      () => s.events.some((event) => event.kind === "securityRecovered") && s.state.pendingDecision === undefined,
    );
    expect(s.events.some((event) => event.kind === "securityRecovered" && event.seat === 0 && event.amount === 1)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("leomon").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("does not recover when its owner has more than 3 security cards", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon" }, "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        deck: [{ card: "BT1-009", as: "deckTop" }, "BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 6000 }],
        deck: ["BT1-011"],
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
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("leomon").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("counts the checked card as removed for the 3-or-fewer condition (Q3211)", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon" }, "BT1-009", "BT1-010", "BT1-011"],
        deck: [{ card: "BT1-009", as: "recovered" }, "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 6000 }],
        deck: ["BT1-013"],
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
      () => s.events.some((event) => event.kind === "securityRecovered") && s.state.pendingDecision === undefined,
    );
    expect(s.events.some((event) => event.kind === "securityRecovered" && event.seat === 0 && event.amount === 1)).toBe(
      true,
    );
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.events.some((event) => event.kind === "securityChecked")).toBe(true);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("leomon").instanceId)).toBe(true);
    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("attacker").permanentId),
    ).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("recovers for its owner even when the attacker loses the security battle", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "EX1-027", as: "leomon" }, "BT1-009", "BT1-010"],
        deck: [{ card: "BT1-011", as: "recovered" }, "BT1-012"],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "attacker", dp: 4000 }],
        deck: ["BT1-013"],
        hand: ["BT1-014"],
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
      () => s.events.some((event) => event.kind === "securityRecovered") && s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.events.some((event) => event.kind === "securityRecovered" && event.seat === 0 && event.amount === 1)).toBe(
      true,
    );
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("attacker").instanceId)).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("digivolves legally from a Yellow level 3 and rejects a non-Yellow source", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-046", as: "yellowSource" }],
        hand: [{ card: "EX1-027", as: "leomon" }],
      },
    });
    legal.state.memory = 5;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("yellowSource").permanentId,
        instanceId: legal.inst("leomon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("yellowSource").topCard.cardId === "EX1-027");
    expect(legal.perm("yellowSource").stack.map(({ cardId }) => cardId)).toEqual(["BT1-046"]);
    expect(legal.state.memory).toBe(3);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "redSource" }],
        hand: [{ card: "EX1-027", as: "leomon" }],
      },
    });
    illegal.state.memory = 5;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("redSource").permanentId,
        instanceId: illegal.inst("leomon").instanceId,
      }),
    ).toMatchObject({ ok: false, reason: "invalid-evolution" });
    expect(illegal.perm("redSource").topCard.cardId).toBe("BT1-009");
    expect(illegal.perm("redSource").stack).toHaveLength(0);
    expect(illegal.state.memory).toBe(5);
  });
});
