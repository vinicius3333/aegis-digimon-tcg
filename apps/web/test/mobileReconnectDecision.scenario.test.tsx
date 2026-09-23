// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import { Client, type Room } from "colyseus.js";
import type { GameState } from "@aegis/shared";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { mobileScenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { findDecisionSurface } from "./scenarioHarness/decisions";
import { matchesMediaQuery, PHONE_VIEWPORTS, type Viewport } from "../src/game/style/viewportCascade";

// Same deck and seed as reconnectDecision.scenario.test.tsx: EX11-069 "Yuuki" in the
// opening hand opens a real [On Play] pendingDecision through an ordinary play.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-013", "EX11-069");
const SEED = 2;

function stubViewport(viewport: Viewport) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: viewport.width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: viewport.height });
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matchesMediaQuery(query, viewport),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

/**
 * A phone drops its socket while a decision is open (a tunnel, a lock screen, a
 * network switch). The client must come back to the game screen with the same
 * decision on it, not to a blank page. The drop is a real close of the websocket
 * colyseus.js opened, recovered by useRoom's own reconnect loop.
 */
mobileScenario("reconnect-decision", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    cleanup();
    await server.close();
    vi.unstubAllEnvs();
  });

  describe.each(PHONE_VIEWPORTS)("at $name", (viewport) => {
    it("returns to the game screen with the open decision after the socket drops", async () => {
      vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
      stubViewport(viewport);

      // GameScreen's join starts before the headless opponent's, so the first join
      // call is the protagonist's own room (see reconnectDecision.scenario.test.tsx).
      let joinCallCount = 0;
      let protagonistRoom: Room<GameState> | undefined;
      const originalJoinOrCreate = Client.prototype.joinOrCreate;
      vi.spyOn(Client.prototype, "joinOrCreate").mockImplementation(async function (
        this: Client,
        ...args: Parameters<Client["joinOrCreate"]>
      ) {
        const callIndex = joinCallCount++;
        const room = await originalJoinOrCreate.apply(this, args);
        if (callIndex === 0) protagonistRoom = room as Room<GameState>;
        return room;
      });
      const renderErrors = vi.spyOn(console, "error");

      const { GameScreen } = await import("../src/game/GameScreen");
      const joinOptions: AegisJoinOptions & { seed?: number } = {
        displayName: "Protagonist",
        deck: { mainDeck: PROTAGONIST_DECK.mainDeck, eggDeck: PROTAGONIST_DECK.eggDeck },
        seed: SEED,
      };
      render(<GameScreen joinOptions={joinOptions} identityColor="Red" startMode="casual" onExit={() => {}} />);
      await screen.findByText(/finding an opponent/i);

      const opponent = await joinHeadlessOpponent(server.endpoint, {
        displayName: "Headless Opponent",
        deck: { mainDeck: BLUE_DECK.mainDeck, eggDeck: BLUE_DECK.eggDeck },
      });
      opponent.onDecision((request) => {
        if (request.kind === "mulligan") opponent.mulligan(true);
      });
      opponent.ready();

      fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));
      await endBreedingStep();

      const [yuuki] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /yuuki/i });
      tap(yuuki!);
      fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

      await findDecisionSurface();
      await vi.waitFor(() => expect(opponent.room.state.pendingDecision?.seat).toBe(0), { timeout: 10_000 });
      const decisionIdBeforeDrop = opponent.room.state.pendingDecision?.decisionId;

      expect(protagonistRoom).toBeDefined();
      protagonistRoom!.connection.close(4500, "scenario: simulated network drop on a phone");
      await screen.findByText(/reconnecting/i, {}, { timeout: 10_000 });

      const surface = await vi.waitFor(
        () => {
          const current = screen.queryByRole("dialog") ?? screen.getByTestId("board-prompt");
          expect(within(current).getAllByText(/yuuki/i).length).toBeGreaterThan(0);
          return current;
        },
        { timeout: 15_000 },
      );
      expect(opponent.room.state.pendingDecision?.decisionId).toBe(decisionIdBeforeDrop);

      // The board itself is back under the decision, not just a lone prompt on a blank page.
      expect(screen.queryByText(/reconnecting/i)).toBeNull();
      expect(screen.getByTestId("hand")).toBeTruthy();
      expect(document.querySelector('[data-drop="battle-you"]')).not.toBeNull();
      expect(within(surface).getAllByRole("button").length).toBeGreaterThan(0);
      expect(
        renderErrors.mock.calls.filter((call) => /error boundary|uncaught|The above error/i.test(String(call[0]))),
      ).toEqual([]);

      await opponent.leave();
    }, 45_000);
  });
});
