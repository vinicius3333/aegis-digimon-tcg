// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

// BT14-035 "Unimon" (Yellow, Lv.4, cost 4, 5000 DP): printed "＜Barrier＞ (When this
// Digimon would be deleted in battle, by trashing the top card of your security
// stack, prevent that deletion.)" with no other clause — a pure keyword card,
// hard-castable from any deck regardless of color (Digimon TCG has no color
// requirement for hand-play). Swapped 1:1 for BLUE_DECK's BT1-043 (SaberLeomon,
// count 2 — under BT14-035's maxCountInDeck of 4) so the deck stays legal and the
// swap lands in the array slots BT1-043 held under the shuffle.
const PROTAGONIST_DECK = swapMainDeckCard(BLUE_DECK, "BT1-043", "BT14-035");

/**
 * Proves historical migration ledger behavioral scenario "barrier":
 * when a ＜Barrier＞ Digimon would be deleted in battle, the protagonist (its
 * controller) can accept the real Barrier prompt through the UI to trash their top
 * security card instead, preventing the deletion
 *. Unlike ＜Evade＞ (Comprehensive
 * Rules §16-22-1's "still unsuspended" cost requirement), ＜Barrier＞ has no such
 * restriction (apps/api/src/engine/combat/controller.ts's barrier check has no
 * isSuspended guard), so a Digimon suspended by declaring its own earlier attack
 * can legally receive the prompt when later attacked-and-would-be-deleted as a
 * permanent target. The protagonist is the DEFENDER responding to the deciding
 * prompt; the headless opponent delivers the attack that would delete it.
 */
scenario("barrier", () => {
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
    "accepting the Barrier prompt trashes a security card instead of deleting the Digimon",
    async () => {
      vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
      const { GameScreen } = await import("../src/game/GameScreen");

      // Seed 206: seat 0 (protagonist, swapped BLUE_DECK) goes first and its dealt
      // opening hand includes BT14-035 "Unimon" (5000 DP). The headless opponent's
      // (RED_DECK) opening hand includes BT1-020 "Groundramon" (Lv.5, cost 5, 6000
      // DP) — found by exhaustively searching seeds, mirroring
      // mulligan.scenario.test.tsx's seed-4 search. Groundramon's 6000 DP exceeds
      // Unimon's 5000 DP so the final battle has an unambiguous, deterministic
      // outcome; this seed's deterministic opponent top security card (BT1-090, an
      // Option) isn't a Digimon, so Unimon's own player-attack (to legally become
      // suspended) never risks a mandatory security battle.
      const joinOptions: AegisJoinOptions & { seed?: number } = {
        displayName: "Protagonist",
        deck: { mainDeck: PROTAGONIST_DECK.mainDeck, eggDeck: PROTAGONIST_DECK.eggDeck },
        seed: 206,
      };

      render(<GameScreen joinOptions={joinOptions} identityColor="Blue" startMode="casual" onExit={() => {}} />);

      await screen.findByText(/finding an opponent/i);

      const opponent = await joinHeadlessOpponent(server.endpoint, {
        displayName: "Headless Opponent",
        deck: { mainDeck: RED_DECK.mainDeck, eggDeck: RED_DECK.eggDeck },
      });
      opponent.onDecision((req) => {
        if (req.kind === "mulligan") opponent.mulligan(true);
      });
      opponent.ready();

      fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

      const yourBattleArea = () => document.querySelector('[data-drop="battle-you"]') as HTMLElement;
      const oppSecurity = () => document.querySelector('[data-drop="opp-security"]') as HTMLElement;

      // Turn 1 (protagonist): skip breeding, play Unimon (cost 4).
      const t1Breeding = await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
      fireEvent.click(within(t1Breeding.parentElement!).getByRole("button", { name: /^end phase$/i }));
      await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });

      const [unimonImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /^unimon$/i });
      fireEvent.pointerDown(unimonImg!, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
      fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));
      await vi.waitFor(
        () => expect(within(yourBattleArea()).getAllByRole("img", { name: /^unimon$/i })).toHaveLength(1),
        { timeout: 10_000 },
      );

      // Turn 2 (opponent): skip breeding, play Groundramon (cost 5).
      await vi.waitFor(() => expect(opponent.room.state.turnSeat).toBe(1), { timeout: 10_000 });
      if (opponent.room.state.phase === "Breeding") opponent.endPhase();
      await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });
      const groundramonEntry = opponent.room.state.players[1]!.hand.find((c) => c.cardId === "BT1-020")!;
      opponent.playCard(groundramonEntry.instanceId);
      await vi.waitFor(
        () => expect(opponent.room.state.players[1]!.battleArea.length).toBe(1),
        { timeout: 10_000 },
      );
      if (opponent.room.state.turnSeat === 1) opponent.endPhase();

      // Turn 3 (protagonist): Unimon entered turn 1, so it may attack — declare an
      // attack on the opponent's security to legally become suspended (a Digimon can
      // only be the target of a permanent-attack while suspended).
      await vi.waitFor(() => expect(opponent.room.state.turnSeat).toBe(0), { timeout: 10_000 });
      if (opponent.room.state.phase === "Breeding") {
        const t3Breeding = await screen.findByRole("heading", { name: /breeding area/i }, { timeout: 10_000 });
        fireEvent.click(within(t3Breeding.parentElement!).getByRole("button", { name: /^end phase$/i }));
      }
      await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });

      const unimonPermEl = within(yourBattleArea())
        .getByRole("img", { name: /^unimon$/i })
        .closest('[data-drop="perm-you"]') as HTMLElement;
      fireEvent.pointerDown(unimonPermEl, { clientX: 100, clientY: 100 });
      fireEvent.pointerUp(window, { clientX: 100, clientY: 100 });
      fireEvent.click(await screen.findByRole("button", { name: /^attack$/i }, { timeout: 10_000 }));
      fireEvent.click(oppSecurity());
      await vi.waitFor(
        () => expect(opponent.room.state.players[0]!.battleArea[0]!.isSuspended).toBe(true),
        { timeout: 10_000 },
      );

      // The attack checks the opponent's security — the protagonist's client also
      // renders the real SecurityOverlay for it (broadcast to both seats); dismiss it
      // if still showing, then hand the turn to the opponent through the
      // protagonist's own UI (attacking spends no memory, so the gauge never crosses
      // here on its own).
      const continueButton = screen.queryByRole("button", { name: /continue/i });
      if (continueButton) fireEvent.click(continueButton);
      if (opponent.room.state.turnSeat === 0) {
        fireEvent.click(await screen.findByRole("button", { name: /^end phase$/i }, { timeout: 10_000 }));
      }

      // Turn 4 (opponent): Groundramon entered turn 2, so it may attack — attack the
      // now-suspended Unimon directly (a legal permanent-attack target).
      await vi.waitFor(() => expect(opponent.room.state.turnSeat).toBe(1), { timeout: 10_000 });
      if (opponent.room.state.phase === "Breeding") opponent.endPhase();
      await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });
      const groundramonPermanentId = opponent.room.state.players[1]!.battleArea[0]!.permanentId;
      const unimonPermanentId = opponent.room.state.players[0]!.battleArea[0]!.permanentId;
      opponent.attack(groundramonPermanentId, { kind: "permanent", permanentId: unimonPermanentId });

      // Groundramon (6000 DP) beats Unimon (5000 DP) — Unimon would be deleted, so
      // the real Barrier prompt opens on the protagonist's screen.
      const acceptButton = await screen.findByRole("button", { name: /yes — trash security/i }, { timeout: 10_000 });
      fireEvent.click(acceptButton);

      // Answered-outcome proof: the protagonist's security count drops from 5 to 4
      // (the trashed-to-prevent-deletion cost) while Unimon survives, still rendered
      // in the protagonist's battle area instead of being deleted.
      await vi.waitFor(
        () => expect(opponent.room.state.players[0]!.securityCount).toBe(4),
        { timeout: 10_000 },
      );
      await vi.waitFor(
        () => expect(screen.queryByRole("button", { name: /yes — trash security/i })).toBeNull(),
        { timeout: 10_000 },
      );
      expect(within(yourBattleArea()).getAllByRole("img", { name: /^unimon$/i })).toHaveLength(1);

      await opponent.leave();
    },
    20_000,
  );
});
