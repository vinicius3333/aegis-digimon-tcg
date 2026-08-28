import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import type { PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-087.js";

describe("BT1-087 T.K. Takaishi", () => {
  it("sets memory to 3 at the start of its owner's turn when memory is 2 or less", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-087", as: "takeru" }] } });
    s.state.memory = 2;
    await advance(s.engine).fire(EffectTiming.OnStartTurn, s.perm("takeru"));
    expect(s.state.memory).toBe(3);
  });

  it("does not lower memory already at 3 and does not apply during the opponent's turn", async () => {
    const atThree = setupEngine({ 0: { battleArea: [{ card: "BT1-087", as: "takeru" }] } });
    atThree.state.memory = 3;
    await advance(atThree.engine).fire(EffectTiming.OnStartTurn, atThree.perm("takeru"));
    expect(atThree.state.memory).toBe(3);

    const opponentTurn = setupEngine({ 0: { battleArea: [{ card: "BT1-087", as: "takeru" }] } });
    opponentTurn.state.turnSeat = 1;
    opponentTurn.state.memory = 1;
    await advance(opponentTurn.engine).fire(EffectTiming.OnStartTurn, opponentTurn.perm("takeru"));
    expect(opponentTurn.state.memory).toBe(1);
  });

  it("chooses a yellow card from security, adds it to hand, then recovers from deck", async () => {
    const preferredSelection: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-087", as: "takeru" }],
          // The yellow card is deliberately not on top: this proves the effect searches the
          // whole stack rather than silently taking the top card.
          security: [
            { card: "BT1-009", as: "topRed" },
            { card: "BT1-087", as: "yellowChoice" },
          ],
          deck: [{ card: "BT1-010", as: "recovery" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferredSelection },
    );
    const player = s.state.players[0] as PlayerState;
    const yellowChoiceId = s.inst("yellowChoice").instanceId;
    const recoveryId = s.inst("recovery").instanceId;
    preferredSelection.push(yellowChoiceId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.hand.some((card) => card.instanceId === yellowChoiceId) &&
        player.security.some((card) => card.instanceId === recoveryId),
    );

    expect(player.hand.some((card) => card.instanceId === yellowChoiceId)).toBe(true);
    expect(player.security.some((card) => card.instanceId === yellowChoiceId)).toBe(false);
    expect(player.security.some((card) => card.instanceId === recoveryId)).toBe(true);
    expect(player.security).toHaveLength(2); // selected card leaves, then Recovery +1 replaces it
    expect(player.deck).toHaveLength(0);
  });

  it("reveals every security card with its identity and recovers the deck top without a second selection", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT1-087", as: "takeru" }],
        security: [
          { card: "BT1-009", as: "redChoice" },
          { card: "BT1-087", as: "yellowChoice" },
        ],
        deck: [{ card: "BT1-010", as: "recovery" }, "BT1-011"],
      },
    });
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("takeru").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "selectCards");

    const pending = s.state.pendingDecision!;
    const payload = JSON.parse(pending.payloadJson) as {
      candidateInstanceIds?: string[];
      visibleCards?: Array<{ instanceId: string; cardId: string }>;
    };
    expect(payload.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.inst("redChoice").instanceId, s.inst("yellowChoice").instanceId]),
    );
    expect(payload.visibleCards).toEqual(
      expect.arrayContaining([
        { instanceId: s.inst("redChoice").instanceId, cardId: "BT1-009" },
        { instanceId: s.inst("yellowChoice").instanceId, cardId: "BT1-087" },
      ]),
    );

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: pending.decisionId,
        response: { kind: "selectCards", instanceIds: [s.inst("yellowChoice").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId));
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-011"]);
  });

  it("adds a non-yellow security card without recovering, then shuffles security (Q952)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT1-087", as: "takeru" }],
          security: [
            { card: "BT1-009", as: "redChoice" },
            { card: "BT1-087", as: "yellow" },
          ],
          deck: [{ card: "BT1-010", as: "deckTop" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("redChoice").instanceId);
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("redChoice").instanceId));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("yellow").instanceId);
    expect(s.state.players[0]!.deck[0]!.instanceId).toBe(s.inst("deckTop").instanceId);
  });

  it("does nothing on play when the security stack is empty", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT1-087", as: "takeru" }] } });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("takeru").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.instanceId === s.inst("takeru").instanceId),
    );

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("plays itself from security without paying its cost", async () => {
    const s = setupEngine({ 0: { security: [{ card: "BT1-087", as: "securityTk", faceUp: true }] } });

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityTk"));

    expect(
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("securityTk").instanceId,
      ),
    ).toBe(true);
  });
});
