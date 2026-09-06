import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT18-056.js";
import "./BT18-008.js";
import "../BT1/BT1-020.js";

describe("BT18-056 TigerVespamon", () => {
  it("scales its suspension by security count and grants Piercing, Reboot, and unsuspend prevention", async () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[4]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: { controller: "any", excludeSelf: true },
          actions: [{ kind: "Unsuspend", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } }],
        },
      ],
    });
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT18-056", as: "tigerVespamon" }],
          security: [
            { card: "BT1-010", faceUp: true },
            { card: "BT1-011", faceUp: true },
            { card: "BT1-012", faceUp: false },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "opponentOne" },
            { card: "BT1-030", as: "opponentTwo" },
            { card: "BT1-030", as: "opponentThree" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tigerVespamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("opponentTwo"), "unsuspend"));

    expect(s.perm("opponentOne").isSuspended).toBe(true);
    expect(s.perm("opponentTwo").isSuspended).toBe(true);
    expect(s.perm("opponentThree").isSuspended).toBe(false);
    expect(observe(s.engine).isRestricted(s.perm("opponentOne"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentTwo"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("opponentThree"), "unsuspend")).toBe(true);
    const source = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.cardId === "BT18-056")!;
    expect(observe(s.engine).hasPierce(source)).toBe(true);
    expect(observe(s.engine).hasKeyword(source, "Reboot")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(source, "Insectoid")).toBe(true);
    assertNoLoudGap(s);
  });

  it("digivolves from a level-5 Royal Base for 3 and scales only from face-up security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT18-052", as: "base" }],
          hand: [{ card: "BT18-056", as: "tiger" }],
          security: [
            { card: "BT1-001", faceUp: true },
            { card: "BT1-002", faceUp: false },
          ],
          deck: ["BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-030", as: "first" },
            { card: "BT1-030", as: "second" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("tiger").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("second"), "unsuspend"));

    expect(s.state.memory).toBe(2);
    expect([s.perm("first").isSuspended, s.perm("second").isSuspended].filter(Boolean)).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("first"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("second"), "unsuspend")).toBe(true);
    assertNoLoudGap(s);
  });

  it("unsuspends once when another Digimon on either side is deleted in battle", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-056", as: "tiger", suspended: true },
            { card: "BT1-020", as: "friendly" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-030", suspended: true, as: "firstOpponent" },
            { card: "BT1-030", suspended: true, as: "secondOpponent" },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("friendly").permanentId,
        target: { kind: "permanent", permanentId: s.perm("firstOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "combatResolved"));
    expect(s.events.some((event) => event.kind === "combatResolved")).toBe(true);
    expect(s.perm("tiger").isSuspended).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tiger").permanentId,
        target: { kind: "permanent", permanentId: s.perm("secondOpponent").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT1-030"));
    expect(s.perm("tiger").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not unsuspend when another Digimon is deleted by an effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT18-056", as: "tiger", suspended: true },
            { card: "BT1-030", as: "friendly", dp: 1000 },
          ],
        },
        1: { hand: [{ card: "BT18-008", as: "deletingGoblimon" }] },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 10;
    await s.ready();

    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("deletingGoblimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.trash.some(({ cardId }) => cardId === "BT1-030"));
    expect(s.perm("tiger").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
