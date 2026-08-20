import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("BT26-093 Reina Sakuya", () => {
  it("places the BEATBREAK hand card face down at the existing stack bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-061", as: "beatbreakCost" }],
          deck: [{ card: "AD1-002", as: "drawn" }],
          battleArea: [
            {
              card: "BT26-093",
              as: "reina",
              under: [{ card: "AD1-001", faceUp: false, as: "existingBottom" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("beatbreakCost").instanceId;
    const existingId = s.inst("existingBottom").instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("reina").stack.map((card) => card.instanceId)).toEqual([costId, existingId]);
    expect(s.perm("reina").stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("reacts to its controller's attack, placing the deck top face down and granting both keywords", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "AD1-002", as: "deckTop" }],
        battleArea: [
          { card: "BT26-093", as: "reina" },
          { card: "BT26-061", as: "beatbreak" },
        ],
      },
    });
    await s.ready();
    const deckTopId = s.inst("deckTop").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beatbreak").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reina").stack.some((card) => card.instanceId === deckTopId));
    await settle(() => observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision"));

    expect(s.perm("reina").isSuspended).toBe(true);
    expect(s.perm("reina").stack[0]).toMatchObject({ instanceId: deckTopId, faceUp: false });
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(true);
  });

  it("also reacts to an opponent's attack", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "AD1-002", as: "deckTop" }],
        battleArea: [
          { card: "BT26-093", as: "reina" },
          { card: "BT26-061", as: "beatbreak" },
        ],
      },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    await s.ready();

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("reina").isSuspended);
    await settle(() => observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision"));

    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(true);
  });

  it("does no After processing when the suspend cost cannot be paid, per Q7155", async () => {
    const s = setupEngine({
      0: {
        deck: [{ card: "AD1-002", as: "deckTop" }],
        battleArea: [
          { card: "BT26-093", suspended: true, as: "reina" },
          { card: "BT26-061", as: "beatbreak" },
        ],
      },
    });
    await s.ready();
    const deckTopId = s.inst("deckTop").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("beatbreak").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(deckTopId);
    expect(s.perm("reina").stack).toHaveLength(0);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("beatbreak"), "Blocker")).toBe(false);
  });

  it("plays itself from Security without paying the cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-093", as: "reinaSecurity" }] },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const reinaId = s.inst("reinaSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === reinaId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === reinaId)).toBe(true);
  });
});
