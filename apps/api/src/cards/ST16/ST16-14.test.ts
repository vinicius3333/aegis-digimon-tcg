import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST16-14 Matt Ishida — whenHandTrashed: by suspending this Tamer, gain 1 memory", () => {
  it("two physical Matts each trigger once when two hand cards are discarded together", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST16-14", as: "firstMatt" },
            { card: "ST16-14", as: "secondMatt" },
          ],
          hand: [
            { card: "BT1-010", as: "firstCard" },
            { card: "BT1-011", as: "secondCard" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    await primitivesOf(s).trash([s.inst("firstCard").instanceId, s.inst("secondCard").instanceId], { byEffectSeat: 0 });
    expect(s.decisions.filter(({ req }) => req.kind === "optional")).toHaveLength(2);
    const prompt = s.decisions.find(({ req }) => req.kind === "orderTriggers")!.req;
    expect(prompt.options!.triggerCardIds).toEqual(["ST16-14", "ST16-14"]);
    expect(s.perm("firstMatt").isSuspended).toBe(false);
    expect(s.perm("secondMatt").isSuspended).toBe(false);
  });
  it.each([true, false])("LadyDevimon's simultaneous discard triggers Matt only once (accept: %s)", async (accept) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST16-14", as: "matt" },
            { card: "ST6-08", as: "base" },
          ],
          hand: [{ card: "BT3-088", as: "lady" }, "BT1-010", "BT1-011"],
          deck: Array(8).fill("BT1-010"),
        },
      },
      { autoSelectCards: true, autoAcceptOptional: accept, autoDeclineOptional: !accept },
    );
    s.state.memory = 10;
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "ST16-14")).toHaveLength(1);
    expect(s.decisions.filter(({ req }) => req.kind === "orderTriggers")).toHaveLength(0);
    expect(s.state.memory).toBe(accept ? 8 : 7);
    expect(s.perm("matt").isSuspended).toBe(accept);
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("two separate discard actions offer Matt again after the first is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-14", as: "matt" }],
          hand: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const before = s.state.memory;
    await primitivesOf(s).trash([s.inst("first").instanceId], { byEffectSeat: 0 });
    await primitivesOf(s).trash([s.inst("second").instanceId], { byEffectSeat: 0 });
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "ST16-14")).toHaveLength(2);
    expect(s.state.memory).toBe(before);
    expect(s.perm("matt").isSuspended).toBe(false);
  });
  it("sets the owner's memory to 3 at the start of their turn when it is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-14", as: "tamer" }] } });
    s.state.memory = 2;

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    expect(s.state.memory).toBe(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
  });

  it("plays itself without cost from security", async () => {
    const s = setupEngine({
      0: { security: [{ card: "ST16-14", as: "securityMatt" }, "BT1-090"] },
      1: { battleArea: ["BT1-009"] },
    });

    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.state.players[1]!.battleArea[0]!.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "ST16-14"));

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "ST16-14")).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(1);
  });

  it("suspends the Tamer and gains 1 memory when owner's hand card is trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST16-14", dp: 0, as: "tamer" }], hand: [{ card: "BT1-001", as: "handCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    const handCardId = s.inst("handCard").instanceId;

    await primitivesOf(s).trash([handCardId], { byEffectSeat: 0 });
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("does NOT gain memory when the Tamer is already suspended (cost unpayable)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-14", dp: 0, as: "tamer", suspended: true }],
          hand: [{ card: "BT1-001", as: "handCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    const handCardId = s.inst("handCard").instanceId;

    await primitivesOf(s).trash([handCardId]);
    await settle(() => false, 100);

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("does not suspend or gain memory when the opponent's effect trashes the hand card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "ST16-14", as: "tamer" }], hand: [{ card: "BT1-001", as: "handCard" }] },
    });
    await s.engine.recomputeContinuousEffects();
    s.state.memory = 0;

    await primitivesOf(s).trash([s.inst("handCard").instanceId], { byEffectSeat: 1 });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("handCard").instanceId));

    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });
});
