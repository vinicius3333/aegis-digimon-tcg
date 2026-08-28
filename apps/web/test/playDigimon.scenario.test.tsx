// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";

/**
 * Proves historical migration ledger behavioral scenario "play-digimon":
 * from the protagonist's own Main phase, playing a Digimon from hand through the
 * real UI renders it in the battle area and the memory gauge reflects its cost
 *.
 */
scenario("play-digimon", () => {
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

  it("playing a Digimon from hand renders it in the battle area", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    // Seed 4: seat 0 (protagonist, RED_DECK) goes first and its dealt hand
    // contains a playable Lv.3 Digimon (BT1-012 "Biyomon", cost 3) alongside a
    // Tamer (mulligan.scenario.test.tsx / playTamer.scenario.test.tsx share it).
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
    opponent.ready();

    fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

    // The first player's breeding step opens automatically (the egg deck is
    // non-empty). The board's turn control only reads "End breeding" inside that
    // step, so waiting for that label is also what proves the match has started.
    await endBreedingStep();

    // Both the protagonist's and the opponent's battle areas render this same
    // placeholder text, so findByText (which requires a single match) doesn't
    // apply here — wait for the pair via findAllByText.
    await screen.findAllByText(/no digimon in play/i, {}, { timeout: 10_000 });
    expect(screen.getAllByText(/no digimon in play/i)).toHaveLength(2); // both empty battle areas

    // Select the first "Biyomon" in hand (the dealt hand has two) with a tap
    // (the gesture the real Hand component treats as click-to-select) and play it
    // via the action bar's
    // "Play Digimon" button.
    const [biyomonImg] = await screen.findAllByRole("img", { name: /biyomon/i });
    tap(biyomonImg!);
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

    // The Digimon now renders in the battle area (only the opponent's side is
    // still empty) and the memory gauge reflects its printed cost (3).
    await screen.findAllByRole("img", { name: /memory: -3/i }, { timeout: 10_000 });
    expect(screen.getAllByText(/no digimon in play/i)).toHaveLength(1);
    expect(screen.getAllByRole("img", { name: /biyomon/i }).length).toBeGreaterThan(0);

    // A newly played Digimon has no contextual action: summoning sickness prevents
    // attacking, and it is not in breeding. Activating it therefore opens the
    // dedicated stack viewer directly instead of an empty action menu.
    const biyomonPermanent = document.querySelector('[data-drop="perm-you"]') as HTMLElement;
    fireEvent.click(biyomonPermanent);
    expect(await screen.findByRole("button", { name: /^close$/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /view stack/i })).toBeNull();

    await opponent.leave();
  }, 20_000);
});
