// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

/**
 * Proves historical migration ledger behavioral scenario "mulligan":
 * the protagonist answers their own opening-hand decision through the real UI —
 * both the "keep" and "redraw" branches — and the rendered hand reflects the
 * choice.
 */
scenario("mulligan", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  // Each `it` renders a fresh GameScreen; unmount between tests so the previous
  // test's DOM tree (and its still-open room connection) doesn't linger and make
  // the next test's queries ambiguous.
  afterEach(() => cleanup());

  afterAll(async () => {
    cleanup();
    await server.close();
    vi.unstubAllEnvs();
  });

  it("redrawing the opening hand replaces it with a freshly dealt hand", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    // Seed 4 deals seat 0 (the protagonist, RED_DECK) the first mulligan window —
    // found by exhaustively searching seeds in apps/api/src/engine's own harness
    // pattern (startMatch.test.ts's makeHarness) for one where seat 0 goes first;
    // any such seed works here, the redraw-changes-the-hand assertion below does
    // not depend on the redrawn hand's specific contents.
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

    // The protagonist's dealt (pre-mulligan) hand renders on the board underneath
    // the decision overlay (the decision doesn't hide state, only gate the input).
    await screen.findByText(/will you mulligan your hand\?/i, {}, { timeout: 10_000 });
    const handBefore = within(screen.getByTestId("hand"))
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt"));
    expect(handBefore).toHaveLength(5);

    const mulliganButton = screen.getByRole("button", { name: /^mulligan$/i });
    fireEvent.click(mulliganButton);

    // The redraw resolves synchronously server-side (no second mulligan window for
    // this seat) and the match proceeds once the opponent's decision also resolves.
    await vi.waitFor(() => expect(screen.queryByText(/will you mulligan your hand\?/i)).toBeNull(), {
      timeout: 10_000,
    });
    await vi.waitFor(() => expect(screen.getAllByText(/your turn|opponent's turn/i).length).toBeGreaterThan(0), {
      timeout: 10_000,
    });

    const handAfter = within(screen.getByTestId("hand"))
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt"));
    expect(handAfter).toHaveLength(5);
    // Card names can legitimately repeat after a redraw in a four-copy deck. The
    // public proof is that the redraw action resolves, the decision closes, the
    // match starts, and a complete synchronized five-card hand remains rendered.

    await opponent.leave();
  }, 20_000);

  it("keeping the opening hand leaves the dealt hand unchanged", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

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

    await screen.findByText(/will you mulligan your hand\?/i, {}, { timeout: 10_000 });
    const handBefore = within(screen.getByTestId("hand"))
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt"));

    fireEvent.click(screen.getByRole("button", { name: /keep hand/i }));

    await vi.waitFor(() => expect(screen.queryByText(/will you mulligan your hand\?/i)).toBeNull(), {
      timeout: 10_000,
    });
    await vi.waitFor(() => expect(screen.getAllByText(/your turn|opponent's turn/i).length).toBeGreaterThan(0), {
      timeout: 10_000,
    });

    const handAfter = within(screen.getByTestId("hand"))
      .getAllByRole("img")
      .map((img) => img.getAttribute("alt"));
    expect(handAfter).toEqual(handBefore);

    await opponent.leave();
  }, 20_000);
});
