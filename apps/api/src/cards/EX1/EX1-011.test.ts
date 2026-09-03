import { describe, expect, it } from "vitest";
import { Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-011.js";

describe("EX1-011 Gabumon", () => {
  it("reveals 3 on attack and adds exactly 1 Tamer or Gabumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          deck: ["ST2-12", "EX1-011", "BT1-030", "BT1-031"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
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
    expect(["ST2-12", "EX1-011"]).toContain(s.state.players[0]!.hand[0]!.cardId);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("reveals without adding when none of the three cards matches", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }], deck: ["BT1-031", "BT1-032", "BT1-033"] },
      1: { security: ["BT1-001", "BT1-001"] },
    }, { autoSelectCards: true });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not reveal or add again on a second player attack in the same turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }], deck: ["ST2-12", "BT1-031", "BT1-032", "BT1-033", "BT1-034", "BT1-035"] },
      1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
    }, { autoSelectCards: true });
    await s.ready();
    const attack = () => s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "player" } });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.unsuspend([s.perm("attacker").permanentId]);
    const deckAfterFirst = s.state.players[0]!.deck.length;
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
  });

  it("works after a legal public egg-to-Gabumon evolution and higher-level host", async () => {
    const s = setupEngine({
      0: { breeding: { card: "BT1-003", as: "egg" }, hand: [{ card: "EX1-011", as: "rookie" }, { card: "BT1-032", as: "host" }], deck: ["ST2-12", "BT1-031", "BT1-033"] },
      1: { security: ["BT1-001", "BT1-001"] },
    }, { autoSelectCards: true });
    s.state.memory = 4;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("rookie").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "EX1-011");
    s.state.phase = Phase.Breeding;
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.perm("egg").permanentId })).toEqual({ ok: true });
    await settle(() => !s.perm("egg").inBreeding);
    s.state.phase = Phase.Main;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("egg").permanentId, instanceId: s.inst("host").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === "BT1-032");
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("egg").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
  });
});
