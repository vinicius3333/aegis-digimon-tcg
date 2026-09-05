import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX2-049 (ADR-02=Searcher) — [Main] by suspending this Digimon, reveal the top 5 cards of
// your deck, place 1 [ADR-02 Searcher] among them under 1 of your [Mother D-Reaper]s as its bottom
// digivolution card, return the rest to the deck bottom.
// source: documented behavior.
//
// FAILS-WHEN-REVERTED: an [ADR-02 Searcher] from the revealed 5 becomes a digivolution card under
// the Mother D-Reaper AND this Digimon is suspended (the cost). A no-op leaves both unchanged.

describe("EX2-049 [Main] reveal 5 → place ADR-02 Searcher under a Mother D-Reaper, suspend self", () => {
  it("places the revealed ADR-02 Searcher under the Mother D-Reaper and suspends the source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-049", dp: 2000, as: "searcher" },
            { card: "EX2-007", dp: 13000, as: "mother" }, // Mother D-Reaper, the place-under host
          ],
          // Top 5 of deck includes an [ADR-02 Searcher] (EX2-046) to place under the Mother D-Reaper.
          deck: [{ card: "EX2-046", as: "adr" }, "BT1-009", "BT1-010", "BT1-011", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.engine.recomputeContinuousEffects();

    const searcher = s.perm("searcher");
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: searcher.topCard!.instanceId,
        effectKey: "EX2-049/ir-27-0",
      }),
    ).toEqual({ ok: true });

    const mother = s.perm("mother");
    const adr = s.inst("adr");
    await settle(() => mother.stack.some((c) => c.instanceId === adr.instanceId));

    // The ADR-02 Searcher is now a digivolution card under the Mother D-Reaper.
    expect(mother.stack.some((c) => c.instanceId === adr.instanceId)).toBe(true);
    // The source paid its suspend cost.
    expect(searcher.isSuspended).toBe(true);
  });

  it("shows all five revealed identities before choosing the Searcher", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-049", as: "source" },
            { card: "EX2-007", as: "mother" },
          ],
          deck: [
            { card: "EX2-046", as: "adr" },
            { card: "BT1-009", as: "otherOne" },
            { card: "BT1-010", as: "otherTwo" },
            { card: "BT1-011", as: "otherThree" },
            { card: "BT1-012", as: "otherFour" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: "EX2-049/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const activation = s.decisions.at(-1)!.req;
    expect(activation.kind).toBe("optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: activation.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("EX2-049");
    expect(decision.options?.candidateInstanceIds).toEqual([s.inst("adr").instanceId]);
    expect(decision.options?.visibleCards).toEqual([
      { instanceId: s.inst("adr").instanceId, cardId: "EX2-046" },
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-009" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("otherThree").instanceId, cardId: "BT1-011" },
      { instanceId: s.inst("otherFour").instanceId, cardId: "BT1-012" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("adr").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [
      s.inst("otherFour").instanceId,
      s.inst("otherTwo").instanceId,
      s.inst("otherOne").instanceId,
      s.inst("otherThree").instanceId,
    ];
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-009" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-010" },
      { instanceId: s.inst("otherThree").instanceId, cardId: "BT1-011" },
      { instanceId: s.inst("otherFour").instanceId, cardId: "BT1-012" },
    ]);
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: ordering.decisionId,
        response: { kind: "orderCards", order: bottomOrder },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === bottomOrder.join(","),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
  });

  it("returns the selected Searcher to the deck when no Mother D-Reaper exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX2-049", as: "source" }],
          deck: [{ card: "EX2-046", as: "adr" }, "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard.instanceId,
        effectKey: "EX2-049/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 5);
    expect(s.state.players[0]!.deck).toHaveLength(5);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("adr").instanceId)).toBe(true);
  });

  it("leaves the source ready and the deck and Mother unchanged when activation is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "EX2-049", as: "source" },
            { card: "EX2-007", as: "mother" },
          ],
          deck: [{ card: "EX2-046", as: "declinedAdr" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
        },
      },
      { autoDeclineOptional: true },
    );
    await s.ready();
    const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: s.perm("source").topCard!.instanceId,
        effectKey: "EX2-049/ir-27-0",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "EX2-049"));
    expect(s.perm("source").isSuspended).toBe(false);
    expect(s.perm("mother").stack).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(deckBefore);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toContain(s.inst("declinedAdr").instanceId);
  });
});
