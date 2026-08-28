// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { decisionCandidates, findDecisionSurface, resolveNextTriggerThroughUi } from "./scenarioHarness/decisions";

// EX11-069 "Yuuki" (Purple/Red Tamer, playCost 4): printed "[Start of Your Main
// Phase][On Play] By trashing 1 card in your hand, gain 1 memory" — compiled as TWO
// `optional`, `abortOnDecline` GainMemory effects (one per printed timing bracket;
// apps/api/src/cards/EX11/EX11-069.ts), each with a mandatory trash-1-from-hand cost.
// Both fire the turn Yuuki is played (observed: playing during Main opens two
// sequential "optional" decisions, not one) — this scenario answers each decision the
// real overlay raises, whichever timing produced it, rather than assuming a fixed
// count. Swapped 1:1 for RED_DECK's BT1-013 (same count, legal deck) so it lands in
// the array slot BT1-013 held under the shuffle.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-013", "EX11-069");

// Seed 2: seat 0 (protagonist) goes first and its dealt opening hand includes
// EX11-069 (found by exhaustively searching seeds for the swapped RED_DECK, mirroring
// mulligan.scenario.test.tsx's seed-4 search).
const SEED = 2;

scenario("optional-decision", () => {
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

  async function playYuuki() {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
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

    return opponent;
  }

  /**
   * Answer every decision overlay the engine raises, in order, until none remain:
   * an "optional" prompt is answered accept/decline per `mode`; anything else
   * (Yuuki's accept path cascades into a "selectCards" cost prompt) picks the first
   * offered candidate and confirms. Caps at 5 rounds — Yuuki raises at most 2.
   */
  async function resolveAllDecisions(opponent: Awaited<ReturnType<typeof playYuuki>>, mode: "accept" | "decline") {
    for (let round = 0; round < 10; round += 1) {
      if (opponent.room.state.pendingDecision?.kind === "orderTriggers") {
        await resolveNextTriggerThroughUi(opponent);
        continue;
      }
      const dialog = screen.queryByRole("dialog") ?? screen.queryByTestId("board-prompt");
      if (dialog === null) return;
      const decisionIdBefore = opponent.room.state.pendingDecision?.decisionId;
      const acceptBtn = within(dialog).queryByRole("button", { name: /yes, activate|^use$/i });
      const declineBtn = within(dialog).queryByRole("button", { name: /no, decline|^not use$/i });
      if (acceptBtn && declineBtn) {
        fireEvent.click(mode === "accept" ? acceptBtn : declineBtn);
      } else {
        fireEvent.click(decisionCandidates(dialog)[0]!);
        fireEvent.click(within(dialog).getByRole("button", { name: /confirm target|^end selection$/i }));
      }
      await vi.waitFor(
        () => {
          expect(opponent.room.state.pendingDecision?.decisionId).not.toBe(decisionIdBefore);
        },
        { timeout: 10_000 },
      );
    }
  }

  it("declining the optional effect leaves the memory gauge at just the play cost", async () => {
    const opponent = await playYuuki();

    // Yuuki's OnPlay opens the real "optional" decision, on the board rail
    // beside the Tamer it is about to change.
    const dialog = await findDecisionSurface();
    expect(within(dialog).getByText(/yuuki/i)).toBeTruthy();

    await resolveAllDecisions(opponent, "decline");

    // Declining every prompt is a clean abort: no dialog remains, Yuuki still
    // renders in the battle area (it was already placed before OnPlay fired), and
    // only its printed play cost (4) — not any optional memory gain — shows on the
    // memory gauge.
    expect(screen.queryByRole("dialog") ?? screen.queryByTestId("board-prompt")).toBeNull();
    await screen.findByText(/memory -4/i, {}, { timeout: 10_000 });
    expect(screen.getAllByRole("img", { name: /^yuuki$/i }).length).toBeGreaterThan(0);

    await opponent.leave();
  }, 20_000);

  it("accepting the optional effect trashes cards and gains memory", async () => {
    const opponent = await playYuuki();

    await findDecisionSurface();
    await resolveAllDecisions(opponent, "accept");

    // Every accepted prompt paid its trash cost and applied its memory gain: the
    // gauge is strictly better than the decline case's -4, and Yuuki is still on
    // the field — both proven on the protagonist's own rendered DOM through real
    // intent round trips (accept -> pay cost -> gain memory), not injected state.
    expect(screen.queryByRole("dialog") ?? screen.queryByTestId("board-prompt")).toBeNull();
    // The sidebar's "Turn N · memory <value>" line is the gauge; the game log
    // below it also mentions "memory" in its transition entries (e.g. "Memory 0
    // -> -4 (playCard)"), so scope to the turn/memory line specifically.
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
  }, 20_000);
});
