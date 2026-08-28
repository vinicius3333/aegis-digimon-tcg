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

/**
 * Proves historical migration ledger behavioral scenario "attack-player":
 * declaring an attack against the opponent's security through the real UI resolves a
 * real security check — the top security card is revealed and the opponent's
 * security pile shrinks by one — through the real UI's attack-declaration affordance
 *.
 */
scenario("attack-player", () => {
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

  it("attacking the opponent's security through the real UI reveals and resolves a security card", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    // Seed 4: seat 0 (protagonist, RED_DECK) goes first and its dealt opening hand
    // includes BT1-012 "Biyomon" (Lv.3, cost 3, 2000 DP) — the same seed
    // playDigimon.scenario.test.tsx uses for its Biyomon draw.
    const joinOptions: AegisJoinOptions & { seed?: number } = {
      displayName: "Protagonist",
      deck: { mainDeck: RED_DECK.mainDeck, eggDeck: RED_DECK.eggDeck },
      seed: 4,
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
    // The opponent has no role beyond existing — skip its own Breeding/Main windows
    // every turn so the match keeps moving, banking the protagonist's pass-turn
    // memory bonus each round (apps/api/src/engine/MemoryGauge.ts's PASS_TURN_MEMORY).
    opponent.room.onStateChange((state) => {
      if (state.turnSeat !== 1 || state.pendingDecision) return;
      if (state.phase === "Breeding" || state.phase === "Main") opponent.endPhase();
    });
    opponent.ready();

    fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

    const yourBattleArea = () => document.querySelector('[data-drop="battle-you"]') as HTMLElement;
    const oppSecurity = () => document.querySelector('[data-drop="opp-security"]') as HTMLElement;

    // Turn 1: skip breeding, then play Biyomon (cost 3, memory 0 -> -3) — this
    // immediately crosses the gauge and ends the Main phase, handing the turn to
    // the opponent (whose own pass banks the protagonist's next-turn +3 bonus).
    await endBreedingStep();
    await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });

    const [biyomonImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /^biyomon$/i });
    tap(biyomonImg!);
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

    await vi.waitFor(
      () => expect(within(yourBattleArea()).getAllByRole("img", { name: /^biyomon$/i })).toHaveLength(1),
      { timeout: 10_000 },
    );

    // Turn 3 (protagonist's second turn; memory +3 from the pass-turn bonus): skip
    // breeding, then declare an attack with Biyomon (entered turn 1, so summoning
    // sickness — Comprehensive Rules §16-1 — has cleared by turn 3).
    await endBreedingStep();
    await vi.waitFor(
      () => {
        expect(opponent.room.state.turnSeat).toBe(0);
        expect(opponent.room.state.phase).toBe("Main");
      },
      { timeout: 10_000 },
    );

    expect(within(oppSecurity()).getByText("5")).toBeTruthy();

    // Open Biyomon's card menu (a tap: pointerdown+pointerup with no movement — the
    // same gesture digivolveNormal.scenario.test.tsx uses to open "View stack" for a
    // legal attacker, since any attack-eligible permanent is "draggable" and its
    // plain onClick is stripped in favor of the drag-to-attack onPointerDown;
    // GameScreen.tsx's handleTap still routes a non-moving tap to the card menu).
    const biyomonPermEl = within(yourBattleArea())
      .getByRole("img", { name: /^biyomon$/i })
      .closest('[data-drop="perm-you"]') as HTMLElement;
    tap(biyomonPermEl);
    fireEvent.click(await screen.findByRole("button", { name: /^attack$/i }, { timeout: 10_000 }));

    // With an attacker selected, the opponent's security pile becomes the
    // player-attack target (GameScreen.tsx wires its onClick to
    // `attack(selPerm, { kind: "player" })` while an attacker is selected).
    fireEvent.click(oppSecurity());

    // The real security check resolves: the centre-stage clash renders the revealed
    // card and its resolution, proving the attack actually reached the opponent's
    // security (not just that the intent was accepted). The scene is decoration —
    // it announces itself as a live region and retires on its own timer, so nothing
    // has to be dismissed before the match continues.
    const clash = await screen.findByTestId("security-clash", {}, { timeout: 10_000 });
    expect(clash.getAttribute("role")).toBe("status");
    expect(within(clash).getByText(/security check/i)).toBeTruthy();
    expect(within(clash).getAllByRole("img").length).toBeGreaterThan(0);
    expect(opponent.room.state.gameOver).toBe(false);

    // The opponent's security pile shrank from 5 to 4 — the answered-outcome proof.
    await vi.waitFor(() => expect(within(oppSecurity()).getByText("4")).toBeTruthy(), { timeout: 10_000 });

    await opponent.leave();
  }, 20_000);
});
