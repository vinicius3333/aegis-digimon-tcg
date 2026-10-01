import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle, type CardSpec, type EngineSetup } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-046.js";

describe("BT10-046 Palmon", () => {
  it("matches the catalog and encodes two mandatory reveal buckets", () => {
    const d = getCardDefinition("BT10-046")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Green"], 3, 3, 2000]);
    expect(d.evoCosts).toEqual([{ color: "Green", level: 2, memoryCost: 0 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Rookie"], ["Data"], ["Vegetation"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      expect.objectContaining({
        trigger: "OnPlay",
        actions: [
          expect.objectContaining({ kind: "RevealAdd", revealCount: 4, rest: "deckBottom", add: expect.any(Array) }),
        ],
      }),
    ]);
    const reveal = compiled.effects[0]!.actions[0]!;
    expect(reveal.kind).toBe("RevealAdd");
    if (reveal.kind !== "RevealAdd") throw new Error("expected RevealAdd");
    expect(reveal.add).toHaveLength(2);
    expect(reveal.add.map(({ count, to }) => [count, to])).toEqual([
      [1, "hand"],
      [1, "hand"],
    ]);
  });

  it("adds a Vegetation and a Fairy card from four revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-046", as: "source" }],
          deck: [{ card: "BT10-043", as: "vegetation" }, { card: "BT10-056", as: "fairy" }, "BT10-044", "BT10-045"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("vegetation").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("fairy").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
    assertNoLoudGap(s);
  });

  it("accepts Carnivorous Plant for Q1971 and must also add the Fairy card", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-046", as: "source" }],
          deck: [{ card: "BT1-071", as: "plant" }, { card: "BT10-056", as: "fairy" }, "BT10-044", "BT10-045"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.deck.length === 2);

    expect(new Set(s.state.players[0]!.hand.map(({ instanceId }) => instanceId))).toEqual(
      new Set([s.inst("plant").instanceId, s.inst("fairy").instanceId]),
    );
    assertNoLoudGap(s);
  });

  it("adds the only eligible category card and bottoms the other three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-046", as: "source" }],
          deck: [{ card: "BT1-071", as: "plant" }, "BT10-044", "BT10-045", "BT10-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("plant").instanceId));

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    assertNoLoudGap(s);
  });
});

describe("BT10-046 Palmon — KB Q&A rulings", () => {
  function playPalmon(deck: CardSpec[]) {
    const s = setupEngine({ 0: { hand: [{ card: "BT10-046", as: "source" }], deck } }, { autoSelectCards: false });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    return s;
  }

  function handIds(s: EngineSetup): string[] {
    return s.state.players[0]!.hand.map(({ instanceId }) => instanceId);
  }

  it("still adds the one Fairy card when it is the only qualifying card among the four revealed (Q1972)", async () => {
    const s = playPalmon(["BT10-044", { card: "BT10-056", as: "fairy" }, "BT10-045", "BT1-064"]);

    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT10-046");
    expect(decision.options?.candidateInstanceIds).toEqual([s.inst("fairy").instanceId]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("fairy").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => handIds(s).includes(s.inst("fairy").instanceId));

    expect(handIds(s)).toEqual([s.inst("fairy").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(3);
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT1-064", "BT10-044", "BT10-045"]);
    assertNoLoudGap(s);
  });

  it("must add both the Vegetation and the Fairy card when both are revealed (Q1973)", async () => {
    const s = playPalmon([
      { card: "BT10-043", as: "vegetation" },
      { card: "BT10-056", as: "fairy" },
      "BT10-044",
      "BT10-045",
    ]);

    for (const alias of ["vegetation", "fairy"]) {
      await settle(
        () =>
          s.state.pendingDecision?.kind === "selectCards" &&
          s.decisions.at(-1)!.req.options?.candidateInstanceIds?.includes(s.inst(alias).instanceId),
      );
      const decision = s.decisions.at(-1)!.req;
      expect(decision.sourceCardId).toBe("BT10-046");
      expect(decision.options?.min).toBe(1);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "selectCards", instanceIds: [] },
        }).ok,
      ).toBe(false);
      expect(s.state.pendingDecision?.decisionId).toBe(decision.decisionId);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "selectCards", instanceIds: [s.inst(alias).instanceId] },
        }),
      ).toEqual({ ok: true });
    }
    await settle(() => s.state.players[0]!.hand.length === 2 && s.state.players[0]!.deck.length === 2);

    expect(new Set(handIds(s))).toEqual(new Set([s.inst("vegetation").instanceId, s.inst("fairy").instanceId]));
    expect(s.state.players[0]!.deck.map(({ cardId }) => cardId).sort()).toEqual(["BT10-044", "BT10-045"]);
    assertNoLoudGap(s);
  });
});
