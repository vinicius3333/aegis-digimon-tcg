import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

function primitives(s: ReturnType<typeof setupEngine>): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT26-094 Keenan Crier", () => {
  it("requires the printed DATA SQUAD placement cost", async () => {
    const { getEffectModule } = await import("../../engine/effects/registry.js");
    const effect = getEffectModule("BT26-094")!.effectsForTiming(EffectTiming.OnStartMainPhase, {} as never)[0]!;
    expect(effect.optional).toBe(false);
  });

  it("places the DATA SQUAD cost face down at the stack bottom before drawing and gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT26-065", as: "dataSquadCost" }],
          deck: [{ card: "AD1-002", as: "drawn" }],
          battleArea: [
            {
              card: "BT26-094",
              as: "keenan",
              under: [{ card: "AD1-001", faceUp: false, as: "existingBottom" }],
            },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const costId = s.inst("dataSquadCost").instanceId;
    const existingId = s.inst("existingBottom").instanceId;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("keenan"));
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId));

    expect(s.perm("keenan").stack.map((card) => card.instanceId)).toEqual([costId, existingId]);
    expect(s.perm("keenan").stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("suspends and grants Execute when the opponent's hand is trashed from on Keenan's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-094", as: "keenan" },
          { card: "BT26-076", as: "dataSquad" },
        ],
        breeding: { card: "AD1-001", as: "invalidBreeding" },
      },
      1: { hand: [{ card: "AD1-002", as: "opponentHand" }] },
    });
    await s.ready();

    await primitives(s).trash([s.inst("opponentHand").instanceId], { byEffectSeat: 0 });
    await settle(() => observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute"));

    expect(s.perm("keenan").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("invalidBreeding"), "Execute")).toBe(false);
  });

  it("reacts to an effect trashing its bottom card and the card reaches trash face up", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT26-094",
            as: "keenan",
            under: [{ card: "AD1-001", faceUp: false, as: "underCard" }],
          },
          { card: "BT26-076", as: "dataSquad" },
        ],
      },
    });
    await s.ready();
    const underId = s.inst("underCard").instanceId;

    await primitives(s).trashDigivolutionCards(s.perm("keenan").permanentId, [underId], { byEffectSeat: 0 });
    await settle(() => observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute"));

    expect(s.perm("keenan").isSuspended).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("dataSquad"), "Execute")).toBe(true);
    expect(s.state.players[0]!.trash.find((card) => card.instanceId === underId)?.faceUp).toBe(true);
  });

  it("does not trigger for the controller's own hand or during the opponent's turn", async () => {
    const ownHand = setupEngine({
      0: {
        hand: [{ card: "AD1-002", as: "ownHand" }],
        battleArea: [
          { card: "BT26-094", as: "keenan" },
          { card: "BT26-076", as: "dataSquad" },
        ],
      },
    });
    await ownHand.ready();
    await primitives(ownHand).trash([ownHand.inst("ownHand").instanceId], { byEffectSeat: 0 });
    await settle();
    expect(ownHand.perm("keenan").isSuspended).toBe(false);

    const opponentTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-094", as: "keenan" },
          { card: "BT26-076", as: "dataSquad" },
        ],
      },
      1: { hand: [{ card: "AD1-002", as: "opponentHand" }] },
    });
    opponentTurn.state.turnSeat = 1;
    await opponentTurn.ready();
    await primitives(opponentTurn).trash([opponentTurn.inst("opponentHand").instanceId], { byEffectSeat: 0 });
    await settle();
    expect(opponentTurn.perm("keenan").isSuspended).toBe(false);
  });

  it("plays itself from Security without paying the cost", async () => {
    const s = setupEngine({
      0: { security: [{ card: "BT26-094", as: "keenanSecurity" }] },
      1: { battleArea: [{ card: "AD1-003", as: "attacker" }] },
    });
    s.state.turnSeat = 1;
    const keenanId = s.inst("keenanSecurity").instanceId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === keenanId),
    );

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === keenanId)).toBe(true);
  });
});
