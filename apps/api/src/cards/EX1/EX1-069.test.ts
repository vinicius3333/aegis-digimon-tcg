import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-069.js";

describe("EX1-069 Ultimate Connection!", () => {
  it("trashes a level-5 Cyborg to gain 2 memory and draw 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-069", as: "option" },
            { card: "EX1-008", as: "cost" },
          ],
          battleArea: [{ card: "EX1-047", as: "blackSource" }],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 0);
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("activates Main from security for its owner: trashes a Cyborg, gains 2, and draws 1", async () => {
    const s = setupEngine(
      {
        1: {
          security: [{ card: "EX1-069", as: "option", faceUp: true }],
          hand: [{ card: "EX1-008", as: "cost" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand.some((c) => c.instanceId === drawnId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("activates Main for its owner during a real security check", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          security: [{ card: "EX1-069", as: "option" }],
          hand: [{ card: "EX1-008", as: "cost" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.hand.some((card) => card.instanceId === drawnId));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[1]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
  });

  it("does not resolve the gain/draw payload when the optional trash cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-069", as: "option" },
            { card: "EX1-008", as: "cost" },
          ],
          battleArea: [{ card: "EX1-047", as: "blackSource" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoDeclineOptional: true },
    );
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-069"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(false);
  });

  it("does not offer absent, wrong-level, or wrong-trait cards as the cost", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "EX1-069", as: "option" },
            { card: "EX1-047", as: "wrongLevel" },
            { card: "BT1-020", as: "wrongTrait" },
          ],
          battleArea: [{ card: "EX1-047", as: "blackSource" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 1;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some((card) => card.cardId === "EX1-069"));
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("wrongLevel").instanceId, s.inst("wrongTrait").instanceId]),
    );
  });
});
