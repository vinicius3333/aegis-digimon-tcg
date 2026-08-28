import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT10-058.js";

describe("BT10-058 Monitamon", () => {
  it("matches its catalog and encodes separate Twilight and black-name slots", () => {
    const d = getCardDefinition("BT10-058")!;
    expect([d.colors, d.level, d.playCost, d.dp]).toEqual([["Black"], 3, 3, 2000]);
    expect(d.evoCosts).toEqual([{ color: "Black", level: 2, memoryCost: 0 }]);
    expect([d.forms, d.attributes, d.types]).toEqual([["Rookie"], ["Data"], ["CRT", "Twilight", "Xros Heart"]]);
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const action = compiled.effects[0]!.actions[0]!;
    expect(action.kind).toBe("RevealAdd");
    if (action.kind !== "RevealAdd") throw new Error("expected RevealAdd");
    expect(action.add).toHaveLength(2);
    expect(action.add.map(({ count }) => count)).toEqual([1, 1]);
  });

  it("adds two eligible black Twilight cards from four revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-058", as: "source" }],
          deck: [{ card: "BT10-061", as: "one" }, { card: "BT10-066", as: "two" }, "BT10-062", "BT10-064"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.hand.some((c) => c.instanceId === s.inst("one").instanceId));
    expect(player.hand.some((c) => c.instanceId === s.inst("two").instanceId)).toBe(true);
    expect(player.deck).toHaveLength(2);
  });

  it("may assign a dual-qualified card to Twilight and add only it (Q1985)", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT10-058", as: "source" }],
        deck: [
          { card: "BT10-061", as: "first" },
          { card: "BT10-005", as: "secondTwilight" },
          { card: "BT5-042", as: "yellowKnightmon" },
          { card: "BT10-064", as: "ineligible" },
        ],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const pending = s.state.pendingDecision!;
    const request = s.decisions.find(({ req }) => req.decisionId === pending.decisionId)!.req;
    expect(request.sourceCardId).toBe("BT10-058");
    expect(request.options).toMatchObject({ min: 1, max: 1 });
    expect(new Set(request.options?.candidateInstanceIds)).toEqual(
      new Set([s.inst("first").instanceId, s.inst("secondTwilight").instanceId]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("first").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("first").instanceId]);
    assertNoLoudGap(s);
  });

  it("adds the only eligible card and bottoms the other three", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-058", as: "source" }],
          deck: [
            { card: "BT10-066", as: "eligible" },
            { card: "BT5-042", as: "yellowKnightmon" },
            "BT10-062",
            "BT10-064",
          ],
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
    await settle(
      () =>
        s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("eligible").instanceId) &&
        s.state.players[0]!.deck.length === 3,
    );

    expect(s.state.players[0]!.hand).toHaveLength(1);
    assertNoLoudGap(s);
  });
});
