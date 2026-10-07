// @vitest-environment jsdom
import { CardInstance, GameState, Phase, PlayerState, type Seat } from "@aegis/shared";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { setPileCountsShown } from "../design/pileCounts";
import { I18nProvider } from "../i18n";
import { ArenaCounters } from "./ArenaCounters";
import { GameScreen } from "./GameScreen";
import { Side } from "./side";
import { mediaRules, readRelative, readStylesheet } from "./style/stylesheetSource";

beforeEach(() => {
  localStorage.clear();
  setPileCountsShown(true);
});
afterEach(() => cleanup());

it.each([0, 1] as const)("maps both HUDs to the presented players for viewer seat %s", (viewerSeat: Seat) => {
  const state = new GameState();
  state.phase = Phase.Main;
  state.turnSeat = viewerSeat;
  const counts = [
    { eggs: 3, hand: 7, deck: 31, trash: 1 },
    { eggs: 4, hand: 12, deck: 27, trash: 2 },
  ];
  for (const seat of [0, 1] as const) {
    const player = new PlayerState();
    player.seat = seat;
    player.sessionId = `session-${seat}`;
    player.displayName = `Named player ${seat}`;
    player.eggDeckCount = counts[seat]!.eggs;
    player.handCount = counts[seat]!.hand;
    player.deckCount = counts[seat]!.deck;
    for (let index = 0; index < counts[seat]!.trash; index++) {
      const card = new CardInstance();
      card.cardId = "ST1-03";
      card.instanceId = `trash-${seat}-${index}`;
      card.ownerSeat = seat;
      player.trash.push(card);
    }
    state.players.push(player);
  }

  render(
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: `Named player ${viewerSeat}`, deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Red"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status: "connected",
          state,
          events: [],
          batches: [],
          decision: undefined,
          acknowledgeDecision: () => undefined,
          error: undefined,
          sessionId: `session-${viewerSeat}`,
          roomCode: "",
        }}
      />
    </I18nProvider>,
  );

  for (const [label, seat] of [
    ["You", viewerSeat],
    ["Opponent", 1 - viewerSeat],
  ] as const) {
    const counters = screen.getByRole("group", { name: label });
    expect(
      within(counters)
        .getAllByRole("img")
        .map((counter) => counter.textContent),
    ).toEqual([
      String(counts[seat]!.eggs),
      String(counts[seat]!.hand),
      String(counts[seat]!.deck),
      String(counts[seat]!.trash),
    ]);
  }
  // The viewer's name shows once, as the thin line over their hand tray, not as a plate beside the counters.
  expect(screen.getByText(`Named player ${viewerSeat}`).closest(".game-player-line")?.getAttribute("data-side")).toBe(
    "player",
  );
  expect(screen.queryByText(`· hand ${counts[viewerSeat]!.hand}`)).toBeNull();
});

it("describes live counters on hover, keyboard focus and tap, and dismisses with Escape or outside interaction", () => {
  localStorage.setItem("aegis:locale", "pt-BR");
  const view = render(
    <I18nProvider>
      <ArenaCounters side={Side.Opponent} eggs={3} hand={20} deck={16} trash={2} />
    </I18nProvider>,
  );
  expect(screen.queryByRole("tooltip")).toBeNull();
  const eggs = screen.getByRole("button", { name: "Ovos: 3 cartas no deck de ovos" });
  fireEvent.mouseEnter(eggs);
  expect(screen.getByRole("tooltip").textContent).toBe("Ovos: 3 cartas no deck de ovos");
  expect(eggs.getAttribute("aria-describedby")).toBe(screen.getByRole("tooltip").id);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).toBeNull();
  expect(eggs.hasAttribute("aria-describedby")).toBe(false);

  const hand = screen.getByRole("button", { name: "Mão: 20 cartas na mão" });
  fireEvent.focus(hand);
  expect(screen.getByRole("tooltip").textContent).toBe("Mão: 20 cartas na mão");
  view.rerender(
    <I18nProvider>
      <ArenaCounters side={Side.Opponent} eggs={3} hand={21} deck={15} trash={2} />
    </I18nProvider>,
  );
  expect(screen.getByRole("tooltip").textContent).toBe("Mão: 21 cartas na mão");
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole("tooltip")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Deck: 15 cartas para comprar" }));
  expect(screen.getByRole("tooltip").textContent).toBe("Deck: 15 cartas para comprar");
  view.unmount();
  expect(screen.queryByRole("tooltip")).toBeNull();
});

it("hides the counter chips when pile counts are off, keeping the counts for screen readers", () => {
  setPileCountsShown(false);
  const view = render(
    <I18nProvider>
      <ArenaCounters side={Side.Viewer} eggs={3} hand={5} deck={16} trash={2} />
    </I18nProvider>,
  );
  expect(view.container.querySelector(".game-arena-counters")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  expect(
    within(screen.getByRole("list", { name: "You" }))
      .getAllByRole("listitem")
      .map((item) => item.textContent),
  ).toEqual([
    "Eggs: 3 cards in the Digi-Egg deck",
    "Hand: 5 cards in hand",
    "Deck: 16 cards available to draw",
    "Trash: 2 discarded cards",
  ]);

  setPileCountsShown(true);
  view.rerender(
    <I18nProvider>
      <ArenaCounters side={Side.Viewer} eggs={3} hand={5} deck={16} trash={2} />
    </I18nProvider>,
  );
  expect(screen.getAllByRole("button")).toHaveLength(4);
  expect(screen.queryByRole("list")).toBeNull();
});

it("keeps only the opponent's hand chip, as a fallback for layouts without the card-back fan", () => {
  setPileCountsShown(false);
  const view = render(
    <I18nProvider>
      <ArenaCounters side={Side.Opponent} eggs={3} hand={5} deck={16} trash={2} />
    </I18nProvider>,
  );
  const fallback = view.container.querySelector(".game-arena-counters");
  expect(fallback?.hasAttribute("data-fan-fallback")).toBe(true);
  expect(
    within(fallback as HTMLElement)
      .getAllByRole("button")
      .map((button) => button.dataset.counter),
  ).toEqual(["hand"]);
});

it("reveals the opponent's hand fallback only where the card-back fan is hidden", () => {
  expect(readRelative("../arenaControls.css")).toMatch(
    /\.game-arena-counters\[data-fan-fallback\] \{\s*display:\s*none !important;/,
  );
  const landscapePhone = mediaRules(
    readStylesheet("game.css"),
    "(width < 600px) and (orientation: landscape), (height < 520px) and (orientation: landscape)",
  );
  expect(landscapePhone).toMatch(/\.game-opponent-hand \{\s*display:\s*none !important;/);
  expect(landscapePhone).toMatch(
    /\.game-opponent-bar > \.game-arena-counters\[data-fan-fallback\] \{\s*display:\s*flex !important;/,
  );
});
