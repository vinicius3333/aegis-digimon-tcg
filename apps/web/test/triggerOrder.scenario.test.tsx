// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

// BT1-085 "Tai Kamiya" (Red Tamer, playCost 4) and BT1-087 "T.K. Takaishi" (Yellow
// Tamer, playCost 4) both carry an identical "[Start of Your Turn] If you have 2 or
// less memory, set your memory to 3" effect. With one of each in play, both fire
// simultaneously at the start of the protagonist's turn. The engine raises a real
// `orderTriggers` decision listing both cards and resolves the selected card first.
//
// Swapped 1:1 for RED_DECK's BT1-090 (Gravity Crush, count 1 — within BT1-087's
// maxCountInDeck of 4) so the deck stays legal (deck-construction rules don't
// require mono-color) and the swap lands in the array slot BT1-090 held under the
// shuffle.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-090", "BT1-087");

scenario("trigger-order", () => {
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
    "selecting a card resolves the chosen simultaneous Start of Your Turn trigger first",
    async () => {
      vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
      const { GameScreen } = await import("../src/game/GameScreen");

      // Seed 8: seat 0 (protagonist) goes first and its dealt opening hand includes
      // both Tai Kamiya and T.K. Takaishi — found by exhaustively searching seeds
      // for the swapped RED_DECK, mirroring mulligan.scenario.test.tsx's seed-4
      // search.
      const joinOptions: AegisJoinOptions & { seed?: number } = {
        displayName: "Protagonist",
        deck: { mainDeck: PROTAGONIST_DECK.mainDeck, eggDeck: PROTAGONIST_DECK.eggDeck },
        seed: 8,
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
      // Drive the opponent explicitly: pass its first turn, then play a Blue
      // play-cost-2 rookie after both Tamers are established. The pass-turn +3 reset
      // (TurnStateMachine.endTurnWindow) only fires when a turn ends "passed" (never
      // crossed) — a clean pass ALWAYS resets the incoming player to a flat +3,
      // regardless of the outgoing player's leftover memory, so two turns of pure
      // passing can never leave the protagonist at the <=2 memory the Tamers'
      // "[Start of Your Turn]" trigger requires. Crossing the gauge on the
      // opponent's side (MemoryGauge.passTurn's mirror-without-reset) is the only
      // path there: the opponent enters its second turn at +1 (mirrored from the
      // protagonist's own cost-4 overspend), so paying the rookie's cost 2
      // overspends by 1, crosses to -1, and mirrors to the protagonist's turn 3 as
      // +1 — at or under the trigger's threshold.
      opponent.ready();

      fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

      const yourBattleArea = () => document.querySelector('[data-drop="battle-you"]') as HTMLElement;

      // Turns 1 and 2: memory starts at 0 (turn 1) then a flat +3 (turn 2's
      // pass-turn reset — TurnStateMachine.endTurnWindow sets the incoming player
      // to exactly +3 on any turn that ends "passed", regardless of the outgoing
      // player's leftover memory); each Tamer costs 4, so playing one crosses the
      // gauge negative and ends that turn immediately — one Tamer per turn.
      const names = [/tai kamiya/i, /t\.?k\.? takaishi/i];
      for (let i = 0; i < 2; i += 1) {
        const heading = await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
        fireEvent.click(within(heading.parentElement!).getByRole("button", { name: /^end phase$/i }));
        const [tamerImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: names[i]! });
        fireEvent.pointerDown(tamerImg!, { clientX: 100, clientY: 100 });
        fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
        fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));
        await vi.waitFor(
          () => expect(within(yourBattleArea()).getAllByRole("img", { name: names[i]! }).length).toBe(1),
          { timeout: 10_000 },
        );

        if (i === 0) {
          await vi.waitFor(
            () => {
              expect(opponent.room.state.turnSeat).toBe(1);
              expect(opponent.room.state.phase).toBe("Breeding");
            },
            { timeout: 10_000 },
          );
          opponent.endPhase();
          await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });
          opponent.endPhase();
        }
      }

      // T.K.'s lone mandatory [On Play] effect resolves directly and opens only
      // its meaningful card-selection decision.
      const confirmTargets = await screen.findByRole(
        "button",
        { name: /confirm targets/i },
        { timeout: 10_000 },
      );
      const securityChoice = screen.getByRole("dialog");
      const [selectableCard] = within(securityChoice).getAllByRole("button", { pressed: false });
      expect(selectableCard).toBeDefined();
      fireEvent.click(selectableCard!);
      fireEvent.click(confirmTargets);

      await vi.waitFor(
        () => {
          expect(opponent.room.state.turnSeat).toBe(1);
          expect(opponent.room.state.phase).toBe("Breeding");
        },
        { timeout: 10_000 },
      );
      opponent.endPhase();
      await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });
      const costTwoRookie = opponent.room.state.players[1]?.hand.find(
        (card) => card.cardId === "BT1-027" || card.cardId === "BT1-028",
      );
      expect(costTwoRookie).toBeDefined();
      opponent.playCard(costTwoRookie!.instanceId);

      // The protagonist's third turn (global turn 5): both Tamers' "[Start of Your
      // Turn]" effects fire at once — the real
      // "orderTriggers" decision opens before the turn's own Breeding window (it
      // gates the whole turn's timing resolution).
      await screen.findByText(/select the card whose effect resolves next/i, {}, { timeout: 10_000 });
      const dialog = screen.getByRole("dialog");

      const taiButton = within(dialog).getByRole("button", { name: /tai kamiya/i });
      fireEvent.click(taiButton);
      const resolveNext = within(dialog).getByRole("button", { name: /resolve next effect/i });
      await vi.waitFor(() => {
        expect(taiButton.getAttribute("aria-pressed")).toBe("true");
        expect((resolveNext as HTMLButtonElement).disabled).toBe(false);
      });
      fireEvent.click(resolveNext);

      // Tai sets memory to 3, so T.K.'s identical <=2 gate is no longer active
      // when the resolver re-collects. Waiting for the next phase is the stable
      // public proof that the selected effect was accepted and the modal closed.
      await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(within(yourBattleArea()).getAllByRole("img", { name: /tai kamiya/i })).toHaveLength(1);
      expect(within(yourBattleArea()).getAllByRole("img", { name: /t\.?k\.? takaishi/i })).toHaveLength(1);

      await opponent.leave();
    },
    20_000,
  );
});
