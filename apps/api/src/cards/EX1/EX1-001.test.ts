import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-001.js";

describe("EX1-001 Agumon", () => {
  it("reveals 3 on attack and adds exactly 1 Tamer or Agumon to hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-001"] }],
          deck: [
            { card: "ST1-12", as: "validTamer" },
            { card: "BT1-009", as: "validAgumon" },
            { card: "BT1-010", as: "invalid" },
            { card: "BT1-011", as: "untouched" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.hand.length === 1);

    expect(["ST1-12", "BT1-009"]).toContain(p0.hand[0]!.cardId);
    expect(p0.deck).toHaveLength(3);
    expect(p0.deck.some((card) => card.cardId === "BT1-011")).toBe(true);
  });

  it("accepts a non-red Agumon-name card and fires only once per turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-003", as: "attacker", under: ["EX1-001"] }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: ["BT11-046", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT11-046")).toBe(true);

    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });

  it("works after a legal public egg-to-Agumon evolution and higher-level host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-001", as: "base" }],
          hand: [
            { card: "EX1-001", as: "rookie" },
            { card: "EX1-003", as: "host" },
          ],
          deck: ["ST1-12", "BT1-011", "BT1-012"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rookie").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-001");
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("host").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-003");
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("ST1-12");
  });
});
