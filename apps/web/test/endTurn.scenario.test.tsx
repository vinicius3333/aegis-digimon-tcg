// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "./scenarioHarness/testingLibrary";
import { endBreedingStep, waitForBoardActions } from "./scenarioHarness/breedingStep";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

/**
 * Proves historical migration ledger behavioral scenario "end-turn":
 * ending the phase/turn through the real UI flips the rendered turn indicator to
 * the opponent, and flips back once the opponent passes their own turn headlessly
 *.
 */
scenario("end-turn", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterEach(() => cleanup());

  afterAll(async () => {
    cleanup();
    await server.close();
    vi.unstubAllEnvs();
  });

  it("ending the turn flips the turn indicator to the opponent and back", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    // Seed 4: seat 0 (protagonist, RED_DECK) goes first (mulligan.scenario.test.tsx
    // / playDigimon.scenario.test.tsx share it).
    const joinOptions: AegisJoinOptions & { seed?: number } = {
      displayName: "Protagonist",
      deck: { mainDeck: RED_DECK.mainDeck, eggDeck: RED_DECK.eggDeck },
      seed: 4,
    };

    render(<GameScreen joinOptions={joinOptions} identityColor="Red" startMode="casual" onExit={() => {}} />);

    await screen.findByText(/finding an opponent/i);

    const opponent = await joinHeadlessOpponent(server.endpoint, {
      displayName: "Headless Opponent",
      deck: { mainDeck: BLUE_DECK.mainDeck, eggDeck: BLUE_DECK.eggDeck },
    });
    opponent.onDecision((req) => {
      if (req.kind === "mulligan") opponent.mulligan(true);
    });
    opponent.ready();

    fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

    // The first player's breeding step opens automatically (the egg deck is
    // non-empty) and is ended on the board's own turn control.
    await endBreedingStep();

    // The turn control only reads "End phase" once the step has closed, so wait
    // for its breeding label to go — the sidebar badge reads "Your turn" for the
    // whole of the protagonist's turn, Breeding included, and can't stand in.
    await vi.waitFor(() => expect(screen.queryByRole("button", { name: /^end breeding$/i })).toBeNull(), {
      timeout: 10_000,
    });

    const startingTurn = opponent.room.state.turnCount;

    // End the protagonist's own Main phase — this passes the turn.
    await waitForBoardActions();
    fireEvent.click(screen.getByRole("button", { name: /^end phase$/i }));

    // The turn indicator flips to the opponent. A transient "Opponent's turn"
    // banner (2.5s, GameScreen.tsx's turnTransition) shares this exact text with
    // the persistent sidebar badge while it's up, so findByText's single-match
    // requirement doesn't apply here — assert via getAllByText instead.
    await vi.waitFor(() => expect(screen.getAllByText(/^Opponent's turn$/).length).toBeGreaterThan(0), {
      timeout: 10_000,
    });

    await vi.waitFor(
      () => {
        expect(opponent.room.state.turnSeat).toBe(1);
        expect(opponent.room.state.phase).toBe("Breeding");
        expect(opponent.room.state.memory).toBe(3);
        expect(opponent.room.state.pendingDecision).toBeUndefined();
      },
      { timeout: 10_000 },
    );
    opponent.endPhase();
    await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });
    opponent.endPhase();

    // ...and flips back once the headless opponent has passed their own turn.
    // The transient banner never renders bare "Your turn" (only "Your turn
    // ended"), so this is unambiguous.
    await screen.findByText(/^Your turn$/, {}, { timeout: 10_000 });
    await vi.waitFor(
      () => {
        expect(opponent.room.state.turnSeat).toBe(0);
        expect(opponent.room.state.phase).toBe("Breeding");
        expect(opponent.room.state.memory).toBe(3);
        expect(opponent.room.state.turnCount).toBe(startingTurn + 2);
      },
      { timeout: 10_000 },
    );
    await screen.findByRole("img", { name: /^memory: \+3$/i }, { timeout: 10_000 });

    await opponent.leave();
  }, 20_000);
});
