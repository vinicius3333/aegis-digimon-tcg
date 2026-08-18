// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { getCardDefinition, isDigimon, type CardDefinition, type CardInstance } from "@aegis/shared";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

// BT15-009 "Meramon": Lv.4 Red, playCost 3, DP 4000, printed "[Main][Once Per Turn]
// By paying 2 cost, delete 1 of your opponent's Digimon with DP less than or equal
// to this Digimon's DP" (A3-proven in apps/api/src/engine/mechanic.test.ts, "A3
// activated [Main] — the activateEffect verb"). Swapped 1:1 for RED_DECK's BT1-013
// (same playCost, same count) so the deck stays legal and the swap lands in exactly
// the array slot BT1-013 held under the shuffle — see the seed search below.
const PROTAGONIST_DECK = swapMainDeckCard(RED_DECK, "BT1-013", "BT15-009");

scenario("activate-main", () => {
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
    "activating a permanent's [Main] ability deletes the targeted opponent Digimon",
    async () => {
      vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
      const { GameScreen } = await import("../src/game/GameScreen");

      // Seed 18: seat 0 (protagonist) goes first (even seed) and its dealt opening
      // hand includes BT15-009 (found by exhaustively searching seeds for the
      // swapped RED_DECK, mirroring mulligan.scenario.test.tsx's seed-4 search).
      const joinOptions: AegisJoinOptions & { seed?: number } = {
        displayName: "Protagonist",
        deck: { mainDeck: PROTAGONIST_DECK.mainDeck, eggDeck: PROTAGONIST_DECK.eggDeck },
        seed: 18,
      };

      render(<GameScreen joinOptions={joinOptions} identityColor="Red" startMode="casual" onExit={() => {}} />);

      await screen.findByText(/finding an opponent/i);

      const opponent = await joinHeadlessOpponent(server.endpoint, {
        displayName: "Headless Opponent",
        deck: { mainDeck: BLUE_DECK.mainDeck, eggDeck: BLUE_DECK.eggDeck },
      });

      // The opponent plays the cheapest Digimon in its hand with DP <= 4000
      // (Meramon's DP, so it's always a legal Delete target) as soon as its own Main
      // phase opens, then ends its turn — a real intent round trip, not injected
      // state; the exact card depends only on what BLUE_DECK deals under this seed.
      let opponentPlayed = false;
      opponent.onDecision((req) => {
        if (req.kind === "mulligan") opponent.mulligan(true);
      });
      opponent.room.onStateChange((state) => {
        if (state.turnSeat !== 1 || state.pendingDecision) return;
        if (state.phase === "Breeding") { opponent.endPhase(); return; }
        if (state.phase !== "Main") return;
        if (!opponentPlayed) {
          const candidates: { c: CardInstance; def: CardDefinition }[] = [];
          for (const c of state.players[1]!.hand) {
            const def = getCardDefinition(c.cardId);
            if (def !== undefined && isDigimon(def) && (def.dp ?? 0) <= 4000) candidates.push({ c, def });
          }
          candidates.sort((a, b) => a.def.playCost - b.def.playCost);
          const target = candidates[0]?.c;
          if (target !== undefined) {
            opponentPlayed = true;
            opponent.playCard(target.instanceId);
            return;
          }
        }
        opponent.endPhase();
      });
      opponent.ready();

      fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

      // Protagonist's own Breeding window: nothing to do, end phase into Main, then
      // straight through Main (nothing to play yet) to pass the turn — the opponent
      // can't act until it's their turn.
      const breedingHeading = await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
      fireEvent.click(within(breedingHeading.parentElement!).getByRole("button", { name: /^end phase$/i }));
      fireEvent.click(await screen.findByRole("button", { name: /^end phase$/i }, { timeout: 10_000 }));

      // Wait for the opponent's real playCard round trip: their battle area
      // (rendered from synchronized state, not injected) goes from empty to one
      // Digimon.
      await vi.waitFor(() => expect(opponentPlayed).toBe(true), { timeout: 10_000 });
      await vi.waitFor(() => expect(opponent.room.state.players[1]!.battleArea.length).toBe(1), { timeout: 10_000 });

      // Protagonist's second turn: skip breeding again.
      const secondBreedingHeading = await screen.findByRole(
        "heading",
        { name: /breeding area/i },
        { timeout: 10_000 },
      );
      fireEvent.click(within(secondBreedingHeading.parentElement!).getByRole("button", { name: /^end phase$/i }));

      // Play BT15-009 (Meramon) from hand into the battle area.
      const [meramonImg] = await screen.findAllByRole("img", { name: /meramon/i }, { timeout: 10_000 });
      fireEvent.pointerDown(meramonImg!, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
      fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));
      await vi.waitFor(() => expect(opponent.room.state.players[0]!.battleArea.length).toBe(1), { timeout: 10_000 });

      // Activate Meramon's [Main] ability: the "⚡ Main" affordance button the board
      // renders on a permanent with an activatable effect (boardPieces.tsx).
      fireEvent.click(await screen.findByRole("button", { name: /main/i }, { timeout: 10_000 }));

      // The activation pays its "2 cost" and deletes the sole legal opponent Digimon
      // target: proven on the protagonist's own rendered DOM by the opponent's
      // battle-area placeholder ("no Digimon in play") reappearing, while the
      // protagonist's own side still renders Meramon.
      await screen.findByText(/no digimon in play/i, {}, { timeout: 10_000 });
      expect(screen.getAllByText(/no digimon in play/i)).toHaveLength(1); // only the opponent's side is empty
      expect(screen.getAllByRole("img", { name: /^meramon$/i }).length).toBeGreaterThan(0);
      await vi.waitFor(() => expect(opponent.room.state.players[1]!.battleArea.length).toBe(0), { timeout: 10_000 });

      await opponent.leave();
    },
    20_000,
  );
});
