import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("RB1-011 Jellymon", () => {
  it("adds Kiyoshiro when it is the matching Jellymon-text reveal", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-011", as: "jellymon" }], deck: ["RB1-033", "BT1-009", "BT1-014"] } },
      { autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jellymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 2);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "RB1-033")).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("returns all unmatched reveals to the bottom without adding cards", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "RB1-011", as: "jellymon" }], deck: ["BT1-009", "BT1-014", "BT1-015"] } },
      { autoSelectCards: true },
    );

    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("jellymon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
  });

  it("gains memory once when a Jellymon is trashed from hand by a real effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "RB1-013", as: "base", under: [{ card: "RB1-011" }] }],
          hand: [
            { card: "RB1-014", as: "thetismon" },
            { card: "RB1-011", as: "jellyA" },
            { card: "RB1-011", as: "jellyB" },
          ],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "RB1-024", as: "target", under: ["BT1-010", "RB1-011"] }],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    const jellyIds = [s.inst("jellyA").instanceId, s.inst("jellyB").instanceId];
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("thetismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => jellyIds.every((id) => s.state.players[0]!.trash.some((card) => card.instanceId === id)));

    expect(s.state.players[0]!.trash.filter((card) => jellyIds.includes(card.instanceId))).toHaveLength(2);
    expect(s.state.memory).toBe(9);
  });

  it("combines two inherited hand-trash watchers once per turn on real Amphimon attacks", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "RB1-016", as: "amphimon", suspended: false, under: [{ card: "RB1-011" }, { card: "RB1-013" }] },
          ],
          hand: ["RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011", "RB1-011"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
          security: ["BT1-009", "BT1-009", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "RB1-024", as: "first", suspended: true, under: ["RB1-017", "RB1-020"] },
            { card: "RB1-025", as: "second", suspended: true, under: ["RB1-017", "RB1-020"] },
            { card: "RB1-024", as: "third", suspended: true, under: ["RB1-017", "RB1-020"] },
          ],
          security: ["BT1-009", "BT1-009", "BT1-009"],
          deck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();
    const paidIds = s.state.players[0]!.hand.map((card) => card.instanceId);
    const before = s.state.memory;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("amphimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      paidIds.slice(0, 2).every((id) => s.state.players[0]!.trash.some((card) => card.instanceId === id)),
    );
    await settle();
    expect(s.state.memory).toBe(before + 2);

    await advance(s.engine).verb.unsuspend([s.perm("amphimon").permanentId]);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("amphimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      paidIds.slice(2, 4).every((id) => s.state.players[0]!.trash.some((card) => card.instanceId === id)),
    );
    await settle();
    expect(s.state.memory).toBe(before + 2);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    await settle();
    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownerTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    const beforeNextTurnAttack = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("amphimon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      paidIds.slice(4).every((id) => s.state.players[0]!.trash.some((card) => card.instanceId === id)),
    );
    await settle();
    expect(s.state.memory).toBe(beforeNextTurnAttack + 2);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownerTurn;
  });
});
