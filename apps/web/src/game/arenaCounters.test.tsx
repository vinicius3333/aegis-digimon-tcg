// @vitest-environment jsdom
import { CardInstance, GameState, Phase, PlayerState, type Seat } from "@aegis/shared";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { GameScreen } from "./GameScreen";

beforeEach(() => localStorage.clear());
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
  expect(screen.queryByText(`Named player ${viewerSeat}`)).toBeNull();
  expect(screen.queryByText(`· hand ${counts[viewerSeat]!.hand}`)).toBeNull();
});
