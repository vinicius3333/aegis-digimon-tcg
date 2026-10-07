// @vitest-environment jsdom
import { GameState, Phase, PlayerState, type Seat } from "@aegis/shared";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { GameScreen } from "./GameScreen";
import { DEFAULT_PACING, setBasePacing } from "./pacing";

vi.mock("../design/sound", () => ({
  playSound: vi.fn<(kind: string) => void>(),
  startMusic: vi.fn<() => void>(),
  stopMusic: vi.fn<() => void>(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  setBasePacing(DEFAULT_PACING);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setBasePacing(DEFAULT_PACING);
});

function seat(state: GameState, index: Seat, sessionId: string, displayName: string): void {
  const player = new PlayerState();
  player.seat = index;
  player.sessionId = sessionId;
  player.displayName = displayName;
  player.deckCount = 45;
  player.handCount = 5;
  state.players[index] = player;
}

it("Discord 1557352131416035499: a series player seated after their first state sync keeps their own seat", async () => {
  // A later series game holds whoever arrives first unseated until the other player joins, so
  // the first state this client decodes has no seat for it yet. Colyseus then seats it by
  // mutating that same state object in place.
  const state = new GameState();
  state.stateVersion = 1;
  state.phase = Phase.Main;
  seat(state, 0, "", "");
  seat(state, 1, "", "");
  const view = () => (
    <I18nProvider>
      <GameScreen
        joinOptions={{ displayName: "LynxForte", deck: { mainDeck: [], eggDeck: [] } }}
        identityColor="Blue"
        onExit={() => undefined}
        demoConnection={{
          room: undefined,
          status: "connected",
          error: undefined,
          state,
          events: [],
          decision: undefined,
          acknowledgeDecision: () => undefined,
          sessionId: "lynx",
          roomCode: "",
        }}
      />
    </I18nProvider>
  );
  const rendered = render(view());
  await act(async () => vi.advanceTimersByTimeAsync(0));

  seat(state, 0, "keybz", "Keybz");
  seat(state, 1, "lynx", "LynxForte");
  state.stateVersion = 2;
  rendered.rerender(view());
  await act(async () => vi.advanceTimersByTimeAsync(0));

  const opponentBar = document.querySelector(".game-opponent-bar");
  expect(opponentBar?.textContent).toContain("Keybz");
  expect(opponentBar?.textContent).not.toContain("LynxForte");
});
