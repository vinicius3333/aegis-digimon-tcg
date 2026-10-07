// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import { Client, type Room } from "@colyseus/sdk";
import type { GameState } from "@aegis/shared";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { findDecisionSurface } from "./scenarioHarness/decisions";

// Same board as reconnectDecision.scenario.test.tsx: seed 2 puts EX11-069 Yuuki in the
// protagonist's opening hand, and its [On Play] opens a decision once the play lands.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-013", "EX11-069");
const SEED = 2;

/**
 * GitHub #5262: the connection drops at the moment a card is played. The play intent dies with
 * the socket, so the server never sees it and never refuses it. The client had already taken the
 * card out of the hand, and nothing put it back after the reconnect: it stayed hidden until the
 * next play replaced the optimistic hide, and an Option's effect looked spent.
 */
scenario("reconnect-lost-play", () => {
  let server: TestServer;

  beforeAll(async () => {
    server = await startTestServer();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    cleanup();
    await server.close();
    vi.unstubAllEnvs();
  });

  it("puts a card back in the hand when its play was lost with the dropped socket", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);

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
    opponent.onDecision((req) => {
      if (req.kind === "mulligan") opponent.mulligan(true);
    });
    opponent.ready();
    fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));
    await endBreedingStep();

    const handCountBeforePlay = opponent.room.state.players[0]?.handCount;
    expect(protagonistRoom).toBeDefined();
    // The socket dies as the play is sent: the intent is written into a connection that never
    // delivers it, then the transport reports the drop.
    const droppedRoom = protagonistRoom!;
    const originalSend = droppedRoom.send.bind(droppedRoom);
    vi.spyOn(droppedRoom, "send").mockImplementation(((type: string, payload?: unknown) => {
      if (type === "playCard") {
        droppedRoom.connection.close(4500, "scenario: play lost in a network drop");
        return;
      }
      originalSend(type, payload);
    }) as Room<GameState>["send"]);

    tap(await screen.findByRole("img", { name: /yuuki/i }, { timeout: 10_000 }));
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

    await screen.findByText(/reconnecting/i, {}, { timeout: 10_000 });
    await vi.waitFor(() => expect(screen.queryByText(/reconnecting/i)).toBeNull(), { timeout: 15_000 });

    // The server never saw the play: Yuuki is still in the protagonist's hand.
    expect(opponent.room.state.players[0]?.handCount).toBe(handCountBeforePlay);
    expect(opponent.room.state.pendingDecision).toBeUndefined();

    // The client shows it again and it can still be played, effect included.
    const yuuki = await screen.findByRole("img", { name: /yuuki/i }, { timeout: 10_000 });
    expect(screen.getByTestId("hand").contains(yuuki)).toBe(true);
    tap(yuuki);
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));
    const dialog = await findDecisionSurface();
    expect(within(dialog).getByRole("img", { name: /^yuuki$/i })).toBeTruthy();
    await vi.waitFor(() => expect(opponent.room.state.pendingDecision?.seat).toBe(0), { timeout: 10_000 });

    await opponent.leave();
  }, 45_000);
});
