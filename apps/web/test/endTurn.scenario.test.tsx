// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
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

    // Drive the headless opponent's own Breeding/Main windows with the same
    // `endPhase` intent the real UI sends, fired on every incoming state patch
    // during its turn — a redundant `endPhase` on an already-closed window is a
    // server-side no-op, so over-firing it is safe.
    opponent.room.onStateChange((state) => {
      if (state.turnSeat === 1 && (state.phase === "Breeding" || state.phase === "Main")) {
        opponent.endPhase();
      }
    });

    // End the protagonist's own Main phase — this passes the turn.
    fireEvent.click(screen.getByRole("button", { name: /^end phase$/i }));

    // The turn indicator flips to the opponent. A transient "Opponent's turn"
    // banner (2.5s, GameScreen.tsx's turnTransition) shares this exact text with
    // the persistent sidebar badge while it's up, so findByText's single-match
    // requirement doesn't apply here — assert via getAllByText instead.
    await vi.waitFor(() => expect(screen.getAllByText(/^Opponent's turn$/).length).toBeGreaterThan(0), {
      timeout: 10_000,
    });

    // ...and flips back once the headless opponent has passed their own turn.
    // The transient banner never renders bare "Your turn" (only "Your turn
    // ended"), so this is unambiguous.
    await screen.findByText(/^Your turn$/, {}, { timeout: 10_000 });

    await opponent.leave();
  }, 20_000);
});
