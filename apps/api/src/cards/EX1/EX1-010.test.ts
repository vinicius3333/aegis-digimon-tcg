import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./EX1-010.js";

describe("EX1-010 Phoenixmon", () => {
  it("has Security Attack +1 and draws 2 when attacking a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-010", as: "phoenixmon" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
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

  it("digivolves from a red level-5 source, keeps the source stack, and preserves both effects", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "source" }],
        hand: [{ card: "EX1-010", as: "evo" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { security: ["BT1-009", "BT1-010", "BT1-011"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("source").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("source").topCard.cardId === "EX1-010");
    expect(s.perm("source").stack.map((card) => card.cardId)).toEqual(["BT1-021"]);
    expect(s.state.memory).toBe(7);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(observe(s.engine).hasKeyword(s.perm("source"), "SecurityAttack")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("source").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 3);
    expect(s.state.players[0]!.hand).toHaveLength(3);
    await settle(() => s.state.players[1]!.security.length === 1);
    expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(2);
  });

  it("rejects evolution from a red level-4 source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-014", as: "invalidSource" }],
        hand: [{ card: "EX1-010", as: "evo" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("invalidSource").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("invalidSource").topCard.cardId).toBe("BT1-014");
    expect(s.state.memory).toBe(10);
  });
});
