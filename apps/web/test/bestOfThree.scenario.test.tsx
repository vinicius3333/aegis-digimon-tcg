// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import type { SeriesGameTicket } from "../src/net/useRoom";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

/**
 * A best-of-three seen by the player who loses game 1: the result splash keeps the series
 * score, offers the turn-order choice, announces who starts game 2, and hands the caller the
 * ticket for the next room instead of leaving the series.
 */
scenario("best-of-three", () => {
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

  it("lets the loser of game 1 choose the turn order and moves on to game 2", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    const joinOptions: AegisJoinOptions & { seed?: number } = {
      displayName: "Protagonist",
      deck: { mainDeck: RED_DECK.mainDeck, eggDeck: RED_DECK.eggDeck },
      bestOf: 3,
      seed: 20260711,
    };
    const onSeriesNext = vi.fn<(ticket: SeriesGameTicket) => void>();

    render(
      <GameScreen
        joinOptions={joinOptions}
        identityColor="Red"
        startMode="casual"
        onExit={() => {}}
        onSeriesNext={onSeriesNext}
      />,
    );

    await screen.findByText(/finding an opponent/i);

    const opponent = await joinHeadlessOpponent(server.endpoint, {
      displayName: "Headless Opponent",
      deck: { mainDeck: BLUE_DECK.mainDeck, eggDeck: BLUE_DECK.eggDeck },
      matchTimer: false,
      bestOf: 3,
    });
    opponent.onDecision((req) => {
      if (req.kind === "mulligan") opponent.mulligan(true);
    });
    opponent.ready();

    fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));
    await vi.waitFor(() => expect(opponent.room.state.turnCount).toBeGreaterThan(0), { timeout: 10_000 });
    expect(screen.getByRole("status", { name: "Game 1 of 3. You 0, opponent 0." })).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: /^surrender$/i }, { timeout: 10_000 }));
    const confirm = await screen.findByRole("dialog", { name: /surrender this match/i });
    fireEvent.click(within(confirm).getByRole("button", { name: /^surrender$/i }));

    await screen.findByText("Game 1 of 3 · complete", {}, { timeout: 10_000 });
    await screen.findByText("You choose for game 2");
    expect(screen.getByText("Game 1: lost")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Find rematch" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Go first" }));
    await screen.findByText("Game 2 · You go first", {}, { timeout: 5000 });
    await vi.waitFor(() => expect(onSeriesNext).toHaveBeenCalledOnce(), { timeout: 5000 });
    const ticket = onSeriesNext.mock.calls[0]![0];
    expect(ticket.roomId).toBe(opponent.room.state.series.nextRoomId);
    expect(ticket.seatToken.length).toBeGreaterThan(20);

    await opponent.leave();
  }, 30_000);
});
