import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-022.js";

describe("EX2-022 Antylamon", () => {
  it("digivolves from exact Lopmon for 3 only while Shu-Chong Wong is in play", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "EX2-020", as: "lopmon" },
          { card: "EX2-059", as: "shu" },
        ],
        hand: [{ card: "EX2-022", as: "antylamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lopmon").topCard.cardId === "EX2-022");
    expect(s.state.memory).toBe(0);
  });

  it("rejects the Lopmon shortcut without Shu-Chong Wong", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-020", as: "lopmon" }], hand: [{ card: "EX2-022", as: "antylamon" }] },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmon").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("rejects Lopmon (X Antibody) even with Shu-Chong Wong", () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT16-067", as: "lopmonX" },
          { card: "EX2-059", as: "shu" },
        ],
        hand: [{ card: "EX2-022", as: "antylamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("lopmonX").permanentId,
        instanceId: s.inst("antylamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("may trash its top security to unsuspend once when attacking", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-022", as: "antylamon" }], security: ["BT1-001", "BT1-002"] },
        1: { security: ["BT1-003", "BT1-004"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("antylamon").isSuspended);
    expect(s.perm("antylamon").isSuspended).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(1);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").isSuspended);
    expect(s.perm("antylamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("may decline trashing security and remains suspended", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX2-022", as: "antylamon" }], security: ["BT1-001", "BT1-002"] },
        1: { security: ["BT1-003"] },
      },
      { autoDeclineOptional: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("antylamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("antylamon").isSuspended);
    expect(s.perm("antylamon").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
  });
});
