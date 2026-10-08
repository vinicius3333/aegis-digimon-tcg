import { Phase, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { finalRevealOf } from "./state/visibility.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle } from "./testkit/harness.js";

const TOKEN = "TOKEN-AthoRenePor-Token";

describe("#5365 playable Jesmon token removal in the actual turn loop", () => {
  it.each([0, 1] as const)(
    "Jesmon seat %s generates a token that EX9-018 removes without adding to deck",
    async (seat) => {
      const opponent = (1 - seat) as Seat;
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoOrderTriggers: true,
          declinePrompts: ["Attack with a Digimon"],
        },
      );
      layDevScenario(seat === 0 ? "arena-github5365-jesmon-token" : "arena-github5365-jesmon-token-mirrored", s.state, [
        BLUE_DECK,
        RED_DECK,
      ]);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === seat);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(seat);
        expect(
          s.engine.applyIntent(seat, {
            type: "digivolve",
            permanentId: `dev-perm-${seat}-github5365-savior`,
            instanceId: "github5365-jesmon",
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[seat]!.battleArea.some(({ topCard }) => topCard.cardId === TOKEN) &&
            s.state.pendingDecision === undefined,
        );
        const tokenId = s.state.players[seat]!.battleArea.find(({ topCard }) => topCard.cardId === TOKEN)!.topCard
          .instanceId;
        await advance(s.engine).waitForMainPhase(seat);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === opponent);
        expect(s.engine.applyIntent(opponent, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(opponent);
        const beforeDeck = s.state.players[seat]!.deck.map(({ instanceId }) => instanceId);
        expect(s.engine.applyIntent(opponent, { type: "playCard", instanceId: "github5365-metal" })).toEqual({
          ok: true,
        });
        await settle(
          () => s.state.phase === Phase.Breeding && s.state.turnSeat === seat && s.state.pendingDecision === undefined,
        );
        // The next turn drew one ordinary card; no vanished token was appended.
        expect(s.state.players[seat]!.deck.map(({ instanceId }) => instanceId)).toEqual(beforeDeck.slice(1));
        expect(s.state.players[seat]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT20-017"]);
        expect(s.state.players[seat]!.trash.some(({ instanceId }) => instanceId === tokenId)).toBe(false);
        expect(
          s.state.players[opponent]!.battleArea.find(({ topCard }) => topCard.cardId === "EX9-018")!.stack.map(
            ({ faceUp }) => faceUp,
          ),
        ).toEqual([false]);
        expect(s.engine.applyIntent(seat, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(seat);
        expect(s.engine.applyIntent(seat, { type: "surrender" })).toEqual({ ok: true });
        expect(
          finalRevealOf(s.state)
            .flatMap(({ hand, deck, eggDeck, security }) => [...hand, ...deck, ...eggDeck, ...security])
            .some(({ cardId }) => cardId === TOKEN),
        ).toBe(false);
      } finally {
        if (!s.state.gameOver) {
          if (s.state.phase === Phase.Breeding) {
            s.engine.applyIntent(s.state.turnSeat as Seat, { type: "endPhase" });
            await advance(s.engine).waitForMainPhase(s.state.turnSeat as Seat);
          }
          s.engine.applyIntent(s.state.turnSeat as Seat, { type: "surrender" });
        }
        await loop;
      }
    },
  );
});
