import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import "./P-089.js";

describe("P-089 Amphimon", () => {
  it("scales source trashing from the blue cards actually trashed, then restricts a source-less target", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-038", as: "base" }],
          hand: [
            { card: "P-089", as: "amphimon" },
            { card: "BT1-027", as: "blue-a" },
            { card: "BT1-028", as: "blue-b" },
            { card: "BT1-009", as: "red-control" },
          ],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [
            {
              card: "BT1-009",
              as: "stackedTarget",
              under: ["BT1-001", "BT1-002", "BT1-003"],
            },
            { card: "BT1-010", as: "sourceLessTarget" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const blueIds = [s.inst("blue-a").instanceId, s.inst("blue-b").instanceId];
    const redId = s.inst("red-control").instanceId;
    s.state.memory = 10;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("amphimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        blueIds.every((id) => s.state.players[0]!.trash.some((card) => card.instanceId === id)) &&
        s.perm("stackedTarget").stack.length === 1 &&
        observe(s.engine).isRestricted(s.perm("sourceLessTarget"), "beSuspended"),
    );

    expect(s.state.memory).toBe(7);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("base").instanceId)).toBe(true);
    expect(blueIds.every((id) => s.state.players[0]!.trash.some((card) => card.instanceId === id))).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === redId)).toBe(true);
    expect(s.perm("stackedTarget").stack).toHaveLength(1);
    expect(observe(s.engine).isRestricted(s.perm("sourceLessTarget"), "beSuspended")).toBe(true);
  });

  it("Q4181: returns exactly 3 Jellymon-text cards to end an opponent's attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "P-089", as: "amphimon" },
            { card: "BT10-090", as: "owner-tamer" },
          ],
          trash: [
            { card: "P-061", as: "jellymon" },
            { card: "BT9-021", as: "jellymon-bt9" },
            { card: "BT9-025", as: "teslaJellymon" },
            { card: "BT13-028", as: "thetismon" },
            { card: "BT9-086", as: "kiyoshiro" },
            { card: "EX12-023", as: "jellymon-ex12" },
          ],
          security: [{ card: "BT1-009", as: "security" }],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
        1: {
          battleArea: [
            { card: "BT1-025", as: "attacker" },
            { card: "BT1-025", as: "attacker2" },
            { card: "BT1-025", as: "attacker3" },
          ],
          deck: Array.from({ length: 20 }, () => "BT1-009"),
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const firstReturnedIds = ["jellymon", "jellymon-bt9", "teslaJellymon"].map((alias) => s.inst(alias).instanceId);
    const secondReturnedIds = ["thetismon", "kiyoshiro", "jellymon-ex12"].map((alias) => s.inst(alias).instanceId);
    const securityId = s.inst("security").instanceId;
    await s.ready();
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        firstReturnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id)) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );

    expect(s.state.players[0]!.deck.slice(-3).map((card) => card.instanceId)).toEqual(firstReturnedIds);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(secondReturnedIds);
    expect(s.state.players[0]!.security.map((card) => card.instanceId)).toEqual([securityId]);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-089")).toHaveLength(1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker2").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck.slice(-3).map((card) => card.instanceId)).toEqual(firstReturnedIds);
    expect(s.state.players[0]!.trash.slice(0, 3).map((card) => card.instanceId)).toEqual(secondReturnedIds);
    expect(s.state.players[0]!.trash.at(-1)?.instanceId).toBe(securityId);
    expect(s.state.players[0]!.security).toHaveLength(0);

    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker3").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        secondReturnedIds.every((id) => s.state.players[0]!.deck.some((card) => card.instanceId === id)) &&
        !observe(s.engine).isAttacking() &&
        s.state.pendingDecision === undefined,
    );
    expect(s.state.players[0]!.deck.slice(-3).map((card) => card.instanceId)).toEqual(secondReturnedIds);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.decisions.filter(({ req }) => req.kind === "optional" && req.sourceCardId === "P-089")).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
    assertNoLoudGap(s);
  });
});
