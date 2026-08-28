// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

/**
 * Proves historical migration ledger behavioral scenario "surrender":
 * clicking the real Sidebar "Surrender" button sends the `surrender` intent (a
 * consented leave — apps/api/src/rooms/AegisRoom.ts's `onLeave`), the server
 * declares the immediate loss (WinCheck.surrender), and the protagonist's own
 * rendered DOM shows the GameOverOverlay's "Defeat" state
 *.
 */
scenario("surrender", () => {
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

  it("surrendering through the real UI renders the Defeat game-over overlay", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    const joinOptions: AegisJoinOptions & { seed?: number } = {
      displayName: "Protagonist",
      deck: { mainDeck: RED_DECK.mainDeck, eggDeck: RED_DECK.eggDeck },
      seed: 20260711,
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
    await vi.waitFor(() => expect(opponent.room.state.phase).not.toBe("None"), { timeout: 10_000 });

    // The Sidebar's "Surrender" button is always enabled, on either seat's turn.
    fireEvent.click(await screen.findByRole("button", { name: /^surrender$/i }, { timeout: 10_000 }));

    // The server records an immediate loss for the surrendering seat
    // (WinCheck.declareLoss "surrender") — the answered-outcome proof.
    await vi.waitFor(() => expect(opponent.room.state.gameOver).toBe(true), { timeout: 10_000 });
    await vi.waitFor(() => expect(opponent.room.state.winnerSeat).toBe(1), { timeout: 10_000 });

    // The protagonist's own rendered DOM shows the Defeat overlay.
    await screen.findByText(/^defeat$/i, {}, { timeout: 10_000 });
    await screen.findByText(/you surrendered/i, {}, { timeout: 10_000 });

    await opponent.leave();
  }, 20_000);
});
