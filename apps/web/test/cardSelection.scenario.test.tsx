// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { resolveNextTriggerThroughUi } from "./scenarioHarness/decisions";

// EX11-069 "Yuuki" (Purple/Red Tamer, playCost 4): accepting its "gain 1 memory"
// optional (see optionalDecision.scenario.test.tsx) pays a mandatory "trash 1 card
// in your hand" cost. With 4+ cards left in hand, the interpreter's generic cost
// picker (apps/api/src/engine/effects/interpreter.ts's pickLoose) cannot
// auto-resolve which one, so it raises a real "selectCards" decision — the same
// mechanism a reveal/search effect would use to offer a visible set of cards.
// Swapped 1:1 for RED_DECK's BT1-013 (same count, legal deck) so it lands in the
// array slot BT1-013 held under the shuffle.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-013", "EX11-069");

// Seed 2: seat 0 (protagonist) goes first and its dealt opening hand includes
// EX11-069 alongside four other, all-distinct cards — found by exhaustively
// searching seeds for the swapped RED_DECK (mulligan.scenario.test.tsx's seed-4
// search); the distinct hand means the trashed card is unambiguous by name.
const SEED = 2;

scenario("card-selection", () => {
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

  it("selecting a card from hand for Yuuki's cost trashes exactly that card", async () => {
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

    const breedingHeading = await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
    fireEvent.click(within(breedingHeading.parentElement!).getByRole("button", { name: /^end phase$/i }));

    const yuukiImg = await screen.findByRole("img", { name: /yuuki/i }, { timeout: 10_000 });
    fireEvent.pointerDown(yuukiImg, { clientX: 100, clientY: 100 });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

    // Yuuki's OnPlay opens the "optional" decision; accept it.
    const optionalDialog = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    fireEvent.click(within(optionalDialog).getByRole("button", { name: /yes, activate/i }));

    // Accepting cascades into the real "selectCards" decision — its own heading
    // text ("Select 1 target") and its candidate cards (rendered as selectable
    // CardFull thumbnails, aria-pressed distinguishing them from Confirm/None)
    // prove this is genuinely the card-selection overlay, not the optional one.
    // The overlay div is reused (same component, new props), so wait for its
    // content to actually flip rather than just for "a dialog" to be present —
    // that would still match the stale "optional" one mid-transition.
    const selectDialog = await vi.waitFor(
      () => {
        const dialog = screen.getByRole("dialog");
        expect(dialog.textContent).toMatch(/select 1 target/i);
        return dialog;
      },
      { timeout: 10_000 },
    );
    const [candidate] = within(selectDialog).getAllByRole("button", { pressed: false });
    const candidateName = candidate!.getAttribute("aria-label") ?? "";
    expect(candidateName.length).toBeGreaterThan(0);

    fireEvent.click(candidate!);
    // Clicking marks it selected — the overlay appends ", selected" to the
    // aria-label (overlays.tsx's DecisionOverlay) and flips aria-pressed.
    expect(
      within(selectDialog).getByRole("button", { name: `${candidateName}, selected`, pressed: true }),
    ).toBeTruthy();
    const selectionDecisionId = opponent.room.state.pendingDecision?.decisionId;
    fireEvent.click(within(selectDialog).getByRole("button", { name: /confirm target/i }));
    await vi.waitFor(() => expect(opponent.room.state.pendingDecision?.decisionId).not.toBe(selectionDecisionId), {
      timeout: 10_000,
    });

    // A second copy of Yuuki's cost-bearing optional (its Start-of-Main-Phase
    // clause; see optionalDecision.scenario.test.tsx) may still be pending —
    // decline it so the scenario isolates the card-selection proof from that
    // second cascade.
    for (let round = 0; round < 3; round += 1) {
      if (opponent.room.state.pendingDecision === undefined) break;
      if (opponent.room.state.pendingDecision.kind === "orderTriggers") {
        await resolveNextTriggerThroughUi(opponent);
        continue;
      }
      const decisionId = opponent.room.state.pendingDecision.decisionId;
      const dialog = screen.getByRole("dialog");
      fireEvent.click(within(dialog).getByRole("button", { name: /no, decline/i }));
      await vi.waitFor(() => expect(opponent.room.state.pendingDecision?.decisionId).not.toBe(decisionId), {
        timeout: 10_000,
      });
    }
    expect(screen.queryByRole("dialog")).toBeNull();

    // The exact card selected through the UI — not just "some" card — is now
    // visible after opening the public trash pile, proving the chosen selection
    // (not a default or arbitrary one) was what got applied.
    fireEvent.click(await screen.findByRole("button", { name: /trash · 1/i }, { timeout: 10_000 }));
    const trashDialog = await screen.findByRole("dialog", {}, { timeout: 10_000 });
    await vi.waitFor(
      () =>
        expect(
          within(trashDialog).getAllByRole("img", { name: new RegExp(`^${candidateName}$`, "i") }).length,
        ).toBeGreaterThan(0),
      { timeout: 10_000 },
    );

    await opponent.leave();
  }, 20_000);
});
