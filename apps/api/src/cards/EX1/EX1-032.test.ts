import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../BT1/BT1-036.js";
import "./EX1-032.js";

describe("EX1-032 Magnadramon", () => {
  it("may trash the top security card to unsuspend when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base", suspended: true }],
          hand: [{ card: "EX1-032", as: "evo" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(true);
  });

  it("can trash the top security card when digivolving while already unsuspended", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base" }],
          hand: [{ card: "EX1-032", as: "evo" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId));
    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(false);
  });

  it("may decline the security trash and leave an already suspended stack unchanged", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX1-029", as: "base", suspended: true }],
          hand: [{ card: "EX1-032", as: "evo" }],
          security: [{ card: "BT1-009", as: "security" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evo").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "EX1-032");
    expect(s.perm("base").isSuspended).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("security").instanceId)).toBe(false);
  });

  it("recovers 1 on attack with 3 or fewer security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-032", as: "magnadramon" }],
        security: ["BT1-001", "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "recovered" }],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 4);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovered").instanceId)).toBe(true);
  });

  it("does not recover on attack with more than three security", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX1-032", as: "magnadramon" }],
        security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"],
        deck: [{ card: "BT1-009", as: "notRecovered" }],
      },
      1: { security: ["BT1-001", "BT1-001"] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("magnadramon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("magnadramon").isSuspended);
    expect(s.state.players[0]!.security).toHaveLength(4);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("notRecovered").instanceId)).toBe(
      false,
    );
  });

  it("recovers only once across two public attacks in one turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX1-032", as: "magnadramon" },
            { card: "BT1-030", as: "blueColor" },
          ],
          security: ["BT1-001", "BT1-001"],
          hand: [{ card: "BT1-036", as: "unsuspender" }],
          deck: [
            { card: "BT1-009", as: "firstRecovery" },
            { card: "BT1-010", as: "secondRecovery" },
          ],
        },
        1: { security: ["BT1-001", "BT1-001", "BT1-001", "BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const attack = () =>
      s.engine.applyIntent(0, {
        type: "attack" as const,
        attackerPermanentId: s.perm("magnadramon").permanentId,
        target: { kind: "player" as const },
      });
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 3 && s.perm("magnadramon").isSuspended);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("firstRecovery").instanceId)).toBe(
      true,
    );
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("unsuspender").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => !s.perm("magnadramon").isSuspended);
    expect(attack()).toEqual({ ok: true });
    await settle(() => s.perm("magnadramon").isSuspended && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(3);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("secondRecovery").instanceId)).toBe(
      false,
    );
  });
});
