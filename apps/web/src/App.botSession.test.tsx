// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AegisClient } from "./App";
import { I18nProvider } from "./i18n";
import { loadReconnectSession, saveReconnectSession } from "./net/reconnectSession";
import type { StartMode } from "./screens/Lobby";
import { DECKS } from "./game/decks";

vi.mock("./screens/Lobby", () => ({
  Lobby: ({ onStart }: { onStart: (mode: StartMode, code?: string, botDeckId?: string, beta?: boolean, deckId?: string) => void }) => (
    <>
      <button onClick={() => onStart("bot")}>Start a new bot match</button>
      <button onClick={() => onStart("casual", undefined, undefined, undefined, "mystery-choice")}>Start mystery match</button>
    </>
  ),
}));

vi.mock("./game/GameScreen", () => ({
  GameScreen: ({ startMode, joinOptions }: { startMode: StartMode; joinOptions: { deckId?: string } }) => (
    <div data-testid="match" data-deck-id={joinOptions.deckId}>
      {startMode}:{loadReconnectSession()?.roomId ?? "fresh"}
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

  expect((await screen.findByTestId("match")).textContent).toBe("bot:fresh");
  expect(loadReconnectSession()).toBeUndefined();
});
