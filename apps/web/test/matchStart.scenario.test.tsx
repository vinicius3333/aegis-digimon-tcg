// @vitest-environment jsdom
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
// RED_DECK/BLUE_DECK are the API's legal-shaped test decks
// (apps/api/src/rooms/AegisRoom.test.ts's sibling engine tests use the same
// source), asserted legal at module load.
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

/**
 * Proves historical migration ledger behavioral scenario
 * "match-start": a real
 * protagonist client joins a real Colyseus room over a real websocket, a
 * headless second seat joins and readies, and the protagonist's own rendered
 * DOM — not just synchronized state — shows the started match.
 */
scenario("match-start", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    cleanup();
    await server.close();
    vi.unstubAllEnvs();
  });

  it("renders the started match on the protagonist's UI once both seats are ready", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    // net/client.ts reads import.meta.env.VITE_AEGIS_API_URL at module-eval
    // time, so GameScreen's module graph must load after the endpoint is
    // stubbed above — a static top-level import would capture a stale value.
    const { GameScreen } = await import("../src/game/GameScreen");

    const protagonistDeck = RED_DECK;
    const opponentDeck = BLUE_DECK;
    // A fixed seed makes AegisRoom's setup (shuffle, first-player choice)
    // deterministic — same mechanism apps/api/src/rooms/AegisRoom.test.ts uses,
    // reached here through the normal join payload (AegisRoom.onCreate already
    // accepts { seed }), not a test-only surface.
    const joinOptions: AegisJoinOptions & { seed?: number } = {
      displayName: "Protagonist",
      deck: { mainDeck: protagonistDeck.mainDeck, eggDeck: protagonistDeck.eggDeck },
      seed: 20260711,
    };

    render(<GameScreen joinOptions={joinOptions} identityColor="Red" startMode="casual" onExit={() => {}} />);

    // Before any opponent has joined the room, the match cannot have started —
    // the protagonist sees the queued/waiting state, and no board is rendered.
    await screen.findByText(/finding an opponent/i);
    expect(screen.queryAllByRole("img")).toHaveLength(0);

    const opponent = await joinHeadlessOpponent(server.endpoint, {
      displayName: "Headless Opponent",
      deck: { mainDeck: opponentDeck.mainDeck, eggDeck: opponentDeck.eggDeck },
    });
    opponent.onDecision((req) => {
      if (req.kind === "mulligan") opponent.mulligan(true);
    });
    opponent.ready();

    // The protagonist answers their own opening-hand mulligan through the real
    // UI (a click), not a direct intent.
    const keepHandButton = await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 });
    fireEvent.click(keepHandButton);

    // The match is started: the protagonist's hand holds real dealt cards and
    // the turn indicator reflects synchronized state — neither renders pre-match.
    await vi.waitFor(() => expect(screen.getAllByText(/your turn|opponent's turn/i).length).toBeGreaterThan(0), {
      timeout: 10_000,
    });
    expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText(/security/i).length).toBeGreaterThanOrEqual(2);

    await opponent.leave();
  }, 20_000);
});
