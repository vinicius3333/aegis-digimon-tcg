import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-064.js";
import "./BT9-104.js";

describe("BT9-104 X Digivolution!", () => {
  it("digivolves into a revealed X Antibody card, trashes the rest, then places one under it", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-062", as: "base" }],
          hand: [{ card: "BT9-104", as: "option" }],
          deck: [
            { card: "BT9-064", as: "evolution" },
            { card: "BT9-008", as: "placedUnder" },
            { card: "BT1-001", as: "miss" },
            { card: "BT1-002", as: "bonusDraw" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("evolution").instanceId, s.inst("placedUnder").instanceId, s.perm("base").permanentId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() =>
      s.perm("base").topCard.instanceId === s.inst("evolution").instanceId &&
      s.perm("base").stack.some((card) => card.instanceId === s.inst("placedUnder").instanceId) &&
      s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId) &&
      s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("miss").instanceId),
    );

    // The Option itself costs 3; only the revealed digivolution is free.
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
    expect(s.perm("base").stack.some((card) => card.instanceId === s.inst("placedUnder").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("miss").instanceId)).toBe(true);
  });

  it("offers only compatible revealed evolutions and trashes the rest before When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT9-062", as: "base" }],
          hand: [{ card: "BT9-104", as: "option" }],
          deck: [
            { card: "BT9-064", as: "evolution" },
            { card: "BT9-008", as: "incompatibleX" },
            { card: "BT1-001", as: "initialMiss" },
            { card: "BT1-002", as: "bonusDraw" },
            { card: "BT6-111", as: "alphamon" },
            { card: "BT9-068", as: "grademonX" },
            { card: "BT1-003", as: "grademonMiss" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("option").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const evolutionChoice = s.decisions.at(-1)!.req;
    expect(evolutionChoice.sourceCardId).toBe("BT9-104");
    expect(evolutionChoice.options).toMatchObject({ min: 0, max: 1 });
    expect(evolutionChoice.options?.visibleCards).toEqual([
      { instanceId: s.inst("evolution").instanceId, cardId: "BT9-064" },
      { instanceId: s.inst("incompatibleX").instanceId, cardId: "BT9-008" },
      { instanceId: s.inst("initialMiss").instanceId, cardId: "BT1-001" },
    ]);
    expect(evolutionChoice.options?.candidateInstanceIds).toEqual([
      s.inst("evolution").instanceId,
    ]);

    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: evolutionChoice.decisionId,
      response: {
        kind: "selectCards",
        instanceIds: [s.inst("evolution").instanceId],
      },
    })).toEqual({ ok: true });

    await settle(() => {
      const decision = s.decisions.at(-1)?.req;
      return decision?.kind === "selectCards" && decision.sourceCardId === "BT9-064";
    });

    // KB Q1911/Q5976: the bonus draw comes from the unrevealed deck, then both
    // unchosen cards are already in trash before Grademon's When Digivolving opens.
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([
        s.inst("incompatibleX").instanceId,
        s.inst("initialMiss").instanceId,
      ]),
    );
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolution").instanceId);
  });
});
