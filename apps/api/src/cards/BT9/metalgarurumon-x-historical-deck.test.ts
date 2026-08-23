import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-024.js";
import "./BT9-028.js";
import "./BT9-031.js";

describe("BT9 MetalGarurumon X historical deck gauntlet", () => {
  it("chains unsuspends and bounces, blocks a larger attacker, and pays Garurumon X's battle protection", async () => {
    const preferredIds: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT1-040",
              as: "wereGarurumon",
              suspended: true,
              under: [
                { card: "BT9-024", as: "garurumonXSource" },
                { card: "BT1-036", as: "garurumonSource" },
              ],
            },
          ],
          hand: [
            { card: "BT9-028", as: "wereGarurumonX" },
            { card: "BT1-044", as: "metalGarurumon" },
            { card: "BT9-031", as: "metalGarurumonX" },
          ],
          deck: ["BT1-001", "BT1-002", "BT1-003"],
        },
        1: {
          battleArea: [
            { card: "BT1-037", as: "firstBounce", dp: 4000 },
            { card: "BT1-028", as: "lowestA", dp: 2000 },
            { card: "BT9-008", as: "lowestB", dp: 1000 },
            { card: "BT4-114", as: "battleAttacker", dp: 13000 },
          ],
          security: ["BT1-001"],
        },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoOrderTriggers: true,
        preferInstanceIds: preferredIds,
      },
    );
    preferredIds.push(
      s.perm("firstBounce").permanentId,
      s.inst("garurumonXSource").instanceId,
      s.inst("garurumonSource").instanceId,
    );
    const hostId = s.perm("wereGarurumon").permanentId;
    const firstBounceCardId = s.perm("firstBounce").topCard!.instanceId;
    const lowestCardIds = [s.perm("lowestA").topCard!.instanceId, s.perm("lowestB").topCard!.instanceId];
    const garurumonXSourceId = s.inst("garurumonXSource").instanceId;
    const garurumonSourceId = s.inst("garurumonSource").instanceId;
    const wereGarurumonId = s.perm("wereGarurumon").topCard!.instanceId;
    const wereGarurumonXId = s.inst("wereGarurumonX").instanceId;
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: wereGarurumonXId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("wereGarurumon").isSuspended &&
        s.state.players[1]!.hand.some(({ instanceId }) => instanceId === firstBounceCardId) &&
        s.state.pendingDecision === undefined,
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: hostId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.perm("wereGarurumon").isSuspended).toBe(true);
    expect(s.state.players[1]!.security).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("metalGarurumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("wereGarurumon").topCard?.instanceId === s.inst("metalGarurumon").instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: hostId,
        instanceId: s.inst("metalGarurumonX").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.perm("wereGarurumon").isSuspended &&
        lowestCardIds.every((id) => s.state.players[1]!.hand.some(({ instanceId }) => instanceId === id)) &&
        observe(s.engine).hasKeyword(s.perm("wereGarurumon"), "Blocker") &&
        s.state.pendingDecision === undefined,
      5000,
    );

    expect(s.state.memory).toBe(1);
    expect(observe(s.engine).hasKeyword(s.perm("wereGarurumon"), "Blocker")).toBe(true);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("battleAttacker").permanentId,
    ]);

    s.state.turnSeat = 1;
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("battleAttacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).blockingSeat() === 0);
    expect(
      s.engine.applyIntent(0, {
        type: "declareBlock",
        blockerPermanentId: hostId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !observe(s.engine).isAttacking() &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === garurumonXSourceId) &&
        s.state.players[0]!.trash.some(({ instanceId }) => instanceId === garurumonSourceId),
    );

    const protectionChoice = s.decisions.find(
      ({ req }) => req.kind === "selectCards" && req.options?.candidateInstanceIds?.includes(garurumonXSourceId),
    )?.req;
    expect(new Set(protectionChoice?.options?.candidateInstanceIds ?? [])).toEqual(
      new Set([garurumonXSourceId, garurumonSourceId, wereGarurumonId, wereGarurumonXId]),
    );
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([hostId]);
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([
      s.perm("battleAttacker").permanentId,
    ]);
    expect(s.perm("wereGarurumon").isSuspended).toBe(true);
    assertNoLoudGap(s);
  });
});
