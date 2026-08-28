// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { resolveIncidentalDecisionsThroughUi, respondToHeadlessDecision } from "./scenarioHarness/decisions";
import { dragOnto } from "./scenarioHarness/dragDrop";

/**
 * Proves historical migration ledger behavioral scenario "digivolve-normal":
 * digivolving a Lv.3 Digimon already in the battle area into a Lv.4 whose printed
 * digivolution requirement it satisfies, paying the printed memory cost, through the
 * real UI renders the evolved Digimon with the base card underneath it in its
 * digivolution stack and the memory gauge reflecting the printed cost
 *.
 */
scenario("digivolve-normal", () => {
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

  it("digivolving Agumon into Greymon for its printed cost renders the evolved Digimon with Agumon in its stack", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    // Seed 14: seat 0 (protagonist, RED_DECK) goes first and its dealt opening hand
    // includes BT1-010 "Agumon" (Lv.3 Red) and BT1-015 "Greymon" (Lv.4 Red), whose
    // printed evoCost (Red Lv.3, memory 2) Agumon satisfies — found by exhaustively
    // searching seeds, mirroring mulligan.scenario.test.tsx's seed-4 search.
    const joinOptions: AegisJoinOptions & { seed?: number } = {
      displayName: "Protagonist",
      deck: { mainDeck: RED_DECK.mainDeck, eggDeck: RED_DECK.eggDeck },
      seed: 14,
    };

    render(<GameScreen joinOptions={joinOptions} identityColor="Red" startMode="casual" onExit={() => {}} />);

    await screen.findByText(/finding an opponent/i);

    const opponent = await joinHeadlessOpponent(server.endpoint, {
      displayName: "Headless Opponent",
      deck: { mainDeck: BLUE_DECK.mainDeck, eggDeck: BLUE_DECK.eggDeck },
    });
    opponent.onDecision((req) => {
      if (req.kind === "mulligan") {
        opponent.mulligan(true);
        return;
      }
      // Anything else its own cards ask for is answered generically — an unanswered
      // prompt on the headless seat would stall the match before the turn comes back.
      respondToHeadlessDecision(opponent, req);
    });
    // The opponent has no role beyond existing — skip its own Breeding/Main windows
    // every turn so the match keeps moving. Ending its own Main phase without paying
    // anything ends it "passed" (not "crossed"), which hands the protagonist the +3
    // pass-turn memory bonus each round (apps/api/src/engine/MemoryGauge.ts's
    // PASS_TURN_MEMORY) — required below. This only ever fires on the opponent's own
    // turn (`state.turnSeat !== 1` guards it), so it can't race ahead of the
    // protagonist's own turn once the digivolve below deliberately stays on the
    // protagonist's side of the gauge.
    opponent.room.onStateChange((state) => {
      if (state.turnSeat !== 1 || state.pendingDecision) return;
      if (state.phase === "Breeding" || state.phase === "Main") opponent.endPhase();
    });
    opponent.ready();

    fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

    // The opening draw can carry an effect that opens its own prompt before the first
    // Breeding window (seed 14 draws one whose reveal asks for a deck order). The
    // scenario's later steps answer any that appear, through the same overlay a player
    // would use.

    const yourBattleArea = () => document.querySelector('[data-drop="battle-you"]') as HTMLElement;

    // Turn 1: skip breeding, then play Agumon (cost 3, memory 0 -> -3) — this
    // immediately crosses the gauge and ends the Main phase
    // (apps/api/src/engine/MainPhaseController.ts's checkTurnEnd), which is fine:
    // Agumon is already placed, and the crossing simply hands the turn to the
    // opponent (whose own pass banks the protagonist's next-turn +3 bonus).
    await endBreedingStep();
    // Clicking "end phase" only sends the intent; the client's own phase state
    // updates asynchronously once the server round-trip lands. Wait for it — every
    // subsequent interaction below depends on genuinely being in the Main phase.
    await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });

    const [agumonImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /^agumon$/i });
    tap(agumonImg!);
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

    // The played card's own [On Play] opens its prompt one server round-trip after the play
    // intent lands, so wait for it to actually appear before answering it through the UI.
    await vi.waitFor(() => expect(opponent.room.state.pendingDecision).toBeDefined(), { timeout: 10_000 });
    await resolveIncidentalDecisionsThroughUi(opponent);

    await vi.waitFor(
      () => expect(within(yourBattleArea()).getAllByRole("img", { name: /^agumon$/i })).toHaveLength(1),
      { timeout: 10_000 },
    );

    // Turn 3 (protagonist's second turn; memory +3 from the pass-turn bonus): skip
    // breeding, then digivolve Greymon onto Agumon (cost 2, memory 3 -> 1). Kept
    // deliberately non-crossing so the Main phase — and the protagonist's own
    // turn — stays open for the stack-viewer assertion below, instead of racing
    // against the opponent's auto-pass handler advancing the match further.
    await endBreedingStep();
    await vi.waitFor(
      () => {
        expect(opponent.room.state.turnSeat).toBe(0);
        expect(opponent.room.state.phase).toBe("Main");
      },
      { timeout: 10_000 },
    );

    // Digivolve Greymon onto Agumon. Agumon is a legal attacker (any unsuspended
    // Digimon), which makes it "draggable" in the client and strips its plain
    // onClick digivolve-target handler (GameScreen.tsx's `onYourPerm` / `draggable`)
    // — the production gesture for digivolving onto a battle-area Digimon is
    // therefore a drag-and-drop, not a tap-then-click; `dragOnto`
    // (scenarioHarness/dragDrop.ts) reproduces that gesture.
    const agumonPermEl = within(yourBattleArea())
      .getByRole("img", { name: /^agumon$/i })
      .closest('[data-drop="perm-you"]') as HTMLElement;
    const [greymonImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /^greymon$/i });
    dragOnto(greymonImg!, agumonPermEl);
    fireEvent.click(await screen.findByRole("button", { name: /^digivolve$/i }));

    // The evolved Digimon (Greymon) now renders in the battle area in Agumon's
    // place, and the memory gauge reflects the printed digivolve cost (2) against
    // the banked pass-turn memory (3): 3 - 2 = +1.
    await screen.findByText(/memory \+1/i, {}, { timeout: 10_000 });
    expect(within(yourBattleArea()).getAllByRole("img", { name: /^greymon$/i })).toHaveLength(1);
    expect(within(yourBattleArea()).queryAllByRole("img", { name: /^agumon$/i })).toHaveLength(0);

    // The digivolution stack carries Agumon underneath the new top (Greymon) — open
    // the card menu (a tap: pointerdown+pointerup with no movement, the same gesture
    // that opens it for any non-dragged permanent, since it too is now a legal
    // attacker and therefore "draggable") and view the stack.
    const greymonPermEl = within(yourBattleArea())
      .getByRole("img", { name: /^greymon$/i })
      .closest('[data-drop="perm-you"]') as HTMLElement;
    tap(greymonPermEl);
    fireEvent.click(await screen.findByRole("button", { name: /view stack/i }, { timeout: 10_000 }));

    // The stack viewer's title is the current top card's name (Greymon), its DP is
    // Greymon's printed DP (4000), and Agumon appears as a "stack" thumbnail beneath
    // it — proving the digivolution actually stacked rather than replaced the card.
    await vi.waitFor(() => expect(screen.getAllByText(/^greymon$/i).length).toBeGreaterThan(0), { timeout: 10_000 });
    expect(screen.getByText(/4,000 DP/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^agumon agumon/i })).toBeTruthy();

    await opponent.leave();
  }, 20_000);
});
