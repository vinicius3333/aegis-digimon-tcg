import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
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
          deck: ["BT11-046", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("BT11-046");

    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
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
    const s = setupEngine({
      0: { breeding: { card: "BT1-001", as: "egg" }, hand: [{ card: "EX1-001", as: "rookie" }, { card: "EX1-003", as: "host" }], deck: ["ST1-12", "BT1-011", "BT1-012"] },
      1: { security: ["BT1-001", "BT1-001"] },
    }, { autoSelectCards: true });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("rookie").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-001");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("egg").permanentId));
    s.state.phase = Phase.Main;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("host").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-003");
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("egg").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand[0]!.cardId).toBe("ST1-12");
  });
});
