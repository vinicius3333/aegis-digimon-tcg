// @vitest-environment jsdom
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { mobileScenario } from "./scenarioHarness/scenario";

mobileScenario("match-start", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterAll(async () => {
    cleanup();
    await server.close();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it(
    "starts a match from the mobile board after both players keep their hands",
    async () => {
      vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
      Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
      vi.stubGlobal("matchMedia", (query: string) => ({
        matches: query === "(width < 600px)" || query === "(width < 960px)",
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }));
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
      opponent.onDecision((request) => {
        if (request.kind === "mulligan") opponent.mulligan(true);
      });
      opponent.ready();

      fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

      await vi.waitFor(
        () => expect(screen.getAllByText(/your turn|their turn/i).length).toBeGreaterThan(0),
        { timeout: 10_000 },
      );
      expect(screen.getAllByRole("img").length).toBeGreaterThanOrEqual(5);
      expect(screen.getAllByText(/sec/i).length).toBeGreaterThanOrEqual(2);

      const breedingHeading = await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
      fireEvent.click(within(breedingHeading.parentElement!).getByRole("button", { name: /^end phase$/i }));
      await screen.findAllByText(/no digimon in play/i, {}, { timeout: 10_000 });

      const battleArea = document.querySelector('[data-drop="battle-you"]') as HTMLElement;
      battleArea.getBoundingClientRect = () => ({
        left: 20,
        right: 370,
        top: 180,
        bottom: 420,
        width: 350,
        height: 240,
        x: 20,
        y: 180,
        toJSON: () => {},
      }) as DOMRect;
      const [biyomon] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /biyomon/i });
      expect(biyomon).toBeDefined();

      // Dispatch the whole touch gesture in one browser task. A listener installed
      // only after pointerdown's state render misses these mobile move/up events.
      await act(async () => {
        biyomon!.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true, clientX: 100, clientY: 650, pointerId: 7, pointerType: "touch",
        }));
        window.dispatchEvent(new PointerEvent("pointermove", {
          bubbles: true, cancelable: true, clientX: 160, clientY: 300, pointerId: 7, pointerType: "touch",
        }));
        window.dispatchEvent(new PointerEvent("pointerup", {
          bubbles: true, clientX: 160, clientY: 300, pointerId: 7, pointerType: "touch",
        }));
      });

      expect(await screen.findByText(/play biyomon in your battle area/i, {}, { timeout: 10_000 })).toBeDefined();
      fireEvent.click(screen.getByRole("button", { name: /^play card$/i }));
      await screen.findByText(/memory -3/i, {}, { timeout: 10_000 });

      await opponent.leave();
    },
    20_000,
  );
});
