import { expect } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { syncPublicCounts } from "../../engine/state/visibility.js";

/**
 * Seat 0 holds `cardId` face up at the bottom of a two-card security stack, then plays
 * EX5-027, whose [On Play] searches the stack, adds nothing, and shuffles it.
 */
export async function expectShuffleTurnsFaceUpSecurityFaceDown(cardId: string): Promise<void> {
  const s = setupEngine(
    {
      0: {
        hand: [{ card: "EX5-027", as: "shuffler" }],
        security: [
          { card: "BT1-009", as: "faceDown" },
          { card: cardId, as: "faceUp", faceUp: true },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  await s.ready();
  s.state.memory = 3;
  const securityIds = [s.inst("faceDown").instanceId, s.inst("faceUp").instanceId].sort();
  expect(s.state.players[0]!.security.map(({ faceUp }) => faceUp === true)).toEqual([false, true]);

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("shuffler").instanceId })).toEqual({
    ok: true,
  });
  await settle(
    () =>
      s.state.players[0]!.battleArea.some(({ topCard }) => topCard.cardId === "EX5-027") &&
      s.state.pendingDecision === undefined,
  );

  const security = s.state.players[0]!.security;
  expect(security.map(({ instanceId }) => instanceId).sort()).toEqual(securityIds);
  expect(security.every(({ faceUp }) => faceUp !== true)).toBe(true);
  syncPublicCounts(s.state);
  expect(s.state.players[0]!.securityView.map(({ cardId: shown }) => shown)).toEqual(["", ""]);
}

/**
 * Seat 1 holds `cardId` face up under a face-down top card. The face-up card stays revealed
 * in the public projection while it sits in the stack, still counts as security, and is
 * reached by ordinary checks in stack order.
 */
export async function expectFaceUpSecurityStaysRevealedAndCounts(cardId: string): Promise<void> {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 20_000 }] },
      1: {
        security: [
          { card: "BT1-009", as: "faceDown" },
          { card: cardId, as: "faceUp", faceUp: true },
        ],
      },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const faceUpId = s.inst("faceUp").instanceId;

  syncPublicCounts(s.state);
  expect(s.state.players[1]!.securityCount).toBe(2);
  expect(s.state.players[1]!.securityView.map(({ cardId: shown }) => shown)).toEqual(["", cardId]);

  expect(
    s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

  expect(s.state.players[1]!.security.map(({ instanceId }) => instanceId)).toEqual([faceUpId]);
  expect(s.state.players[1]!.security[0]!.faceUp).toBe(true);
  syncPublicCounts(s.state);
  expect(s.state.players[1]!.securityCount).toBe(1);
  expect(s.state.players[1]!.securityView.map(({ cardId: shown }) => shown)).toEqual([cardId]);
}

/**
 * Seat 1's only security card is `cardId`, face up. Seat 0's weaker Digimon checks it: the
 * check reveals it as usual, the security Digimon battles and wins, then it is trashed.
 */
export async function expectFaceUpSecurityChecksLikeAnyOther(cardId: string): Promise<void> {
  const s = setupEngine(
    {
      0: { battleArea: [{ card: "BT1-009", as: "attacker", dp: 3000 }] },
      1: { security: [{ card: cardId, as: "faceUp", faceUp: true }] },
    },
    { autoDeclineOptional: true, autoSelectCards: true },
  );
  await s.ready();
  const attackerId = s.perm("attacker").permanentId;

  expect(
    s.engine.applyIntent(0, { type: "attack", attackerPermanentId: attackerId, target: { kind: "player" } }),
  ).toEqual({ ok: true });
  await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

  const revealed = s.events.filter((event) => event.kind === "securityRevealed");
  const checked = s.events.filter((event) => event.kind === "securityChecked");
  expect(revealed.map((event) => event.revealedCardId)).toEqual([cardId]);
  expect(checked).toEqual([expect.objectContaining({ revealedCardId: cardId, resolution: "battle" })]);
  expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === attackerId)).toBe(false);
  expect(s.state.players[1]!.security).toHaveLength(0);
  expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("faceUp").instanceId);
}
