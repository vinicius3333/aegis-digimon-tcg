import { describe, expect, it } from "vitest";
import { drainMicrotasks, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-017.js";

describe("EX1-017 WereGarurumon", () => {
  it("draws 1 when digivolving", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-014", as: "base" }],
        hand: [{ card: "EX1-017", as: "evo" }],
        deck: ["BT1-029", "BT1-030"],
      },
    });
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("gains 1 memory on attack with 8 or more cards in hand", async () => {
    const hand = Array.from({ length: 8 }, () => "BT1-029");
    const s = setupEngine({
      0: { battleArea: [{ card: "EX1-021", as: "host", under: ["EX1-017"] }], hand },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 6);
    expect(s.state.memory).toBe(6);
  });

  it("does not gain memory with fewer than 8 cards in hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-021", as: "host", under: ["EX1-017"] }],
        hand: Array.from({ length: 7 }, () => "BT1-029"),
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    // With fewer than 8 cards in hand the condition fails before the effect ever triggers, so
    // there is no `effectResolved` to wait on.
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(s.events.some((event) => event.kind === "effectTriggered" && event.sourceCardId === "EX1-017")).toBe(false);
    expect(s.state.memory).toBe(5);
  });

  it("gains memory only once across two player attacks", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-021", as: "host", under: ["EX1-017"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }, ...Array.from({ length: 8 }, () => "BT1-029")],
      },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.memory = 9;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.memory === 10);
    await settle(() => s.events.some((event) => event.kind === "securityChecked"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("host").isSuspended);
    const memoryAfterUnsuspend = s.state.memory;
    expect(attack()).toEqual({ ok: true });
    // Once-per-turn: the second attack does not re-trigger EX1-017 at all, so there is no
    // second `effectResolved` to wait on — the proof is that memory never changes again.
    await drainMicrotasks();
    expect(
      s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-017"),
    ).toHaveLength(1);
    expect(s.state.memory).toBe(memoryAfterUnsuspend);
  });
});
