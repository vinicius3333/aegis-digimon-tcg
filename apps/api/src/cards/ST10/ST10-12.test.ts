import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-12.js";

describe("ST10-12 LadyDevimon", () => {
  it("may trash a hand card to add one yellow and one purple Angel-trait card", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-09", as: "base" }],
          hand: [
            { card: "ST10-12", as: "lady" },
            { card: "ST10-07", as: "cost" },
          ],
          deck: [
            { card: "BT1-001", as: "evolutionDraw" },
            { card: "ST10-05", as: "yellow" },
            { card: "BT3-088", as: "purple" },
            { card: "ST10-07", as: "rest" },
          ],
        },
      },
      { autoAcceptOptional: true, autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.players[0]!.deck.length === 1 &&
        s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId),
    );
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual(
      expect.arrayContaining([s.inst("yellow").instanceId, s.inst("purple").instanceId]),
    );
    expect(s.state.players[0]!.trash.some((c) => c.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("rest").instanceId);
  });

  it("requires the yellow and purple additions after its optional trash cost is paid (Q745)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-09", as: "base" }],
          hand: [
            { card: "ST10-12", as: "lady" },
            { card: "ST10-07", as: "cost" },
          ],
          deck: [
            { card: "BT1-001", as: "evolutionDraw" },
            { card: "ST10-05", as: "yellowA" },
            { card: "BT1-053", as: "yellowB" },
            { card: "ST10-07", as: "purple" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activation = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const costDecision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costDecision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("cost").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      if (s.state.pendingDecision?.kind !== "selectCards") return false;
      const payload = JSON.parse(s.state.pendingDecision.payloadJson) as { candidateInstanceIds?: string[] };
      return payload.candidateInstanceIds?.includes(s.inst("yellowA").instanceId) === true;
    });
    const yellowChoice = s.state.pendingDecision!;
    expect(JSON.parse(yellowChoice.payloadJson)).toMatchObject({ min: 1, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: yellowChoice.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }),
    ).toEqual({ ok: false, reason: "decision-pending" });
  });

  it("does not reveal cards when its optional hand-trash cost is declined (Q744)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST10-09", as: "base" }],
          hand: [
            { card: "ST10-12", as: "lady" },
            { card: "ST10-07", as: "cost" },
          ],
          deck: [
            { card: "BT1-001", as: "evolutionDraw" },
            { card: "ST10-05", as: "yellow" },
            { card: "ST10-07", as: "purple" },
            { card: "BT1-002", as: "rest" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lady").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activation = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("yellow").instanceId,
      s.inst("purple").instanceId,
      s.inst("rest").instanceId,
    ]);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(false);
  });

  it("gives all of your yellow Digimon Retaliation during your turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST10-13", as: "host", under: ["ST10-12"] },
            { card: "ST10-02", as: "yellow" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Retaliation")).toBe(true);
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("yellow"), "Retaliation")).toBe(false);
  });
});
