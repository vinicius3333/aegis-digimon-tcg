import { describe, expect, it } from "vitest";
import { Encoder } from "@colyseus/schema";
import { CARD_ID_VIEW_TAG, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { buildStateView } from "../../engine/state/visibility.js";
import "./BT3-034.js";

describe("BT3-034 Lopmon", () => {
  it("may add the top security card to hand, then draws 1", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-034", as: "lopmon" }],
          security: [{ card: "BT1-009", as: "securityTop" }],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: true },
    );
    const player = s.state.players[0] as PlayerState;
    const securityTopId = s.inst("securityTop").instanceId;
    const deckTopId = s.inst("deckTop").instanceId;
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === securityTopId) &&
        player.hand.some((card) => card.instanceId === deckTopId),
    );

    expect(player.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([securityTopId, deckTopId]));
    expect(player.security).toHaveLength(0);
    expect(player.deck).toHaveLength(0);
  });

  it("leaves security and deck unchanged when the optional move is declined", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-034", as: "lopmon" }],
          security: [{ card: "BT1-009", as: "securityTop" }],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: false },
    );
    const player = s.state.players[0] as PlayerState;
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(player.security).toHaveLength(1);
    expect(player.deck).toHaveLength(1);
    expect(player.hand.some((card) => card.cardId === "BT1-009")).toBe(false);
  });
});

describe("BT3-034 Lopmon — KB Q&A rulings", () => {
  function lopmonBoard(options: { security: string[]; deck: string[]; autoAcceptOptional: boolean }) {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT3-034", as: "lopmon" }],
          security: options.security.map((card, index) => ({ card, as: `security${index}` })),
          deck: options.deck.map((card, index) => ({ card, as: `deck${index}` })),
        },
      },
      { autoAcceptOptional: options.autoAcceptOptional },
    );
    s.state.memory = 5;
    return { s, player: s.state.players[0] as PlayerState };
  }

  async function playLopmonAndAnswer(s: ReturnType<typeof setupEngine>, accept: boolean): Promise<void> {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
  }

  it("returns a checked security card that is not added to hand to the top of security face down (Q1068)", async () => {
    const { s, player } = lopmonBoard({
      security: ["BT1-009", "BT1-085"],
      deck: ["BT1-010"],
      autoAcceptOptional: false,
    });
    const checkedId = s.inst("security0").instanceId;
    // A prior effect left the top security card face up; the ruling returns it face down.
    player.security[0]!.faceUp = true;

    await playLopmonAndAnswer(s, false);

    expect(player.security.map((card) => card.instanceId)).toEqual([checkedId, s.inst("security1").instanceId]);
    expect(player.security[0]!.faceUp).toBe(false);
    expect(player.hand.some((card) => card.instanceId === checkedId)).toBe(false);
    expect(player.deck).toHaveLength(1);
  });

  it("adds the checked security card to hand without revealing it to the opponent (Q1069)", async () => {
    const { s, player } = lopmonBoard({ security: ["BT1-009"], deck: ["BT1-010"], autoAcceptOptional: false });
    const checkedId = s.inst("security0").instanceId;

    await playLopmonAndAnswer(s, true);

    const addedCard = player.hand.find((card) => card.instanceId === checkedId);
    expect(addedCard).toBeDefined();
    expect(s.events.filter((event) => event.kind === "cardRevealed")).toEqual([]);
    // eslint-disable-next-line no-new -- constructing the Encoder wires the schema root so per-seat views can be built.
    new Encoder(s.state);
    const ownerView = buildStateView(s.state, 0);
    const opponentView = buildStateView(s.state, 1);
    expect(ownerView.hasTag(addedCard!, CARD_ID_VIEW_TAG)).toBe(true);
    expect(opponentView.has(addedCard!)).toBe(false);
    expect(opponentView.hasTag(addedCard!, CARD_ID_VIEW_TAG)).toBe(false);
  });

  it("does not <Draw 1> when the security stack is empty (Q1070)", async () => {
    const { s, player } = lopmonBoard({ security: [], deck: ["BT1-010"], autoAcceptOptional: true });
    const deckTopId = s.inst("deck0").instanceId;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lopmon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && player.battleArea.length === 1);

    expect(player.hand.some((card) => card.instanceId === deckTopId)).toBe(false);
    expect(player.deck.map((card) => card.instanceId)).toEqual([deckTopId]);
    expect(player.security).toHaveLength(0);
  });

  it("still adds the top security card to hand when the deck is empty and <Draw 1> cannot happen (Q1071)", async () => {
    const { s, player } = lopmonBoard({ security: ["BT1-009"], deck: [], autoAcceptOptional: false });
    const checkedId = s.inst("security0").instanceId;

    await playLopmonAndAnswer(s, true);

    expect(player.hand.map((card) => card.instanceId)).toEqual([checkedId]);
    expect(player.security).toHaveLength(0);
    expect(player.deck).toHaveLength(0);
    expect(s.state.winnerSeat).toBe(-1);
  });
});
