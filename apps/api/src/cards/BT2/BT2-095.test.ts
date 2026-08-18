import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT2-095.js";

describe("BT2-095 River of Power", () => {
  it("returns up to three opposing level 3 Digimon and trashes only their sources", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT2-021", as: "ownDigimon" }], hand: [{ card: "BT2-095", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT2-033", as: "first", under: [{ card: "BT2-001", as: "firstSource" }] },
            { card: "BT2-021", as: "second" },
            { card: "BT2-067", as: "third" },
            { card: "BT2-071", as: "levelFour" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.hand.length === 3);

    expect(s.state.players[1]!.hand.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT2-033", "BT2-021", "BT2-067"]),
    );
    expect(s.state.players[1]!.battleArea[0]!.topCard.cardId).toBe("BT2-071");
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === s.inst("firstSource").instanceId)).toBe(true);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.perm("ownDigimon").topCard.instanceId);
  });

  it("offers only opposing level 3 Digimon with bounds from zero through three", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-021", as: "ownLevelThree" }],
        hand: [{ card: "BT2-095", as: "option" }],
      },
      1: {
        battleArea: [
          { card: "BT2-033", as: "first" },
          { card: "BT2-021", as: "second" },
          { card: "BT2-067", as: "third" },
          { card: "BT2-071", as: "levelFour" },
        ],
      },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === decision.decisionId)!.req;

    expect(request.options!.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("first").permanentId, s.perm("second").permanentId, s.perm("third").permanentId]),
    );
    expect(request.options!.candidateInstanceIds).toHaveLength(3);
    expect(request.options).toMatchObject({ min: 0, max: 3 });
  });

  it("may return no Digimon because the effect says up to three", async () => {
    const s = setupEngine({
      0: { battleArea: ["BT2-021"], hand: [{ card: "BT2-095", as: "option" }] },
      1: { battleArea: [{ card: "BT2-033", as: "target" }] },
    });
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});
