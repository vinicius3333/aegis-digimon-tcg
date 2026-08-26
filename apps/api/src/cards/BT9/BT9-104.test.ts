import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT9-064.js";
import { compiled } from "./BT9-104.js";
import "./BT9-104.js";

describe("BT9-104 X Digivolution!", () => {
  it("matches catalog values and waiver, reveal-digivolve, and security IR", () => {
    expect(getCardDefinition("BT9-104")).toMatchObject({
      colors: ["Black"], kinds: ["Option"], playCost: 3, types: ["X Antibody"],
      securityEffectText: "[Security] You may reveal the top 3 cards of your deck. Add 1 card with [X Antibody] in its traits among them to your hand. Trash the rest.",
    });
    expect(compiled).toMatchObject({
      coverage: "full", residual: [], effects: [
        {
          trigger: "Static",
          actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } } }],
        },
        {
          trigger: "Main",
          actions: [
            { kind: "RevealAdd", revealCount: 3, add: [{ to: "digivolve", optional: true, digivolveTarget: { filter: { kind: ["Digimon"] }, count: 1 } }], rest: "trash" },
            { kind: "PlaceUnder", target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } }, underFilter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] } },
          ],
        },
        { trigger: "Security", isSecurity: true, actions: [{ kind: "RevealAdd", optional: true, revealCount: 3, rest: "trash" }] },
      ],
    });
  });

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
            { card: "BT1-009", as: "miss" },
            { card: "BT1-010", as: "bonusDraw" },
          ],
        },
      },
      { autoSelectCards: true, autoAcceptOptional: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("evolution").instanceId, s.inst("placedUnder").instanceId, s.perm("base").permanentId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
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
            { card: "BT1-009", as: "initialMiss" },
            { card: "BT1-010", as: "bonusDraw" },
            { card: "BT6-111", as: "alphamon" },
            { card: "BT9-068", as: "grademonX" },
            { card: "BT1-011", as: "grademonMiss" },
          ],
        },
      },
      { autoOrderTriggers: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("option").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const evolutionChoice = s.decisions.at(-1)!.req;
    expect(evolutionChoice.sourceCardId).toBe("BT9-104");
    expect(evolutionChoice.options).toMatchObject({ min: 0, max: 1 });
    expect(evolutionChoice.options?.visibleCards).toEqual([
      { instanceId: s.inst("evolution").instanceId, cardId: "BT9-064" },
      { instanceId: s.inst("incompatibleX").instanceId, cardId: "BT9-008" },
      { instanceId: s.inst("initialMiss").instanceId, cardId: "BT1-009" },
    ]);
    expect(evolutionChoice.options?.candidateInstanceIds).toEqual([s.inst("evolution").instanceId]);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: evolutionChoice.decisionId,
        response: {
          kind: "selectCards",
          instanceIds: [s.inst("evolution").instanceId],
        },
      }),
    ).toEqual({ ok: true });

    await settle(() => {
      const decision = s.decisions.at(-1)?.req;
      return decision?.kind === "selectCards" && decision.sourceCardId === "BT9-064";
    });

    // KB Q1911/Q5976: the bonus draw comes from the unrevealed deck, the
    // non-X-Antibody remainder is trashed, and the unchosen X Antibody is
    // placed under the evolved Digimon before Grademon's When Digivolving opens.
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("bonusDraw").instanceId)).toBe(true);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(
      s.inst("initialMiss").instanceId,
    );
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toContain(
      s.inst("incompatibleX").instanceId,
    );
    expect(s.perm("base").topCard.instanceId).toBe(s.inst("evolution").instanceId);
  });
});
