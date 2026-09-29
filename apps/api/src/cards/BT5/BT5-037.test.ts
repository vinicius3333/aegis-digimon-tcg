import { afterEach, describe, expect, it, vi } from "vitest";
import { Zone, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-037.js";

describe("BT5-037 Gladimon", () => {
  it("adds a Warrior from security, recovers one card and preserves security size", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-037", as: "source" }],
          security: [
            { card: "BT5-042", as: "warrior" },
            { card: "BT5-036", as: "otherSecurity" },
          ],
          deck: [{ card: "BT5-038", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    const player = s.state.players[0] as PlayerState;
    preferred.push(s.inst("warrior").instanceId);
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === s.inst("warrior").instanceId) &&
        player.security.some((card) => card.instanceId === s.inst("recovery").instanceId),
    );
    expect(player.security).toHaveLength(2);
    expect(player.deck).toHaveLength(0);
  });

  it("shows the whole security stack with identities while disabling non-Warriors", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT5-037", as: "gladimon" }],
        security: [
          { card: "BT5-042", as: "warrior" },
          { card: "BT1-009", as: "nonWarrior" },
        ],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("gladimon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const optional = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: optional.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const payload = JSON.parse(s.state.pendingDecision!.payloadJson) as {
      candidateInstanceIds: string[];
      visibleInstanceIds: string[];
      visibleCards: Array<{ instanceId: string; cardId: string }>;
    };
    expect(payload.candidateInstanceIds).toEqual([s.inst("warrior").instanceId]);
    expect(payload.visibleInstanceIds).toEqual(
      expect.arrayContaining([s.inst("warrior").instanceId, s.inst("nonWarrior").instanceId]),
    );
    expect(payload.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("warrior").instanceId, cardId: "BT5-042" },
        { instanceId: s.inst("nonWarrior").instanceId, cardId: "BT1-009" },
      ]),
    );
  });

  it("does not recover when security has no eligible Warrior", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT5-037", as: "source" }], security: ["BT1-009"], deck: ["BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});

describe("BT5-037 Gladimon — KB Q&A rulings", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets you look at the whole security stack and reveals only the card you add to hand (Q1320)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-037", as: "gladimon" }],
          security: [
            { card: "BT1-009", as: "hiddenAbove" },
            { card: "BT5-042", as: "warrior" },
            { card: "BT5-036", as: "hiddenBelow" },
          ],
          deck: [{ card: "BT5-038", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("warrior").instanceId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("warrior").instanceId));
    await settle();

    const securityLook = s.decisions.find(({ req }) => req.kind === "selectCards")!;
    expect(securityLook.seat).toBe(0);
    expect(securityLook.req.options?.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("hiddenAbove").instanceId, cardId: "BT1-009" },
        { instanceId: s.inst("warrior").instanceId, cardId: "BT5-042" },
        { instanceId: s.inst("hiddenBelow").instanceId, cardId: "BT5-036" },
      ]),
    );

    const security = s.state.players[0]!.security;
    expect(security.map((card) => card.instanceId)).toEqual(
      expect.arrayContaining([s.inst("hiddenAbove").instanceId, s.inst("hiddenBelow").instanceId]),
    );
    expect(security.every((card) => card.faceUp !== true)).toBe(true);

    const publiclyRevealedCardIds = s.events.flatMap((event) => {
      if (event.kind === "cardRevealed") return [event.cardId];
      if (event.kind === "cardsMoved" && event.to === Zone.Hand) return event.cardIds ?? [];
      return [];
    });
    expect(publiclyRevealedCardIds).toContain("BT5-042");
    expect(publiclyRevealedCardIds).not.toContain("BT1-009");
    expect(publiclyRevealedCardIds).not.toContain("BT5-036");
  });

  it("skips <Recovery +1 (Deck)> and only shuffles security when no eligible card is found (Q1321)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT5-037", as: "gladimon" }],
          security: [
            { card: "BT1-009", as: "first" },
            { card: "BT5-036", as: "second" },
            { card: "BT5-038", as: "third" },
          ],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    // Pin the shuffle so a reordered stack proves it ran; the security verb falls back to Math.random.
    s.engine.rngForSeat = () => () => 0;
    vi.spyOn(Math, "random").mockReturnValue(0);
    s.state.memory = 5;
    const player = s.state.players[0] as PlayerState;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("gladimon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("gladimon").topCard?.cardId === "BT5-037");
    await settle();

    expect(player.deck.map((card) => card.instanceId)).toEqual([s.inst("deckTop").instanceId]);
    expect(player.hand).toHaveLength(0);
    expect(player.security.map((card) => card.instanceId)).toEqual([
      s.inst("second").instanceId,
      s.inst("third").instanceId,
      s.inst("first").instanceId,
    ]);
  });
});
