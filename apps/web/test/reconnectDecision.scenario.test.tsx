// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import { Client, type Room } from "colyseus.js";
import type { GameState } from "@aegis/shared";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { decisionCandidates, findDecisionSurface, resolveNextTriggerThroughUi } from "./scenarioHarness/decisions";

// Same swap as optionalDecision.scenario.test.tsx: EX11-069 "Yuuki" ([Start of Your
// Main Phase][On Play] optional GainMemory, each with a mandatory trash-1 cost) 1:1
// for RED_DECK's BT1-013, so a real pendingDecision is reachable through an ordinary
// play. Seed 2: seat 0 (protagonist) goes first and its opening hand includes it.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-013", "EX11-069");
const SEED = 2;

/**
 * Proves historical migration ledger behavioral scenario
 * "reconnect-decision": while the protagonist has a real pendingDecision open, the
 * underlying websocket drops (a genuine network failure — the same `ws` socket
 * colyseus.js opened, closed with a non-1000 code, not a fake state reset), the
 * client's own `useRoom` reconnect loop (apps/web/src/net/useRoom.ts) resumes the
 * session with the server's resume token, and the decision overlay re-renders and is
 * still answerable — proving both the server's reconnect support
 * (apps/api/src/rooms/AegisRoom.ts's `allowReconnection` + resent pendingDecision)
 * and the client's actually work end-to-end.
 */
scenario("reconnect-decision", () => {
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

  it("reconnecting mid-decision re-renders the decision overlay and it still resolves", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);

    // Capture the protagonist's own Room instance by call order: net/client.ts's
    // singleton Client and headlessOpponent.ts's Client both go through
    // `Client.prototype.joinOrCreate`, and GameScreen's join (triggered
    // synchronously by its mount effect, below) always starts before the headless
    // opponent's — so the first call is the protagonist's, regardless of which
    // resolves first. The connection this yields is the exact real websocket
    // colyseus.js opened; nothing here is a fake or a second, parallel connection.
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

    const yuukiImg = await screen.findByRole("img", { name: /yuuki/i }, { timeout: 10_000 });
    tap(yuukiImg);
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

    // A real pendingDecision is now open on the protagonist's seat — proven both by
    // the server's synchronized state and the rendered prompt.
    const dialog = await findDecisionSurface();
    expect(within(dialog).getByText(/yuuki/i)).toBeTruthy();
    await vi.waitFor(() => expect(opponent.room.state.pendingDecision?.seat).toBe(0), { timeout: 10_000 });
    const decisionIdBeforeDrop = opponent.room.state.pendingDecision?.decisionId;

    // Sever the protagonist's real websocket with a non-1000 ("unexpected drop")
    // close code — exactly the class of event useRoom.ts's `room.onLeave` treats as
    // recoverable, as opposed to a clean 1000 close (a deliberate leave/surrender).
    // `Room.connection.close` (colyseus.js) closes the actual underlying `ws` socket;
    // this is a real disconnect, not a state reset.
    expect(protagonistRoom).toBeDefined();
    protagonistRoom!.connection.close(4500, "scenario: simulated network drop");

    // The client's own reconnect loop kicks in: the board is torn down for a
    // "Reconnecting…" gate while it resumes the session with the server's token.
    await screen.findByText(/reconnecting/i, {}, { timeout: 10_000 });

    // The server's 30s reconnect grace window (AegisRoom.RECONNECT_GRACE_SECONDS)
    // resumes the same seat and re-sends the still-pending decision
    // (AegisRoom.onLeave's `allowReconnection` branch); the client re-renders it.
    await vi.waitFor(
      () => {
        const current = screen.queryByRole("dialog") ?? screen.getByTestId("board-prompt");
        expect(within(current).getAllByText(/yuuki/i).length).toBeGreaterThan(0);
      },
      { timeout: 15_000 },
    );
    expect(opponent.room.state.pendingDecision?.decisionId).toBe(decisionIdBeforeDrop);

    // Answer it through the real UI, post-reconnect: accept -> pay the trash cost ->
    // gain memory. The resolved outcome (not just "a dialog is visible") is the proof
    // the resumed session is genuinely live, not a frozen stale render.
    for (let round = 0; round < 10; round += 1) {
      if (opponent.room.state.pendingDecision?.kind === "orderTriggers") {
        await resolveNextTriggerThroughUi(opponent);
        continue;
      }
      const current = screen.queryByRole("dialog") ?? screen.queryByTestId("board-prompt");
      if (current === null) break;
      const decisionIdBefore = opponent.room.state.pendingDecision?.decisionId;
      const acceptBtn = within(current).queryByRole("button", { name: /yes, activate|^use$/i });
      const declineBtn = within(current).queryByRole("button", { name: /no, decline|^not use$/i });
      if (acceptBtn && declineBtn) {
        fireEvent.click(acceptBtn);
      } else {
        fireEvent.click(decisionCandidates(current)[0]!);
        fireEvent.click(within(current).getByRole("button", { name: /confirm target|^end selection$/i }));
      }
      await vi.waitFor(
        () => {
          expect(opponent.room.state.pendingDecision?.decisionId).not.toBe(decisionIdBefore);
        },
        { timeout: 10_000 },
      );
    }

    expect(screen.queryByRole("dialog") ?? screen.queryByTestId("board-prompt")).toBeNull();
    await vi.waitFor(
      () => {
        const line = screen.getByText(/^turn \d+ · memory/i).textContent ?? "";
        const value = Number(/memory (-?\d+)/i.exec(line)?.[1]);
        expect(value).toBeGreaterThan(-4);
      },
      { timeout: 10_000 },
    );
    expect(screen.getAllByRole("img", { name: /^yuuki$/i }).length).toBeGreaterThan(0);

    await opponent.leave();
  }, 30_000);
});
