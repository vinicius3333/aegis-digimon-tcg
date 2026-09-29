import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST10-08.js";

describe("ST10-08 Tsukaimon", () => {
  it("adds an Angel-trait card from the revealed top 3", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST10-08", as: "tsukaimon" }],
          deck: [
            { card: "ST10-05", as: "angel" },
            { card: "ST10-07", as: "rest1" },
            { card: "ST10-11", as: "rest2" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsukaimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((c) => c.instanceId === s.inst("angel").instanceId));
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("rest1").instanceId,
      s.inst("rest2").instanceId,
    ]);
  });

  it("bottoms all three revealed cards when none has an eligible trait", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "ST10-08", as: "tsukaimon" }],
          deck: [
            { card: "ST10-07", as: "first" },
            { card: "ST10-11", as: "second" },
            { card: "ST10-02", as: "third" },
          ],
        },
      },
      { autoOrderTriggers: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsukaimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["ST10-07", "ST10-11", "ST10-02"]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });
});

type TsukaimonDeckEntry = { card: string; as: string };

function playTsukaimon(deck: TsukaimonDeckEntry[]) {
  const s = setupEngine({ 0: { hand: [{ card: "ST10-08", as: "tsukaimon" }], deck } }, { autoOrderTriggers: true });
  s.state.memory = 3;
  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tsukaimon").instanceId })).toEqual({
    ok: true,
  });
  return s;
}

function revealedCardIds(s: ReturnType<typeof playTsukaimon>): string[] {
  return s.events.flatMap((event) =>
    event.kind === "cardRevealed" && event.sourceCardId === "ST10-08" ? [event.cardId] : [],
  );
}

describe("ST10-08 Tsukaimon — KB Q&A rulings", () => {
  it("must reveal exactly the top 3 cards, or every card when fewer than 3 remain (Q739)", async () => {
    const full = playTsukaimon([
      { card: "ST10-07", as: "first" },
      { card: "ST10-11", as: "second" },
      { card: "ST10-05", as: "third" },
      { card: "ST10-05", as: "fourth" },
    ]);
    await settle(() => full.state.pendingDecision?.kind === "selectCards");
    const payload = JSON.parse(full.state.pendingDecision!.payloadJson) as { visibleInstanceIds: string[] };
    expect(payload.visibleInstanceIds).toEqual([
      full.inst("first").instanceId,
      full.inst("second").instanceId,
      full.inst("third").instanceId,
    ]);
    expect(revealedCardIds(full)).toEqual(["ST10-07", "ST10-11", "ST10-05"]);

    const short = playTsukaimon([
      { card: "ST10-07", as: "first" },
      { card: "ST10-05", as: "second" },
    ]);
    await settle(() => short.state.pendingDecision?.kind === "selectCards");
    const shortPayload = JSON.parse(short.state.pendingDecision!.payloadJson) as { visibleInstanceIds: string[] };
    expect(shortPayload.visibleInstanceIds).toEqual([short.inst("first").instanceId, short.inst("second").instanceId]);
    expect(revealedCardIds(short)).toEqual(["ST10-07", "ST10-05"]);
  });

  it("must add a revealed card with an Angel, Archangel, or Fallen Angel trait to hand (Q740)", async () => {
    const s = playTsukaimon([
      { card: "ST10-12", as: "fallenAngel" },
      { card: "ST10-05", as: "archangel" },
      { card: "ST10-07", as: "ghost" },
    ]);
    await settle(() => s.state.pendingDecision?.kind === "selectCards");
    const decision = s.state.pendingDecision!;
    const payload = JSON.parse(decision.payloadJson) as { candidateInstanceIds: string[]; min: number };
    expect(payload.candidateInstanceIds).toEqual([s.inst("fallenAngel").instanceId, s.inst("archangel").instanceId]);
    expect(payload.min).toBe(1);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [] },
      }).ok,
    ).toBe(false);
    expect(s.state.pendingDecision?.decisionId).toBe(decision.decisionId);
    expect(s.state.players[0]!.hand).toHaveLength(0);

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("fallenAngel").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("fallenAngel").instanceId]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId).sort()).toEqual(["ST10-05", "ST10-07"]);
  });
});
