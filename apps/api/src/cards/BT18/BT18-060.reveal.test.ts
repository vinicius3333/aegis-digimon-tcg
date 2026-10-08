import { getCardDefinition, type Filter, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { definitionMatches } from "../../engine/effects/interpreter.js";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-060.js";

const textFilter: Filter = { nameOrTrait: [{ tokens: ["Vemmon"], match: "text" }] };

describe("Discord 1557855696114946230 — printed text eligibility", () => {
  it.each(["BT11-061", "BT18-065", "EX11-066"])("recognizes Vemmon in canonical %s text", (cardId) => {
    const definition = getCardDefinition(cardId)!;
    expect(definition.effectText).toContain("Vemmon");
    expect(definitionMatches(textFilter, definition)).toBe(true);
  });

  it("Q4366 includes the name in text matching, rather than requiring an effect-text mention", () => {
    // Isolate the name field at the matching seam; this is not a printed-card fixture.
    const filler = getCardDefinition("BT1-009")!;
    expect(definitionMatches(textFilter, filler)).toBe(false);
    expect(definitionMatches(textFilter, { ...filler, nameEn: "Vemmon" })).toBe(true);
  });
});

describe.each([0, 1] as const)("Discord 1557855696114946230 — public reveal seat %s", (seat) => {
  async function play(revealed: string[]) {
    const s = setupEngine(
      {
        [seat]: {
          hand: [{ card: "BT18-060", as: "source" }],
          deck: [
            ...revealed.map((card, index) => ({ card, as: `reveal-${index}` })),
            { card: "BT1-010", as: "unrevealed" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.turnSeat = seat;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(seat, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision !== undefined);
    return s;
  }

  type Setup = Awaited<ReturnType<typeof play>>;

  async function pick(s: Setup, candidates: number[], chosen: number, forbidden: number[] = []) {
    const request = s.decisions.at(-1)!.req;
    const id = (index: number) => s.inst(`reveal-${index}`).instanceId;
    expect(request.seat).toBe(seat);
    expect(request.kind).toBe("selectCards");
    expect(request.options).toMatchObject({
      candidateInstanceIds: candidates.map(id),
      visibleInstanceIds: [0, 1, 2].map(id),
      min: 1,
      max: 1,
    });
    for (const instanceIds of [[], ...forbidden.map((index) => [id(index)])]) {
      expect(
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds },
        }).ok,
      ).toBe(false);
      expect(s.state.pendingDecision?.decisionId).toBe(request.decisionId);
    }
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "selectCards", instanceIds: [id(chosen)] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.decisionId !== request.decisionId);
  }

  async function orderRemainder(s: Setup, order: string[]) {
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const request = s.decisions.at(-1)!.req;
    expect(request.options?.candidateInstanceIds?.slice().sort()).toEqual([...order].sort());
    expect(
      s.engine.applyIntent(seat, {
        type: "respondDecision",
        decisionId: request.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
  }

  async function finish(s: Setup, hand: number[], under: number[], bottom: number[]) {
    const id = (index: number) => s.inst(`reveal-${index}`).instanceId;
    if (bottom.length > 1) await orderRemainder(s, bottom.map(id));
    await settle(
      () => s.state.pendingDecision === undefined && s.state.players[seat]!.deck.length === bottom.length + 1,
    );
    await settle();
    const player = s.state.players[seat]!;
    expect(player.hand.map((card) => card.instanceId)).toEqual(hand.map(id));
    expect(s.perm("source").stack.map((card) => card.instanceId)).toEqual(under.map(id));
    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("unrevealed").instanceId, ...bottom.map(id)]);
    expect(player.deck.every((card) => !card.faceUp)).toBe(true);
    expect(s.state.memory).toBe(7);
    expect(s.state.turnSeat).toBe(seat);
    expect(s.state.players[(1 - seat) as Seat]!.hand).toHaveLength(0);
    // Every revealed physical card reaches exactly one destination, including duplicate card numbers.
    const destinations = [...player.hand, ...s.perm("source").stack, ...player.deck.slice(1)];
    expect(destinations.map((card) => card.instanceId).sort()).toEqual([0, 1, 2].map(id).sort());
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toEqual(
      [0, 1, 2].map((index) =>
        expect.objectContaining({
          kind: "cardRevealed",
          seat,
          cardId: s.inst(`reveal-${index}`).cardId,
          sourceCardId: "BT18-060",
        }),
      ),
    );
    expect(s.decisions.some(({ req }) => req.kind === "optional")).toBe(false);
    assertNoLoudGap(s);
  }

  it.each([0, 1])(
    "Q2992 reserves the only Vemmon in the logged reveal while hand choice %s remains legal",
    async (hand) => {
      const s = await play(["BT18-065", "EX11-066", "BT11-061"]);
      // Exact reported pool: BT11 matches text, but taking it would prevent the mandatory source placement.
      await pick(s, [0, 1], hand, [2]);
      await pick(s, [2], 2, [hand]);
      await finish(s, [hand], [2], [1 - hand]);
      expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
    },
  );

  it.each([0, 1])("allows BT11-061 copy %s into hand when the other copy can fill the source slot", async (hand) => {
    const s = await play(["BT11-061", "BT11-061", "BT1-009"]);
    await pick(s, [0, 1], hand, [2]);
    await pick(s, [1 - hand], 1 - hand, [hand, 2]);
    await finish(s, [hand], [1 - hand], [2]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(2);
  });

  it("adds a sole BT11-061 to hand without duplicating it as a source, then respects remainder ordering", async () => {
    const s = await play(["BT11-061", "BT1-009", "BT1-011"]);
    await pick(s, [0], 0, [1, 2]);
    await finish(s, [0], [], [2, 1]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("adds a non-Vemmon with Vemmon text when no named source is available", async () => {
    const s = await play(["EX11-066", "BT1-009", "BT1-011"]);
    await pick(s, [0], 0, [1, 2]);
    await finish(s, [0], [], [2, 1]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(1);
  });

  it("returns all nonmatching cards in the chosen order without inventing a hand or source result", async () => {
    const s = await play(["BT1-009", "BT1-010", "BT1-011"]);
    await finish(s, [], [], [2, 0, 1]);
    expect(s.decisions.filter(({ req }) => req.kind === "selectCards")).toHaveLength(0);
  });
});
