import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-020.js";

describe("BT9-020 Gabumon (X Antibody)", () => {
  it("matches the catalog, both search timings, exact X Antibody slot, and alternate evolution", () => {
    expect(getCardDefinition("BT9-020")).toMatchObject({
      nameEn: "Gabumon (X Antibody)",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      evoCosts: [{ color: "Blue", level: 2, memoryCost: 0 }],
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Beast", "X Antibody"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [
              { filter: { nameOrTrait: [{ tokens: ["Garurumon", "Omnimon"], match: "name" }] }, count: 1 },
              { filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }] }, count: 1 },
            ],
            rest: "deckBottom",
          },
        ],
      });
    }
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Gabumon"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("on play adds both mandatory categories and bottoms the remainder (Q1822)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-020", as: "source" }],
          deck: [{ card: "BT9-024", as: "garurumon" }, { card: "BT9-109", as: "xAntibody" }, "BT9-021"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("garurumon").instanceId, s.inst("xAntibody").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ids.every((id) => player.hand.some((card) => card.instanceId === id)));
    expect(player.deck).toHaveLength(1);
    expect(player.deck[0]!.cardId).toBe("BT9-021");
    expect(s.state.memory).toBe(0);
  });

  it.each([
    ["Garurumon", "BT9-024"],
    ["X Antibody", "BT9-109"],
  ])("adds the lone eligible %s category when the other category is absent (Q1821)", async (_label, match) => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-020", as: "source" }],
          deck: [{ card: match, as: "match" }, "BT9-021", "BT9-029"],
        },
      },
      { autoSelectCards: true },
    );
    const matchId = s.inst("match").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === matchId));
    expect(s.state.players[0]!.deck).toHaveLength(2);
  });

  it("rejects an empty response for either mandatory category when both are present (Q1822)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT9-020", as: "source" }],
        deck: [{ card: "BT9-024", as: "garurumon" }, { card: "BT9-109", as: "xAntibody" }, "BT9-021"],
      },
    });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const firstPending = s.state.pendingDecision!;
    const first = s.decisions.find(({ req }) => req.decisionId === firstPending.decisionId)!.req;
    expect(first.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: first.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("garurumon").instanceId] },
      }),
    ).toEqual({ ok: true });

    await settle(
      () => s.state.pendingDecision?.kind === "selectCards" && s.state.pendingDecision.decisionId !== first.decisionId,
    );
    const secondPending = s.state.pendingDecision!;
    const second = s.decisions.find(({ req }) => req.decisionId === secondPending.decisionId)!.req;
    expect(second.options?.min).toBe(1);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: second.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("xAntibody").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.deck.length === 1);
  });

  it("does not treat an X Antibody trait or longer name as the exact X Antibody card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-020", as: "source" }],
          deck: [{ card: "BT9-015", as: "traitOnly" }, "BT9-021", "BT9-029"],
        },
      },
      { autoSelectCards: true },
    );
    const traitOnlyId = s.inst("traitOnly").instanceId;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === traitOnlyId)).toBe(false);
  });

  it("uses the 0-cost Gabumon route on a legally built breeding stack and resolves When Digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-003", as: "stack" },
          hand: [
            { card: "BT1-029", as: "gabumon" },
            { card: "BT9-020", as: "gabumonX" },
          ],
          deck: [{ card: "BT9-024", as: "garurumon" }, { card: "BT9-109", as: "xAntibody" }, "BT9-021"],
        },
      },
      { autoSelectCards: true },
    );
    for (const alias of ["gabumon", "gabumonX"] as const) {
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("stack").permanentId,
          instanceId: s.inst(alias).instanceId,
          ...(alias === "gabumonX" ? { alternateRequirementIndex: 0 } : {}),
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("stack").topCard.instanceId === s.inst(alias).instanceId);
    }
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "BT9-109"));
    expect(s.state.memory).toBe(0);
    expect(s.perm("stack").stack.map((card) => card.cardId)).toEqual(["BT1-003", "BT1-029"]);
  });
});
