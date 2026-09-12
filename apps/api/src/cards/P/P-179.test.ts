import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "../index.js";

describe("P-179 Justimon: Critical Arm", () => {
  it("digivolves from a named Justimon for 1, places a Device, gains DP, and deletes cost 9", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-064", as: "base" },
            { card: "BT1-090", as: "spareOption", placedByEffect: true },
          ],
          hand: [{ card: "P-179", as: "critical" }, { card: "P-155", as: "device" }, "BT1-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [
            { card: "BT12-083", as: "cost9" },
            { card: "BT1-080", as: "cost10" },
            { card: "P-155", as: "opponentOption", placedByEffect: true },
          ],
          hand: ["BT1-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      {
        autoAcceptOptional: true,
        autoOrderTriggers: true,
        autoSelectCards: true,
        preferInstanceIds: preferred,
      },
    );
    const cost9Id = s.perm("cost9").permanentId;
    preferred.push(s.inst("spareOption").instanceId, s.inst("device").instanceId, cost9Id);
    const originalSourceId = s.perm("base").topCard.instanceId;
    s.state.memory = 10;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("critical").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "P-179" &&
        s.state.players[0]!.battleArea.some(({ topCard }) => topCard?.instanceId === s.inst("device").instanceId) &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === cost9Id),
    );

    expect(s.state.memory).toBe(9);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([originalSourceId]);
    expect(s.perm("base").currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT1-080");
    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("P-155");
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("spareOption").instanceId);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.instanceId)).toContain(
      s.inst("opponentOption").instanceId,
    );
    expect(s.state.pendingDecision).toBeUndefined();
    assertNoLoudGap(s);
  });

  it("can pay the placement cost from trash and leaves a non-Device card untouched", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-179", as: "critical" }],
          hand: [{ card: "BT1-109", as: "nonDevice" }],
          trash: [{ card: "P-159", as: "device" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("device").instanceId);

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("critical"));
    await settle(() =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === s.inst("device").instanceId),
    );

    const placed = s.state.players[0]!.battleArea.find(
      ({ topCard }) => topCard.instanceId === s.inst("device").instanceId,
    );
    expect(placed?.placedByEffect).toBe(true);
    expect(placed?.topCard.faceUp).toBe(true);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("nonDevice").instanceId);
    expect(s.perm("critical").currentDP).toBe(15000);
    assertNoLoudGap(s);
  });

  it("shares the once-per-turn deletion use between digivolving and attacking across real turns", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        1: {
          battleArea: [
            { card: "BT12-083", as: "firstTarget" },
            { card: "BT17-050", as: "secondTarget" },
          ],
          hand: ["BT1-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
        0: {
          battleArea: [
            { card: "BT19-064", as: "base" },
            { card: "P-155", as: "firstOption", placedByEffect: true },
            { card: "P-155", as: "secondOption", placedByEffect: true },
            { card: "P-155", as: "thirdOption", placedByEffect: true },
          ],
          hand: [{ card: "P-179", as: "critical" }, { card: "P-155", as: "device" }, "BT1-013"],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
          security: ["BT1-009", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const firstTargetId = s.perm("firstTarget").permanentId;
    const secondTargetId = s.perm("secondTarget").permanentId;
    const firstOptionInstanceId = s.perm("firstOption").topCard.instanceId;
    const secondOptionInstanceId = s.perm("secondOption").topCard.instanceId;
    const thirdOptionInstanceId = s.perm("thirdOption").topCard.instanceId;
    const originalSourceId = s.perm("base").topCard.instanceId;
    const criticalInstanceId = s.inst("critical").instanceId;
    preferred.push(s.inst("device").instanceId, firstOptionInstanceId, firstTargetId);
    s.state.memory = 10;
    await s.ready();

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("critical").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId));
    expect(s.state.memory).toBe(9);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([originalSourceId]);
    expect(s.perm("base").topCard.instanceId).toBe(criticalInstanceId);
    expect(s.perm("base").currentDP).toBe(15000);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === secondOptionInstanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === thirdOptionInstanceId)).toBe(
      true,
    );
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("secondTarget").permanentId),
    ).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(s.perm("base").currentDP).toBe(15000);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    expect(s.perm("base").currentDP).toBe(12000);

    preferred.push(secondOptionInstanceId, s.perm("secondTarget").permanentId);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("base").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === secondTargetId));

    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === secondOptionInstanceId)).toBe(
      false,
    );
    expect(s.state.players[0]!.battleArea.some(({ topCard }) => topCard.instanceId === thirdOptionInstanceId)).toBe(
      true,
    );
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(secondOptionInstanceId);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(observe(s.engine).isAttacking()).toBe(false);
    expect(s.perm("base").topCard.cardId).toBe("P-179");
    expect(s.perm("base").topCard.instanceId).toBe(criticalInstanceId);
    // The real next turn starts at 3 memory; this effect has no memory cost.
    expect(s.state.memory).toBe(3);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });

  it("can decline the placement effect without moving the Device or gaining DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-179", as: "critical" }],
        hand: [{ card: "P-155", as: "device" }],
      },
      1: {
        battleArea: [
          { card: "BT12-083", as: "target" },
          { card: "P-155", as: "opponentOption", placedByEffect: true },
        ],
      },
    });
    await s.ready();

    void advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("critical"));
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("device").instanceId);
    expect(s.perm("critical").currentDP).toBe(12000);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-083", "P-155"]);
    assertNoLoudGap(s);

    // An accepted attack with only an opponent's Option available cannot pay this own-Option cost.
    const attack = setupEngine(
      {
        0: { battleArea: [{ card: "P-179", as: "critical" }], security: ["BT1-009"] },
        1: {
          battleArea: [
            { card: "BT12-083", as: "target" },
            { card: "P-155", as: "opponentOption", placedByEffect: true },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const attackPermanentId = attack.perm("critical").permanentId;
    const attackTopInstanceId = attack.perm("critical").topCard.instanceId;
    await attack.ready();
    expect(
      attack.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(attack.perm("critical").permanentId).toBe(attackPermanentId);
    expect(attack.perm("critical").topCard.instanceId).toBe(attackTopInstanceId);
    expect(attack.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT12-083", "P-155"]);
    expect(attack.state.pendingDecision).toBeUndefined();
    expect(observe(attack.engine).isAttacking()).toBe(false);
    assertNoLoudGap(attack);
  });
});
