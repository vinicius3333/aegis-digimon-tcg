// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AegisClient } from "./App";
import { I18nProvider } from "./i18n";
import { loadReconnectSession, saveReconnectSession } from "./net/reconnectSession";
import type { StartMode } from "./screens/Lobby";
import { DECKS } from "./game/decks";

vi.mock("./screens/Lobby", () => ({
  Lobby: ({
    onStart,
    privateRoom,
  }: {
    onStart: (
      mode: StartMode,
      code?: string,
      botDeckId?: string,
      beta?: boolean,
      deckId?: string,
      unlimited?: boolean,
    ) => void;
    privateRoom?: { unlimited?: boolean; host?: boolean };
  }) => (
    <>
      <span data-testid="private-rules" data-host={String(privateRoom?.host)}>
        {String(privateRoom?.unlimited)}
      </span>
      <button onClick={() => onStart("bot", undefined, undefined, false, undefined, true)}>Start Unlimited bot</button>
      <button onClick={() => onStart("private_host", undefined, undefined, undefined, undefined, true)}>
        Start Unlimited private
      </button>
      <button onClick={() => onStart("bot")}>Start a new bot match</button>
      <button onClick={() => onStart("casual", undefined, undefined, undefined, "mystery-choice")}>
        Start mystery match
      </button>
    </>
  ),
}));

vi.mock("./game/GameScreen", () => ({
  GameScreen: ({
    startMode,
    joinOptions,
    unlimited,
    onRematch,
  }: {
    startMode: StartMode;
    joinOptions: { deckId?: string };
    unlimited?: boolean;
    onRematch?: (privateRoomCode?: string, unlimited?: boolean, privateHost?: boolean) => void;
  }) => (
    <div data-testid="match" data-deck-id={joinOptions.deckId} data-unlimited={String(unlimited)}>
      <span data-testid="match-status">
        {startMode}:{loadReconnectSession()?.roomId ?? "fresh"}
      </span>
      <button onClick={() => onRematch?.()}>Find rematch</button>
      <button onClick={() => onRematch?.("ABC234", true, true)}>Return to private lobby</button>
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

it("passes the hidden mystery choice to the game without changing the active deck", async () => {
  window.history.replaceState(null, "", "/play");
  const mystery = { ...DECKS[0]!, id: "mystery-choice", name: "Hidden choice" };
  render(
    <I18nProvider>
      <AegisClient
        player={{ name: "Tamer", color: "Blue", shards: 0 }}
        setPlayer={() => undefined}
        decks={[mystery]}
        activeDeckId={DECKS[1]!.id}
        setActiveDeckId={() => undefined}
        saveDeck={() => undefined}
        deleteDeck={() => undefined}
        dark={false}
        setDark={() => undefined}
      />
    </I18nProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Start mystery match" }));

  expect((await screen.findByTestId("match")).getAttribute("data-deck-id")).toBe(mystery.id);
});

it("starts a fresh bot match from the lobby after reloading the previous match", async () => {
  window.history.replaceState(null, "", "/play");
  saveReconnectSession({
    roomId: "previous-bot-room",
    reconnectionToken: "previous-bot-room:token",
    slot: "legacy",
    savedAt: Date.now(),
  });
  render(
    <I18nProvider>
      <AegisClient
        player={{ name: "Tamer", color: "Blue", shards: 0 }}
        setPlayer={() => undefined}
        decks={[]}
        activeDeckId=""
        setActiveDeckId={() => undefined}
        saveDeck={() => undefined}
        deleteDeck={() => undefined}
        dark={false}
        setDark={() => undefined}
      />
    </I18nProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Start a new bot match" }));

  expect((await screen.findByTestId("match-status")).textContent).toBe("bot:fresh");
  expect(loadReconnectSession()).toBeUndefined();
});

it("starts a fresh match with the same mode and deck when rematching", async () => {
  window.history.replaceState(null, "", "/play");
  const mystery = { ...DECKS[0]!, id: "mystery-choice", name: "Hidden choice" };
  render(
    <I18nProvider>
      <AegisClient
        player={{ name: "Tamer", color: "Blue", shards: 0 }}
        setPlayer={() => undefined}
        decks={[mystery]}
        activeDeckId={DECKS[1]!.id}
        setActiveDeckId={() => undefined}
        saveDeck={() => undefined}
        deleteDeck={() => undefined}
        dark={false}
        setDark={() => undefined}
      />
    </I18nProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Start mystery match" }));
  const previousMatch = await screen.findByTestId("match");
  saveReconnectSession({
    roomId: "previous-room",
    reconnectionToken: "previous-room:token",
    slot: "legacy",
    savedAt: Date.now(),
  });

  fireEvent.click(screen.getByRole("button", { name: "Find rematch" }));

  const nextMatch = await screen.findByTestId("match");
  expect(nextMatch).not.toBe(previousMatch);
  expect(nextMatch.getAttribute("data-deck-id")).toBe(mystery.id);
  expect(nextMatch.textContent).toContain("casual:fresh");
  expect(window.location.pathname).toBe("/play/game");
  expect(loadReconnectSession()).toBeUndefined();
});

it("carries Unlimited from lobby through App and retains authoritative private rematch rules", async () => {
  window.history.replaceState(null, "", "/play");
  render(
    <I18nProvider>
      <AegisClient
        player={{ name: "Tamer", color: "Blue", shards: 0 }}
        setPlayer={() => undefined}
        decks={[DECKS[0]!]}
        activeDeckId={DECKS[0]!.id}
        setActiveDeckId={() => undefined}
        saveDeck={() => undefined}
        deleteDeck={() => undefined}
        dark={false}
        setDark={() => undefined}
      />
    </I18nProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Start Unlimited private" }));
  expect((await screen.findByTestId("match")).getAttribute("data-unlimited")).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Return to private lobby" }));
  expect((await screen.findByTestId("private-rules")).textContent).toBe("true");
  fireEvent.click(screen.getByRole("button", { name: "Start Unlimited bot" }));
  expect((await screen.findByTestId("match")).getAttribute("data-unlimited")).toBe("true");
});

it("uses server host identity and Unlimited when a reloaded private match returns to the lobby", async () => {
  window.history.replaceState(null, "", "/play/game");
  saveReconnectSession({
    roomId: "private-room",
    reconnectionToken: "private-room:token",
    slot: "legacy",
    savedAt: Date.now(),
  });
  render(
    <I18nProvider>
      <AegisClient
        player={{ name: "Tamer", color: "Blue", shards: 0 }}
        setPlayer={() => undefined}
        decks={[DECKS[0]!]}
        activeDeckId={DECKS[0]!.id}
        setActiveDeckId={() => undefined}
        saveDeck={() => undefined}
        deleteDeck={() => undefined}
        dark={false}
        setDark={() => undefined}
      />
    </I18nProvider>,
  );
  fireEvent.click(await screen.findByRole("button", { name: "Return to private lobby" }));
  const rules = await screen.findByTestId("private-rules");
  expect(rules.textContent).toBe("true");
  expect(rules.getAttribute("data-host")).toBe("true");
});
