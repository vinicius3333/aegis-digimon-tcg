import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-015.js";

describe("EX1-015 Garurumon", () => {
  it("plays a Matt Ishida costing 3 or less for free on attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "ST2-12", as: "matt" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const mattId = s.inst("matt").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard.instanceId === mattId));
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("does not play a different combined-name Tamer", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "AD1-019", as: "combined" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const combinedId = s.inst("combined").instanceId;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === combinedId)).toBe(true);
  });

  it("honors refusal when an eligible Matt Ishida is in hand", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "ST2-12", as: "matt" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-015"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("matt").instanceId)).toBe(true);
  });

  it("rejects a Matt Ishida whose play cost is greater than 3", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [{ card: "BT1-086", as: "matt" }],
        },
        1: { security: ["BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-015"));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("matt").instanceId)).toBe(true);
  });

  it("plays only one Matt Ishida across two player attacks in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-017", as: "attacker", under: ["EX1-015"] }],
          hand: [
            { card: "ST2-12", as: "matt1" },
            { card: "ST2-12", as: "matt2" },
            { card: "BT1-036", as: "unsuspender" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
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
    await settle(() => s.state.players[0]!.battleArea.length === 2);
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("unsuspender").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("attacker").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(
      () => s.events.filter((event) => event.kind === "effectResolved" && event.sourceCardId === "EX1-015").length >= 2,
    );
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("matt2").instanceId)).toBe(true);
  });
});
