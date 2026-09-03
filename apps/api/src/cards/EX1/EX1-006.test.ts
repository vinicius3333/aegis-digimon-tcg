import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-006.js";

describe("EX1-006 Garudamon", () => {
  it("gains 1 memory only when its Digimon attacks a player", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "attacker", under: ["EX1-006"] }] },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 6, 3000);
    expect(s.state.memory).toBe(6);
  });

  it("does not gain memory when its Digimon attacks another Digimon", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "attacker", under: ["EX1-006"] }] },
      1: { battleArea: [{ card: "BT1-009", as: "target", dp: 10000, suspended: true }] },
    });
    s.state.memory = 5;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("target").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.memory).toBe(5);
  });

  it("gains memory before the opponent receives the Blocker response (Q3195)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-025", as: "attacker", under: ["EX1-006"] }] },
      1: { battleArea: [{ card: "BT1-072", as: "blocker" }] },
    });
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "blockWindowOpened"));
    expect(s.state.memory).toBe(6);
    expect(
      s.engine.applyIntent(1, {
        type: "declareBlock",
        blockerPermanentId: s.perm("blocker").permanentId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
  });

  it("gains memory only once across two player attacks in one turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-025", as: "attacker", under: ["EX1-006"] }],
        hand: [{ card: "BT1-036", as: "unsuspender" }],
      },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    });
    s.state.memory = 9;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.memory === 11);
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    const memoryAfterUnsuspend = s.state.memory;
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.memory).toBe(memoryAfterUnsuspend);
  });

  it("works after a legal public evolution into EX1-006 and a higher-level host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-003", as: "base" }],
        hand: [
          { card: "EX1-006", as: "evo" },
          { card: "BT1-025", as: "host" },
        ],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-006");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-025");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.memory === 5);
    expect(s.state.memory).toBe(5);
  });
});
