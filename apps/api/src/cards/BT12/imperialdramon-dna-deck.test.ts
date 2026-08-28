import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT12-021.js";
import "./BT12-022.js";
import "./BT12-028.js";
import "./BT12-047.js";
import "./BT12-050.js";

describe("BT12 Imperialdramon DNA deck", () => {
  it("makes both eligible Veemon search picks mandatory and exposes the full reveal", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT12-021", as: "veemon" }],
        deck: [
          { card: "BT12-028", as: "freeResult" },
          { card: "BT12-090", as: "davis" },
          { card: "BT1-009", as: "ineligible" },
        ],
      },
    });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("veemon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const first = s.state.pendingDecision!;
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT12-021");
    expect(JSON.parse(first.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("freeResult").instanceId],
      visibleInstanceIds: expect.arrayContaining([
        s.inst("freeResult").instanceId,
        s.inst("davis").instanceId,
        s.inst("ineligible").instanceId,
      ]),
      min: 1,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("freeResult").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== first.decisionId,
    );
    const second = s.state.pendingDecision!;
    expect(JSON.parse(second.payloadJson)).toMatchObject({
      candidateInstanceIds: [s.inst("davis").instanceId],
      min: 1,
      max: 1,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("davis").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId).sort()).toEqual(["BT12-028", "BT12-090"]);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId)).toEqual(["BT1-009"]);
  });

  it("makes Wormmon's available search mandatory and lets the player order the two misses", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT12-047", as: "wormmon" }],
          deck: [
            { card: "BT12-028", as: "freeResult" },
            { card: "BT1-009", as: "firstMiss" },
            { card: "BT1-010", as: "secondMiss" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("wormmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const select = s.state.pendingDecision!;
    expect(JSON.parse(select.payloadJson)).toMatchObject({ min: 1, max: 1 });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: select.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("freeResult").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const order = s.state.pendingDecision!;
    const requestedOrder = [s.inst("secondMiss").instanceId, s.inst("firstMiss").instanceId];
    expect(s.decisions.at(-1)!.req.sourceCardId).toBe("BT12-047");
    expect(JSON.parse(order.payloadJson)).toMatchObject({
      candidateInstanceIds: expect.arrayContaining(requestedOrder),
      visibleInstanceIds: expect.arrayContaining(requestedOrder),
      min: 2,
      max: 2,
    });
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: order.decisionId,
        response: { kind: "orderCards", order: requestedOrder },
      }),
    ).toEqual({ ok: true });

    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map(({ instanceId }) => instanceId).join(",") === requestedOrder.join(","),
    );
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT12-028");
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual(requestedOrder);
  });

  it("gains 2 memory when ExVeemon and Stingmon DNA digivolve into Paildramon at cost 0", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT12-022", as: "exveemon" },
          { card: "BT12-050", as: "stingmon" },
        ],
        hand: [{ card: "BT12-028", as: "paildramon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "dnaDigivolve",
        materialPermanentIds: [s.perm("exveemon").permanentId, s.perm("stingmon").permanentId],
        instanceId: s.inst("paildramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => {
      const result = s.state.players[0]!.battleArea[0];
      return (
        s.state.players[0]!.battleArea.length === 1 &&
        result?.topCard.cardId === "BT12-028" &&
        s.state.memory === 2 &&
        observe(s.engine).hasKeyword(result, "Jamming") &&
        observe(s.engine).hasPierce(result)
      );
    });

    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand).toHaveLength(1); // DNA's rule draw.
    expect(s.state.players[0]!.battleArea[0]!.stack.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT12-022", "BT12-050"]),
    );
    expect(observe(s.engine).hasKeyword(s.state.players[0]!.battleArea[0]!, "Jamming")).toBe(true);
    expect(observe(s.engine).hasPierce(s.state.players[0]!.battleArea[0]!)).toBe(true);
  });
});
