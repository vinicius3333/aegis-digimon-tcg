import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT7-006.js";

describe("BT7-006 Kokomon", () => {
  it("reveals 3 and trashes a Tamer when attacking", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-069", under: ["BT7-006"], as: "host" }],
          deck: [{ card: "BT1-085", as: "tamer" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tamer").instanceId));

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("may decline the reveal without moving any cards", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-069", under: ["BT7-006"], as: "host" }],
          deck: [{ card: "BT1-085", as: "tamer" }, "BT1-010", "BT1-011"],
        },
        1: { security: ["BT1-001"] },
      },
      { autoDeclineOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "optional"));

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("tamer").instanceId);
  });
});

describe("BT7-006 Kokomon — KB Q&A rulings", () => {
  it("must trash 1 revealed Tamer once the optional reveal is accepted (Q1506)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT6-069", under: ["BT7-006"], as: "host" }],
          deck: [
            { card: "BT1-085", as: "tai" },
            { card: "BT1-010", as: "agumon" },
            { card: "BT1-086", as: "matt" },
            "BT1-011",
          ],
        },
        1: { security: ["BT1-001"] },
      },
      { autoAcceptOptional: true },
    );

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("host").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.decisions.some(({ req }) => req.kind === "selectCards" || req.kind === "chooseTargets"));
    const pick = s.decisions.find(({ req }) => req.kind === "selectCards")!.req;
    expect(pick.options).toMatchObject({
      min: 1,
      max: 1,
      candidateInstanceIds: [s.inst("tai").instanceId, s.inst("matt").instanceId],
    });

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pick.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.players[0]!.trash).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pick.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("matt").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 3);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual([s.inst("matt").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011", "BT1-085", "BT1-010"]);
  });
});
