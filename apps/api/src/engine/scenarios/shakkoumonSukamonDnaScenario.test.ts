import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "../testkit/harness.js";

async function start(yellowOnly = false) {
  const s = setupEngine({ 0: {}, 1: {} }, { autoAcceptOptional: true, autoSelectCards: true });
  layDevScenario(
    yellowOnly
      ? "arena-discord-1557575147119054889-shakkoumon-yellow-only"
      : "arena-discord-1557575147119054889-shakkoumon-sukamon",
    s.state,
    [BLUE_DECK, RED_DECK],
  );
  const loop = s.engine.startTurnLoop();
  await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return { s, loop };
}

async function finish({ s, loop }: Awaited<ReturnType<typeof start>>) {
  expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
  await loop;
  assertNoLoudGap(s);
}

describe("Discord 1557575147119054889 — playable Shakkoumon legality arenas", () => {
  it.each([
    ["EX13-028", "BT11-040", "EX5-046"],
    ["EX13-028", "EX5-046", "BT11-040"],
    ["BT11-040", "EX5-046", "EX13-028"],
  ])("DNA merges %s + %s and preserves unselected %s in a real turn loop", async (a, b, leftover) => {
    const run = await start();
    const { s } = run;
    try {
      const result = s.state.players[0]!.hand.find((c) => c.cardId === "BT23-032")!;
      const board = [...s.state.players[0]!.battleArea];
      const selected = [a, b].map((id) => board.find((p) => p.topCard.cardId === id)!);
      expect(
        result.dnaDigivolveRoutes.some((route) => {
          const materialIds: string[] = JSON.parse(route.materialPermanentIdsJson);
          return (
            materialIds.length === 2 &&
            selected.every((p) => materialIds.includes(p.permanentId)) &&
            route.projectedCost === 0
          );
        }),
      ).toBe(true);
      expect(s.state.memory).toBe(0);
      const handSize = s.state.players[0]!.hand.length;
      const deckSize = s.state.players[0]!.deck.length;
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: result.instanceId,
          materialPermanentIds: selected.map((p) => p.permanentId).reverse(),
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === "BT23-032") &&
          s.state.pendingDecision === undefined,
      );
      const evolved = s.state.players[0]!.battleArea.find((p) => p.topCard.instanceId === result.instanceId)!;
      expect(s.state.players[0]!.battleArea).toHaveLength(2);
      expect(s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === leftover)).toBe(
        board.find((p) => p.topCard.cardId === leftover),
      );
      expect(evolved.stack.map((c) => c.instanceId).sort()).toEqual(selected.map((p) => p.topCard.instanceId).sort());
      expect(evolved.isSuspended).toBe(false);
      expect(s.state.players[0]!.hand).toHaveLength(handSize);
      expect(s.state.players[0]!.deck).toHaveLength(deckSize - 1);
      expect(s.state.players[0]!.trash).toHaveLength(0);
      expect(s.state.memory).toBe(0);
    } finally {
      await finish(run);
    }
  });

  it("yellow-only control projects no route and rejects the same public DNA without mutation", async () => {
    const run = await start(true);
    const { s } = run;
    try {
      const result = s.state.players[0]!.hand.find((c) => c.cardId === "BT23-032")!;
      const before = [...s.state.players[0]!.battleArea];
      const hand = [...s.state.players[0]!.hand];
      expect(result.dnaDigivolveRoutes).toHaveLength(0);
      expect(
        s.engine.applyIntent(0, {
          type: "dnaDigivolve",
          instanceId: result.instanceId,
          materialPermanentIds: before.map((p) => p.permanentId),
        }),
      ).toEqual({ ok: false, reason: "invalid-evolution" });
      expect([...s.state.players[0]!.battleArea]).toEqual(before);
      expect([...s.state.players[0]!.hand]).toEqual(hand);
      expect(s.state.memory).toBe(0);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      await finish(run);
    }
  });
});
