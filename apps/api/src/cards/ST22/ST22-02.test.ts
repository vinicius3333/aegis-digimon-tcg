import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

describe("ST22-02 Renamon", () => {
  it("trashes a hand card and returns an Onmyōjutsu card from trash", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: "ST22-02", as: "renamon" },
            { card: "BT1-090", as: "cost" },
          ],
          trash: [{ card: "ST22-10", as: "option" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const renamonInstanceId = s.state.players[0]!.hand.find((card) => card.cardId === "ST22-02")!.instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: renamonInstanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("option").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
  });
});

describe("ST22-02 Renamon — KB Q&A rulings", () => {
  it("lets the player decline the return after trashing a hand card for it (Q5409)", async () => {
    const s = setupEngine({
      0: {
        hand: [
          { card: "ST22-02", as: "renamon" },
          { card: "BT1-090", as: "cost" },
        ],
        trash: [{ card: "ST22-10", as: "option" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    const costId = s.inst("cost").instanceId;
    const optionId = s.inst("option").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("renamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const costDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [costId] },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "selectCards" &&
        s.state.pendingDecision.decisionId !== costDecision.decisionId,
    );
    const returnDecision = s.state.pendingDecision!;
    const offered = s.decisions.find(({ req }) => req.decisionId === returnDecision.decisionId)!.req.options;
    expect(offered?.candidateInstanceIds).toEqual([optionId]);
    expect(offered?.min).toBe(0);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: returnDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([costId, optionId]),
    );
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });
});
