import { describe, expect, it } from "vitest";
import { EffectTiming, Phase } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("P-179 Justimon: Critical Arm", () => {
  it("digivolves from a named Justimon for 1, places a Device, gains DP, and deletes cost 9", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT19-064", as: "base" }],
          hand: [
            { card: "P-179", as: "critical" },
            { card: "P-155", as: "device" },
          ],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT12-083", as: "cost9" },
            { card: "BT1-080", as: "cost10" },
            { card: "P-155", as: "opponentOption" },
          ],
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
    preferred.push(s.inst("device").instanceId, s.perm("opponentOption").topCard.instanceId, cost9Id);
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("critical").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.perm("base").topCard.cardId === "P-179" &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === s.inst("device").instanceId) &&
        !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === cost9Id),
    );

    expect(s.state.memory).toBe(2);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT19-064"]);
    expect(s.perm("base").currentDP).toBe(15000);
    expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toContain("BT1-080");
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

  it("shares the once-per-turn deletion use between digivolving and attacking", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "P-179", as: "critical" }],
        },
        1: {
          battleArea: [
            { card: "BT12-083", as: "firstTarget" },
            { card: "BT17-050", as: "secondTarget" },
            { card: "P-155", as: "firstOption" },
            { card: "P-155", as: "secondOption" },
          ],
          security: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const firstTargetId = s.perm("firstTarget").permanentId;
    const firstOptionInstanceId = s.perm("firstOption").topCard.instanceId;
    const secondOptionInstanceId = s.perm("secondOption").topCard.instanceId;
    s.perm("firstOption").placedByEffect = true;
    s.perm("secondOption").placedByEffect = true;
    preferred.push(firstOptionInstanceId, firstTargetId);
    await s.ready();

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("critical"));
    await settle(() => !s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === firstTargetId));

    s.state.phase = Phase.Main;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("critical").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();

    expect(s.state.players[1]!.battleArea.some(({ topCard }) => topCard.instanceId === secondOptionInstanceId)).toBe(
      true,
    );
    expect(
      s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === s.perm("secondTarget").permanentId),
    ).toBe(true);
    assertNoLoudGap(s);
  });

  it("can decline the placement effect without moving the Device or gaining DP", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-179", as: "critical" }],
        hand: [{ card: "P-155", as: "device" }],
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
    assertNoLoudGap(s);
  });
});
