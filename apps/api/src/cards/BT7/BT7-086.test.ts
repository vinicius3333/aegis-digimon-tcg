import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../BT1/BT1-031.js";
import "../BT18/BT18-022.js";
import "./BT7-086.js";

describe("BT7-086 Tommy Himi", () => {
  it("trashes three bottom digivolution cards from an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT7-086", as: "source" }] },
        1: { battleArea: [{ card: "BT7-025", as: "target", under: ["BT7-020", "BT7-021", "BT7-022", "BT7-023"] }] },
      },
      { autoSelectCards: true },
    );
    const opponent = s.state.players[1] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").stack.length === 1);
    expect(opponent.trash).toHaveLength(3);
  });
});

describe("BT7-086 Tommy Himi — KB Q&A rulings", () => {
  it("activates its inherited effect once a Digimon digivolves onto the Tommy Himi Tamer (Q1655)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT7-086", as: "tommy" }],
          hand: [{ card: "BT18-022", as: "kumamon" }],
        },
        1: {
          battleArea: [{ card: "BT2-047", as: "target" }],
          security: ["BT1-010"],
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    s.state.memory = 2;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tommy").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("tommy").permanentId,
        instanceId: s.inst("kumamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("tommy").topCard.cardId === "BT18-022");
    expect(s.perm("tommy").stack.map(({ cardId }) => cardId)).toEqual(["BT7-086"]);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(false);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tommy").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));

    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);
  });

  it("keeps the target unable to attack or block through the opponent's turn even after it gains a digivolution card (Q1656)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-019", as: "tommyCarrier", under: ["BT7-086"] },
            { card: "BT1-019", as: "secondAttacker" },
          ],
          security: 3,
        },
        1: {
          battleArea: [
            { card: "BT1-031", as: "target" },
            { card: "BT1-031", as: "sourcedControl", under: ["BT1-010"] },
          ],
          hand: [{ card: "BT1-001", as: "laterSource" }],
          deck: ["BT1-011", "BT1-012"],
          security: 3,
        },
      },
      { autoSelectCards: true, autoDeclineOptional: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("tommyCarrier").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "attack"));
    expect(observe(s.engine).isRestricted(s.perm("sourcedControl"), "attack")).toBe(false);
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());

    await advance(s.engine).verb.placeUnder(s.perm("target").permanentId, [s.inst("laterSource").instanceId]);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("target"), "attack")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "block")).toBe(true);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("secondAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 1);
    expect(
      s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: s.perm("target").permanentId }),
    ).toMatchObject({ ok: false });
    expect(s.perm("target").isSuspended).toBe(false);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    advance(s.engine).endMainPhaseIfOpen(0);

    await advance(s.engine).waitForMainPhase(1);
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("target").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("sourcedControl").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    expect(s.perm("sourcedControl").isSuspended).toBe(true);
    await advance(s.engine).finishAttack();

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
