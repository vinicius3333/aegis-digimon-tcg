import { describe, expect, it } from "vitest";
import { getCardDefinition, getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../../cards/index.js";

describe("AD1-002 Aldamon", () => {
  it("deletes an opposing Digimon within its DP ceiling when digivolving", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "AD1-002", as: "aldamon" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "target", dp: 8000 },
            { card: "BT1-010", as: "tooLarge", dp: 9000 },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aldamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 1);

    expect(
      s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("tooLarge").permanentId),
    ).toBe(true);
  });

  it("digivolves from Takuya with 2 Hybrid cards under it and can attack immediately with Rush", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-020", as: "takuya", under: ["BT12-009", "BT12-009"] }],
          hand: [{ card: "AD1-002", as: "aldamon" }],
          deck: ["BT1-001"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("aldamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("takuya").topCard?.cardId === "AD1-002");
    expect(s.state.memory).toBe(0);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("takuya").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("rejects the Takuya route when fewer than 2 Hybrid cards are underneath", () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "AD1-020", as: "takuya", under: ["BT12-009"] }],
        hand: [{ card: "AD1-002", as: "aldamon" }],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("takuya").permanentId,
        instanceId: s.inst("aldamon").instanceId,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
    expect(s.perm("takuya").topCard?.cardId).toBe("AD1-020");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("aldamon").instanceId)).toBe(true);
  });

  it("at end of attack trashes a Hybrid, draws 2, and plays an inherited-effect Tamer for free", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "aldamon" }],
          hand: [
            { card: "BT12-009", as: "hybrid" },
            { card: "BT12-088", as: "takuya" },
          ],
          deck: [
            { card: "BT1-001", as: "draw1" },
            { card: "BT1-001", as: "draw2" },
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aldamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw1").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("draw2").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
  });

  it("still plays the Tamer after an attack when no card was trashed, per Q6052", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "aldamon" }],
          trash: [{ card: "BT12-088", as: "takuya" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("aldamon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"));

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
  });

  it("resolves the same trash, draw, and free-play sequence on deletion", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-002", as: "aldamon", suspended: true }],
          hand: [{ card: "BT12-009", as: "hybrid" }],
          trash: [{ card: "BT12-088", as: "takuya" }],
          deck: ["BT1-001", "BT1-001"],
        },
        1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 9000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const aldmonId = s.perm("aldamon").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: aldmonId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088"),
      5000,
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === aldmonId)).toBe(false);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("hybrid").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT12-088")).toBe(true);
  });

  it("grants the inherited +4000 DP only during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", dp: 7000, as: "holder", under: ["AD1-002"] }] } });
    await s.ready();
    expect(s.perm("holder").currentDP).toBe(11000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("holder").currentDP).toBe(7000);
  });

  it("rejects play when memory is below the printed cost", () => {
    const s = setupEngine({ 0: { hand: [{ card: "AD1-002", as: "aldamon" }] } });
    s.state.memory = -10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aldamon").instanceId })).toEqual({
      ok: false,
      reason: "insufficient-memory",
    });
  });

  it("matches committed metadata and publishes fully covered compiled IR", () => {
    const definition = getCardDefinition("AD1-002");
    const compiled = registeredCompiledCards.get("AD1-002") ?? getCompiledCard("AD1-002");
    expect(definition).toBeDefined();
    expect(definition?.cardId).toBe("AD1-002");
    expect(definition?.nameEn).toBe("Aldamon");
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled?.effects.length).toBeGreaterThan(0);
    expect(compiled?.effects).toEqual(expect.any(Array));
  });
});
