import { describe, expect, it } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT10-019.js";

describe("BT10-019 Greymon", () => {
  it("adds up to two revealed [Blue Flare] cards and returns the rest to the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-019", as: "greymon" }],
          deck: [
            { card: "BT10-018", as: "gaossmon" },
            { card: "BT10-020", as: "deckerdramon" },
            { card: "BT1-009", as: "nonBlueFlareA" },
            { card: "BT1-010", as: "nonBlueFlareB" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const blueFlareIds = [s.inst("gaossmon").instanceId, s.inst("deckerdramon").instanceId];
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("greymon").instanceId })).toEqual({ ok: true });
    await settle(() => blueFlareIds.every((id) => player.hand.some((card) => card.instanceId === id)) && player.deck.length === 2);

    expect(player.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining(blueFlareIds));
    expect(player.deck.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT1-009", "BT1-010"]));
  });

  it("shows the full four-card reveal while requiring every available Blue Flare pick", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT10-019", as: "greymon" }],
          deck: [
            { card: "BT10-018", as: "blueFlareOne" },
            { card: "BT10-020", as: "blueFlareTwo" },
            { card: "BT1-009", as: "otherOne" },
            { card: "BT1-010", as: "otherTwo" },
          ],
        },
      },
      { autoOrderCards: false },
    );
    s.state.memory = 10;
    const blueFlareIds = [
      s.inst("blueFlareOne").instanceId,
      s.inst("blueFlareTwo").instanceId,
    ];

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("greymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const decision = s.decisions.at(-1)!.req;
    expect(decision.sourceCardId).toBe("BT10-019");
    expect(decision.options).toMatchObject({ min: 2, max: 2 });
    expect(decision.options?.candidateInstanceIds).toEqual(blueFlareIds);
    expect(decision.options?.visibleCards).toEqual([
      { instanceId: blueFlareIds[0]!, cardId: "BT10-018" },
      { instanceId: blueFlareIds[1]!, cardId: "BT10-020" },
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-009" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-010" },
    ]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: decision.decisionId,
      response: { kind: "selectCards", instanceIds: blueFlareIds },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");

    const ordering = s.decisions.at(-1)!.req;
    const bottomOrder = [s.inst("otherTwo").instanceId, s.inst("otherOne").instanceId];
    expect(ordering.options?.visibleCards).toEqual([
      { instanceId: s.inst("otherOne").instanceId, cardId: "BT1-009" },
      { instanceId: s.inst("otherTwo").instanceId, cardId: "BT1-010" },
    ]);
    expect(s.engine.applyIntent(0, {
      type: "respondDecision",
      decisionId: ordering.decisionId,
      response: { kind: "orderCards", order: bottomOrder },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined &&
      s.state.players[0]!.deck[0]?.instanceId === bottomOrder[0]);

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(bottomOrder);
  });

  it("may recover MetalGreymon instead of revealing when Kiriha is in play (Q1946)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT10-088", as: "kiriha" }],
          hand: [{ card: "BT10-019", as: "greymon" }],
          trash: [{ card: "BT10-024", as: "metalGreymon" }],
          deck: ["BT10-018", "BT10-020", "BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    const originalDeck = s.state.players[0]!.deck.map((card) => card.instanceId);

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("greymon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some(
      (card) => card.instanceId === s.inst("metalGreymon").instanceId,
    ));

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(originalDeck);
  });

  it("unsuspends a Blue Flare host only once per turn when the opponent has 2 Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-020", as: "attacker", under: ["BT10-019"] }],
      },
      1: {
        battleArea: [
          { card: "BT10-018", as: "firstOpponent" },
          { card: "BT10-020", as: "secondOpponent" },
        ],
        security: ["BT1-001", "BT1-002"],
      },
    });
    s.state.turnCount += 1;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[1]!.security.length === 1 &&
      !s.perm("attacker").isSuspended &&
      !observe(s.engine).isAttacking()
    );
    expect(observe(s.engine).hasAttackedThisTurn(s.perm("attacker"))).toBe(false);
    expect(s.perm("attacker").canAttackPlayer).toBe(true);

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.perm("attacker").isSuspended).toBe(true);
  });
});
