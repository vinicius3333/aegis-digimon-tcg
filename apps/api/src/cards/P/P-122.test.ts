import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-122.js";

describe("P-122 Patamon", () => {
  it("adds a yellow/black security card, recovers one, and keeps the stack size", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-122", as: "patamon" }],
          security: [
            { card: "BT11-036", as: "match" },
            { card: "BT1-001", as: "other" },
          ],
          deck: [{ card: "BT1-002", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId) &&
        s.state.players[0]!.security.length === 2,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not recover when no eligible security card exists", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-122", as: "patamon" }], security: ["BT1-001"], deck: [{ card: "BT1-002", as: "top" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it.each([
    ["Yellow/Red", "BT12-034"],
    ["Black/Blue", "BT19-020"],
  ])("takes a multicolor card containing %s", async (_label, cardId) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-122", as: "patamon" }],
          security: [
            { card: cardId, as: "candidate" },
            { card: "BT1-001", as: "other" },
          ],
          deck: [{ card: "BT1-002", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
  });

  it.each([
    ["mono-color Yellow", "BT4-050"],
    ["mono-color Black", "BT1-009"],
    ["other multicolor", "AD1-005"],
  ])("does not take a %s security card", async (_label, cardId) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-122", as: "patamon" }],
          security: [
            { card: cardId, as: "candidate" },
            { card: "BT1-001", as: "other" },
          ],
          deck: [{ card: "BT1-002", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 2 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("candidate").instanceId)).toBe(false);
  });

  it("inherited effect lowers only opposing Security Digimon and changes a real security battle", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-122", as: "base" }],
        hand: [{ card: "BT1-051", as: "evolution" }],
        security: [{ card: "BT1-051", as: "ownSecurity" }],
      },
      1: {
        battleArea: [{ card: "BT1-009", as: "battleAreaDigimon" }],
        security: [{ card: "BT1-051", as: "securityDigimon" }],
      },
    });
    s.state.memory = 10;
    s.state.turnSeat = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === "BT1-051");

    expect(observe(s.engine).securityDp(1)).toBe(-2000);
    expect(s.perm("battleAreaDigimon").currentDP).toBe(3000);
    expect(observe(s.engine).securityDp(0)).toBe(0);
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).securityDp(1)).toBe(0);
    s.state.turnSeat = 0;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.security).toHaveLength(0);
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === s.perm("base").permanentId)).toBe(true);
  });
});
