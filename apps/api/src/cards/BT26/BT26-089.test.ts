import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT26-089 Kyo Sawashiro", () => {
  it("places the BEATBREAK cost face down at the bottom, then draws and gains memory (Q7137)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST23-02", as: "cost" }],
          deck: [{ card: "AD1-002", as: "drawn" }],
          battleArea: [{ card: "BT26-089", as: "kyo", under: [{ card: "AD1-001", as: "existing" }] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kyo"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("kyo").stack.map((card) => card.instanceId)).toEqual([
      s.inst("cost").instanceId,
      s.inst("existing").instanceId,
    ]);
    expect(s.perm("kyo").stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("reacts to effect removal, suspends, places the deck top face down, and applies Security A. -1", async () => {
    const s = setupEngine(
      {
        0: {
          deck: [{ card: "AD1-002", as: "deckTop" }],
          security: [{ card: "AD1-003", as: "security" }],
          battleArea: [{ card: "BT26-089", as: "kyo" }],
        },
        1: { battleArea: [{ card: "AD1-004", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);

    await primitives(s).trashFromSecurity(0, 1, { fromTop: true });
    await settle(() => observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack") === -1);

    expect(s.perm("kyo").isSuspended).toBe(true);
    expect(s.perm("kyo").stack.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    expect(s.perm("kyo").stack[0]!.faceUp).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(-1);
  });

  it("does not process the After clause when the suspend cost cannot be paid (Q7141)", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "AD1-002", as: "deckTop" }],
        security: [{ card: "AD1-003", as: "security" }],
        battleArea: [{ card: "BT26-089", as: "kyo", suspended: true }],
      },
      1: { battleArea: [{ card: "AD1-004", as: "opponent" }] },
    });
    await s.engine.recomputeContinuousEffects();

    await primitives(s).trashFromSecurity(0, 1, { fromTop: true });
    await settle();

    expect(s.perm("kyo").stack).toHaveLength(0);
    expect(observe(s.engine).keywordAmount(s.perm("opponent"), "SecurityAttack")).toBe(0);
  });

  it("handles attack-driven removal without applying the effect-only debuff", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "AD1-002", as: "deckTop" }],
        security: [{ card: "AD1-003", as: "security" }],
        battleArea: [{ card: "BT26-089", as: "kyo" }],
      },
      1: { battleArea: [{ card: "AD1-004", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("kyo").stack.length === 1);

    expect(s.perm("kyo").isSuspended).toBe(true);
    expect(s.perm("kyo").stack[0]!.faceUp).toBe(false);
    expect(observe(s.engine).keywordAmount(s.perm("attacker"), "SecurityAttack")).toBe(0);
  });

  it("plays itself from Security without paying the cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-089", as: "kyoSecurity" }] },
      1: { battleArea: [{ card: "AD1-004", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const cardId = s.inst("kyoSecurity").instanceId;

    s.engine.applyIntent(1, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === cardId));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === cardId)).toBe(true);
  });
});
