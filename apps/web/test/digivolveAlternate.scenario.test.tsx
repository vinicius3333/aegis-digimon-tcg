// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "./scenarioHarness/testingLibrary";
import { endBreedingStep } from "./scenarioHarness/breedingStep";
import { tap } from "./scenarioHarness/tap";
import { Client, type Room } from "@colyseus/sdk";
import type { GameState } from "@aegis/shared";
import type { AegisJoinOptions } from "../src/net/types";
import { RED_DECK, BLUE_DECK } from "@aegis-api/engine/testDecks.js";
import { swapMainDeckCard } from "./scenarioHarness/decks";
import { scenario } from "./scenarioHarness/scenario";
import { startTestServer, type TestServer } from "./scenarioHarness/server";
import { joinHeadlessOpponent } from "./scenarioHarness/headlessOpponent";
import { dragOnto } from "./scenarioHarness/dragDrop";
import { resolveIncidentalDecisionsThroughUi } from "./scenarioHarness/decisions";

// BT12-038 "GeoGreymon" (Lv.4 Yellow/Red, printed evoCost Red Lv.3 · 3 memory) also
// carries an alternate digivolution requirement: "Digivolve: 2 from Lv.3 w/[Agumon]
// in name and [Dinosaur] trait" (apps/api/src/engine/effects.json, compiled from the
// printed text). BT4-008 "Agumon" (Lv.3 Red, Dinosaur-type) satisfies BOTH the
// printed path (cost 3) and the alternate path (cost 2) simultaneously, which is
// exactly what makes the client offer a real choice (GameScreen.tsx's
// `digivolveWithChoice` only opens the EvoCostChoiceOverlay when 2+ paths match with
// distinct costs). BT4-008 has no [On Play] effect (unlike RED_DECK's own BT1-011
// "Agumon Expert", whose printed "return from recycle bin" ability is a known
// prose-compiler defect — apps/api/src/cards/BT1/BT1-011.ts's compiled IR uses the
// permanent-target `Return` primitive instead of a trash-zone one, so playing it
// returns the just-played Digimon itself to hand; BT4-008 avoids that entirely).
// Swapped 1:1 for RED_DECK's BT1-017 (Birdramon, count 3) and BT1-011 (Agumon
// Expert, count 4) so the deck stays legal and both swaps land in the array slots
// their originals held under the shuffle.
const PROTAGONIST_DECK = swapMainDeckCard(swapMainDeckCard(RED_DECK, "BT1-017", "BT12-038"), "BT1-011", "BT4-008");

/**
 * Proves historical migration ledger behavioral scenario "digivolve-alternate":
 * when a card offers both its printed digivolution cost and a cheaper alternate cost
 * onto the same base, the client presents a real choice, and picking the alternate
 * pays the ALTERNATE cost (not the printed one) through the real UI
 *.
 */
scenario("digivolve-alternate", () => {
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

  it("choosing the alternate digivolution cost for GeoGreymon pays 2 memory instead of the printed 3", async () => {
    vi.stubEnv("VITE_AEGIS_API_URL", server.endpoint);
    const { GameScreen } = await import("../src/game/GameScreen");

    // Seed 2: seat 0 (protagonist, the swapped deck) goes first and its dealt
    // opening hand includes BT4-008 "Agumon" and BT12-038 "GeoGreymon" — found by
    // exhaustively searching seeds, mirroring mulligan.scenario.test.tsx's seed-4
    // search.
    const joinOptions: AegisJoinOptions & { seed?: number } = {
      displayName: "Protagonist",
      deck: { mainDeck: PROTAGONIST_DECK.mainDeck, eggDeck: PROTAGONIST_DECK.eggDeck },
      seed: 2,
    };

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
    // every turn so the match keeps moving; see digivolveNormal.scenario.test.tsx
    // for why this can't race ahead of the protagonist's own turn here.
    opponent.room.onStateChange((state) => {
      if (state.turnSeat !== 1 || state.pendingDecision) return;
      if (state.phase === "Breeding" || state.phase === "Main") opponent.endPhase();
    });
    opponent.ready();

    fireEvent.click(await screen.findByRole("button", { name: /keep hand/i }, { timeout: 10_000 }));

    const yourBattleArea = () => document.querySelector('[data-drop="battle-you"]') as HTMLElement;

    // Turn 1: skip breeding, then play Agumon (cost 3, memory 0 -> -3) — this
    // immediately crosses the gauge and ends the Main phase, which is fine: Agumon
    // is already placed, and the crossing simply hands the turn to the opponent
    // (whose own pass banks the protagonist's next-turn +3 bonus).
    await endBreedingStep();
    // Clicking "end phase" only sends the intent; wait for the server round-trip to
    // actually land before interacting further (see digivolveNormal.scenario.test.tsx).
    await vi.waitFor(() => expect(opponent.room.state.phase).toBe("Main"), { timeout: 10_000 });

    const agumonsInHand = within(screen.getByTestId("hand")).getAllByRole("img", { name: /^agumon$/i });
    const agumonInstances = [...protagonistRoom!.state.players[0]!.hand].filter((card) => card.cardId === "BT4-008");
    expect(agumonInstances.length).toBe(agumonsInHand.length);
    const agumonInstanceId = agumonInstances[0]!.instanceId;
    const handCountBeforeAgumon = opponent.room.state.players[0]!.handCount;
    const deckCountBeforeAgumon = opponent.room.state.players[0]!.deckCount;
    const [agumonImg] = agumonsInHand;
    tap(agumonImg!);
    fireEvent.click(await screen.findByRole("button", { name: /play (digimon|tamer|option)/i }));

    await vi.waitFor(
      () => expect(within(yourBattleArea()).getAllByRole("img", { name: /^agumon$/i })).toHaveLength(1),
      { timeout: 10_000 },
    );
    await vi.waitFor(
      () => {
        const player = opponent.room.state.players[0]!;
        expect(player.battleArea[0]?.topCard.instanceId).toBe(agumonInstanceId);
        expect(player.handCount).toBe(handCountBeforeAgumon - 1);
        expect(player.deckCount).toBe(deckCountBeforeAgumon);
      },
      { timeout: 10_000 },
    );

    // Turn 3 (protagonist's second turn; memory +3 from the pass-turn bonus): skip
    // breeding, then drag GeoGreymon onto Agumon. Agumon is a legal attacker (any
    // unsuspended Digimon), which makes it "draggable" in the client and strips its
    // plain onClick digivolve-target handler — the production gesture for
    // digivolving onto a battle-area Digimon is therefore a drag-and-drop (see
    // digivolveNormal.scenario.test.tsx / dragDrop.ts).
    await endBreedingStep();
    await vi.waitFor(
      () => {
        expect(opponent.room.state.turnSeat).toBe(0);
        expect(opponent.room.state.phase).toBe("Main");
      },
      { timeout: 10_000 },
    );

    const agumonPermEl = within(yourBattleArea())
      .getByRole("img", { name: /^agumon$/i })
      .closest('[data-drop="perm-you"]') as HTMLElement;
    const [geoGreymonImg] = within(screen.getByTestId("hand")).getAllByRole("img", { name: /^geogreymon$/i });
    const geoGreymonInstances = [...protagonistRoom!.state.players[0]!.hand].filter(
      (card) => card.cardId === "BT12-038",
    );
    expect(geoGreymonInstances).toHaveLength(1);
    const geoGreymonInstanceId = geoGreymonInstances[0]!.instanceId;
    const handCountBeforeEvolution = opponent.room.state.players[0]!.handCount;
    const deckCountBeforeEvolution = opponent.room.state.players[0]!.deckCount;
    const agumonBattleInstanceId = opponent.room.state.players[0]!.battleArea[0]!.topCard.instanceId;
    const memoryBeforeEvolution = opponent.room.state.memory;
    dragOnto(geoGreymonImg!, agumonPermEl);

    // GeoGreymon matches BOTH the printed EvoCost (Red Lv.3, 3 memory) and the
    // alternate requirement ([Dinosaur] trait Lv.3, 2 memory) on Agumon — the
    // client can't auto-resolve a real choice, so it opens the EvoCostChoiceOverlay
    // instead of sending the digivolve intent immediately (contrast
    // digivolveNormal.scenario.test.tsx, where only one path matched).
    const alternateOption = await screen.findByRole(
      "button",
      { name: /dinosaur.*lv\.3.*2 memory/i },
      { timeout: 10_000 },
    );
    expect(screen.getByRole("button", { name: /red lv\.3.*3 memory/i })).toBeTruthy();
    fireEvent.click(alternateOption);

    // Choosing the alternate pays its cost (2), not the printed one (3): the memory
    // gauge reflects 3 (pass-turn bank) - 2 (alternate) = +1. Had the printed cost
    // (3) been paid instead, the gauge would read 0, not +1 — this is the proof
    // that the ALTERNATE path was the one actually used.
    await screen.findByText(/memory \+1/i, {}, { timeout: 10_000 });
    await resolveIncidentalDecisionsThroughUi(opponent);
    await vi.waitFor(() => expect(opponent.room.state.pendingDecision).toBeUndefined(), { timeout: 10_000 });
    await vi.waitFor(
      () => {
        const player = opponent.room.state.players[0]!;
        expect(opponent.room.state.memory).toBe(memoryBeforeEvolution - 2);
        expect(player.handCount).toBe(handCountBeforeEvolution);
        expect(player.deckCount).toBe(deckCountBeforeEvolution - 1); // digivolution's mandatory draw
        expect(player.battleArea[0]?.topCard.instanceId).toBe(geoGreymonInstanceId);
        expect(player.battleArea[0]?.stack.map((card) => card.instanceId)).toEqual([agumonBattleInstanceId]);
      },
      { timeout: 10_000 },
    );
    expect(within(yourBattleArea()).getAllByRole("img", { name: /^geogreymon$/i })).toHaveLength(1);
    expect(within(yourBattleArea()).queryAllByRole("img", { name: /^agumon$/i })).toHaveLength(0);

    await opponent.leave();
  }, 60_000);
});
