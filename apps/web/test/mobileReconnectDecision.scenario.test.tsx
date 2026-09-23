// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import { Client, type Room } from "colyseus.js";
import { getCardDefinition, type GameState } from "@aegis/shared";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { mobileScenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { decisionCandidates, findDecisionSurface, resolveNextTriggerThroughUi } from "./scenarioHarness/decisions";
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

      const handCountBeforePlay = opponent.room.state.players[0]?.handCount;
      const trashBeforePlay = [...(opponent.room.state.players[0]?.trash ?? [])].map((card) => card.instanceId);
      const [yuuki] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /yuuki/i });
      tap(yuuki!);
      fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

      await findDecisionSurface();
      await vi.waitFor(() => expect(opponent.room.state.pendingDecision?.seat).toBe(0), { timeout: 10_000 });
      const decisionIdBeforeDrop = opponent.room.state.pendingDecision?.decisionId;
      expect(protagonistRoom!.state.pendingDecision?.decisionId).toBe(decisionIdBeforeDrop);
      const handAtDrop = [...protagonistRoom!.state.players[0]!.hand].map((card) => ({
        instanceId: card.instanceId,
        name: getCardDefinition(card.cardId)?.nameEn ?? card.cardId,
      }));

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

      // Resolve the preserved decision through the mobile UI, then prove the exact
      // selected hand card was paid and the server's resulting zones are rendered.
      let paidCandidateInstanceId: string | undefined;
      let declinedReturnOptional = false;
      for (let round = 0; round < 10; round += 1) {
        const request = opponent.room.state.pendingDecision;
        if (opponent.room.state.turnSeat === 1 && request === undefined) break;
        if (request === undefined) {
          await vi.waitFor(
            () => {
              expect(
                (opponent.room.state.turnSeat === 1 && opponent.room.state.pendingDecision === undefined) ||
                  opponent.room.state.pendingDecision !== undefined,
              ).toBe(true);
            },
            { timeout: 10_000 },
          );
          continue;
        }
        if (request.kind === "orderTriggers") {
          await resolveNextTriggerThroughUi(opponent);
          continue;
        }
        const decisionIdBefore = request.decisionId;
        const current = await vi.waitFor(
          () => {
            const surface = screen.queryByRole("dialog") ?? screen.queryByTestId("board-prompt");
            expect(surface).not.toBeNull();
            if (request.kind === "optional" && /return 1 to hand/i.test(request.promptText ?? "")) {
              expect(within(surface!).getByText(/return 1 to hand/i)).toBeTruthy();
            }
            return surface!;
          },
          { timeout: 10_000 },
        );
        const acceptBtn = within(current).queryByRole("button", { name: /yes, activate|^use$/i });
        const declineBtn = within(current).queryByRole("button", { name: /no, decline|^don't use$/i });
        if (acceptBtn && declineBtn) {
          if (request.kind === "optional" && /return 1 to hand/i.test(request.promptText ?? "")) {
            fireEvent.click(declineBtn);
            declinedReturnOptional = true;
          } else {
            fireEvent.click(acceptBtn);
          }
        } else {
          const candidates = decisionCandidates(current);
          const uniqueHandCards = handAtDrop.filter(
            (card) => handAtDrop.filter((other) => other.name === card.name).length === 1,
          );
          const matches = candidates.flatMap((candidate) => {
            const label = candidate.getAttribute("aria-label") ?? "";
            const handCards = uniqueHandCards.filter((card) => label === `Pick ${card.name}`);
            return handCards.length === 1 ? [{ candidate, handCard: handCards[0]! }] : [];
          });
          expect(matches.length).toBeGreaterThan(0);
          paidCandidateInstanceId = matches[0]!.handCard.instanceId;
          const candidate = matches[0]!.candidate;
          fireEvent.click(candidate);
          fireEvent.click(within(current).getByRole("button", { name: /confirm target|^end selection$/i }));
        }
        await vi.waitFor(
          () => {
            expect(
              (opponent.room.state.turnSeat === 1 && opponent.room.state.pendingDecision === undefined) ||
                opponent.room.state.pendingDecision?.decisionId !== decisionIdBefore,
            ).toBe(true);
          },
          { timeout: 10_000 },
        );
      }

      expect(declinedReturnOptional).toBe(true);
      await vi.waitFor(() => expect(screen.queryByRole("dialog") ?? screen.queryByTestId("board-prompt")).toBeNull());
      await vi.waitFor(
        () => {
          const line = screen.getByText(/^turn \d+ · memory/i).textContent ?? "";
          expect(Number(/memory (-?\d+)/i.exec(line)?.[1])).toBe(-3);
        },
        { timeout: 10_000 },
      );
      // The resumed UI and the observer have independent WebSockets. Wait for
      // the observer's final resolution patch before comparing its zones.
      await vi.waitFor(
        () => {
          expect(opponent.room.state.pendingDecision).toBeUndefined();
          expect(opponent.room.state.turnSeat).toBe(1);
          expect(opponent.room.state.memory).toBe(3);
        },
        { timeout: 10_000 },
      );
      const protagonist = opponent.room.state.players[0]!;
      expect(protagonist.handCount).toBe(handCountBeforePlay! - 2);
      const newlyTrashed = [...protagonist.trash].filter((card) => !trashBeforePlay.includes(card.instanceId));
      expect(newlyTrashed).toHaveLength(1);
      expect(paidCandidateInstanceId).toBe(newlyTrashed[0]!.instanceId);
      expect(protagonist.battleArea.find((permanent) => permanent.topCard.cardId === "EX11-069")?.isSuspended).toBe(
        false,
      );

      expect(protagonist.trash.length).toBe(trashBeforePlay.length + 1);
      expect(screen.getByTestId("hand").querySelectorAll(".game-hand-card")).toHaveLength(protagonist.handCount);
      expect(document.querySelector('[data-side="you"] [data-counter="trash"]')?.textContent).toContain(
        String(protagonist.trash.length),
      );
      expect(screen.getAllByRole("img", { name: /^yuuki$/i }).length).toBeGreaterThan(0);

      await opponent.leave();
    }, 45_000);
  });
});
