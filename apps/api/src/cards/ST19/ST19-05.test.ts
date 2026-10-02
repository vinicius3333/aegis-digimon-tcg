import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST19-05.js";

describe("ST19-05 PawnChessmon", () => {
  it("trashes one Puppet from hand and draws two when deleted", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }],
        },
        1: {
          battleArea: [{ card: "ST19-05", as: "pawn", dp: 1000, suspended: true }],
          hand: [{ card: "ST19-02", as: "cost" }],
          deck: [
            { card: "BT1-010", as: "first" },
            { card: "BT1-011", as: "second" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("pawn"), "Blocker")).toBe(true);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pawn").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        !s.state.players[1]!.battleArea.some((permanent) => permanent.permanentId === s.perm("pawn").permanentId) &&
        s.state.players[1]!.hand.some((card) => card.instanceId === s.inst("second").instanceId),
    );
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });

  it("declines the optional 'by' cost on deletion and keeps the Puppet without drawing", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }] },
      1: {
        battleArea: [{ card: "ST19-05", as: "pawn", dp: 1000, suspended: true }],
        hand: [{ card: "ST19-02", as: "cost" }],
        deck: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pawn").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision !== undefined || s.state.players[1]!.deck.length === 0);
    expect(s.state.pendingDecision).toMatchObject({ seat: 1, kind: "selectCards" });
    const decision = s.state.pendingDecision!;
    expect(JSON.parse(decision.payloadJson)).toMatchObject({ min: 0, max: 1, purpose: "cost" });

    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand.map((card) => card.instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).not.toContain(s.inst("cost").instanceId);
    expect(s.state.players[1]!.deck).toHaveLength(2);
  });

  it("catalogues Blocker and the On Deletion cost", () => {
    expect(getCardDefinition("ST19-05")).toMatchObject({
      effectText: expect.stringContaining("＜Blocker＞"),
    });
  });

  it("does not draw when the Puppet trash cost cannot be paid", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-001", as: "attacker", dp: 5000 }] },
      1: {
        battleArea: [{ card: "ST19-05", as: "pawn", dp: 1000, suspended: true }],
        deck: [
          { card: "BT1-010", as: "first" },
          { card: "BT1-011", as: "second" },
        ],
      },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("pawn").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[1]!.battleArea.some((p) => p.permanentId === s.perm("pawn").permanentId));
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.players[1]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("first").instanceId,
      s.inst("second").instanceId,
    ]);
  });
});
