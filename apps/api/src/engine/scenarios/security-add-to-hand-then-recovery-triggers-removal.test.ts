import { expect, it } from "vitest";
import { observe } from "#api/engine/testkit/observe";
import { settle, setupEngine } from "#api/engine/testkit/harness";
import "#api/cards/ST23/ST23-03";
import "#api/cards/BT26/BT26-089";

it("Kyo reacts when an effect adds the top security card to the hand and then recovers", async () => {
  const s = setupEngine(
    {
      0: {
        battleArea: [{ card: "BT26-089", as: "kyo" }],
        hand: [{ card: "ST23-03", as: "cougarmon" }],
        security: [
          { card: "BT1-009", as: "top-security" },
          { card: "BT1-010", as: "second-security" },
        ],
        deck: [
          { card: "BT1-011", as: "first-deck" },
          { card: "BT1-012", as: "second-deck" },
          { card: "BT1-013", as: "third-deck" },
        ],
      },
      1: { battleArea: [{ card: "BT1-030", as: "opponent-digimon" }] },
    },
    { autoAcceptOptional: true, autoSelectCards: true },
  );
  s.state.memory = 5;
  await s.ready();
  const deckBefore = s.state.players[0]!.deck.map((card) => card.instanceId);

  expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("cougarmon").instanceId })).toEqual({
    ok: true,
  });
  await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && !s.state.pendingDecision);

  const player = s.state.players[0]!;
  expect(player.hand.map((card) => card.instanceId)).toContain(s.inst("top-security").instanceId);
  expect(player.security).toHaveLength(2);
  expect(s.perm("kyo").isSuspended).toBe(true);
  expect(s.perm("kyo").stack).toHaveLength(1);
  expect(deckBefore).toContain(s.perm("kyo").stack[0]!.instanceId);
  expect(s.perm("kyo").stack[0]!.faceUp).toBe(false);
  expect(observe(s.engine).keywordAmount(s.perm("opponent-digimon"), "SecurityAttack")).toBe(-1);
});
