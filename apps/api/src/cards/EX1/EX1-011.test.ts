import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
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
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          deck: ["BT1-031", "BT1-032", "BT1-033"],
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
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("does not reveal or add again on a second player attack in the same turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "attacker", under: ["EX1-011"] }],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: ["ST2-12", "BT1-031", "BT1-032", "BT1-033", "BT1-034", "BT1-035"],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    const deckAfterFirst = s.state.players[0]!.deck.length;
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("attacker").isSuspended);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(deckAfterFirst);
  });

  it("works on a legal Gabumon stack with a higher-level host", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-032", as: "host", under: ["EX1-011"] }],
          deck: ["ST2-12", "BT1-031", "BT1-033"],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
  });
});
