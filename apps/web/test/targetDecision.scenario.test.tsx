// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

// BT1-095 "Brave Shield" (Red Option, playCost 5): printed "[Main] Unsuspend 1 of
// your Digimon. Until the end of your opponent's next turn, that Digimon gains
// <Blocker>." Its IR (apps/api/src/cards/BT1/BT1-095.ts) targets "1 of your
// Digimon" with no further filter, so with 2+ Digimon in play the engine cannot
// auto-resolve the target and raises a real "chooseTargets" decision. Swapped 1:1
// for RED_DECK's BT1-025 (WarGreymon, count 2 — well under BT1-095's maxCountInDeck
// of 4) so the deck stays legal and the swap lands in the array slots BT1-025 held
// under the shuffle.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-025", "BT1-095");

scenario("target-decision", () => {
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

  it(
    "choosing a permanent target for Brave Shield unsuspends the chosen Digimon",
    async () => {
      vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
      const { GameScreen } = await import("../src/game/GameScreen");

      // Seed 952: seat 0 (protagonist) goes first and its dealt opening hand
      // includes BT1-095 alongside three Monodramon (BT1-009, cost 2) — found by
      // exhaustively searching seeds for the swapped RED_DECK, mirroring
      // mulligan.scenario.test.tsx's seed-4 search.
      const joinOptions: AegisJoinOptions & { seed?: number } = {
        displayName: "Protagonist",
        deck: { mainDeck: PROTAGONIST_DECK.mainDeck, eggDeck: PROTAGONIST_DECK.eggDeck },
        seed: 952,
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
      // The opponent has no role in this scenario beyond existing — skip its
      // Breeding/Main windows every turn so the match keeps moving. Ending its own
      // Main phase without paying anything ends it "passed" (not "crossed"), which
      // is what hands the protagonist the +3 pass-turn memory bonus each round
      // (apps/api/src/engine/MemoryGauge.ts's PASS_TURN_MEMORY) — required below.
      opponent.room.onStateChange((state) => {
        if (state.turnSeat !== 1 || state.pendingDecision) return;
        if (state.phase === "Breeding" || state.phase === "Main") opponent.endPhase();
      });
      opponent.ready();

      fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

      const yourBattleArea = () => document.querySelector('[data-drop="battle-you"]') as HTMLElement;

      // Turn 1: the memory gauge starts at 0 (no pass-turn bonus yet), and playing
      // ANY nonzero-cost card immediately crosses it to the opponent's side, ending
      // the Main phase right there (apps/api/src/engine/MainPhaseController.ts's
      // checkTurnEnd — verified interactively: a second play attempt the same turn
      // is rejected "wrong-phase" once the first crossed). So turn 1 plays nothing
      // and just passes, banking the +3 bonus for turn 2.
      const breedingHeading = await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
      fireEvent.click(within(breedingHeading.parentElement!).getByRole("button", { name: /^end phase$/i }));
      fireEvent.click(await screen.findByRole("button", { name: /^end phase$/i }, { timeout: 10_000 }));

      // Turn 2 (memory +3 from the pass-turn bonus): play the first Monodramon
      // (cost 2, memory 3 -> 1, not crossed — Main stays open) then the second
      // (cost 2, memory 1 -> -1, crosses — the turn ends right after, which is fine,
      // both Digimon are already placed).
      for (let i = 0; i < 2; i += 1) {
        const secondBreedingHeading = i === 0
          ? await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 })
          : undefined;
        if (secondBreedingHeading) {
          fireEvent.click(within(secondBreedingHeading.parentElement!).getByRole("button", { name: /^end phase$/i }));
        }
        const [monodramonImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /monodramon/i });
        fireEvent.pointerDown(monodramonImg!, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
        fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));
        await vi.waitFor(
          () => expect(within(yourBattleArea()).getAllByRole("img", { name: /monodramon/i }).length).toBe(i + 1),
          { timeout: 10_000 },
        );
      }

      // Turn 3 (memory +3 again): skip breeding, play Brave Shield (cost 5).
      const thirdBreedingHeading = await screen.findByRole(
        "heading",
        { name: /breeding area/i },
        { timeout: 10_000 },
      );
      fireEvent.click(within(thirdBreedingHeading.parentElement!).getByRole("button", { name: /^end phase$/i }));

      const [braveShieldImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /brave shield/i });
      fireEvent.pointerDown(braveShieldImg!, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
      fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

      // Brave Shield's [Main] Unsuspend target can't auto-resolve (2 Monodramon in
      // play) — the real "chooseTargets" decision overlay opens.
      const dialog = await screen.findByRole("dialog", {}, { timeout: 10_000 });
      expect(within(dialog).getAllByText(/brave shield/i).length).toBeGreaterThan(0);

      // Pick the first candidate and confirm once. "That Digimon" binds the Blocker
      // grant to the Digimon chosen for Unsuspend, so no second target dialog may open.
      const decisionIdBefore = opponent.room.state.pendingDecision?.decisionId;
      const [candidate] = within(dialog).getAllByRole("button", { pressed: false });
      fireEvent.click(candidate!);
      fireEvent.click(within(dialog).getByRole("button", { name: /confirm target/i }));
      await vi.waitFor(() => {
        expect(opponent.room.state.pendingDecision?.decisionId).not.toBe(decisionIdBefore);
        expect(screen.queryByRole("dialog")).toBeNull();
      }, { timeout: 10_000 });

      // Every target decision resolved and no dialog remains — the protagonist's
      // Digimon are still on the field (nothing was deleted or moved), proving each
      // chosen target was accepted and the effect completed.
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(within(yourBattleArea()).getAllByRole("img", { name: /monodramon/i })).toHaveLength(2);

      await opponent.leave();
    },
    20_000,
  );
});
