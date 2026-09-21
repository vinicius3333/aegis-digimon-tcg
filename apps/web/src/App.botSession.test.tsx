// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AegisClient } from "./App";
import { I18nProvider } from "./i18n";
import { loadReconnectSession, saveReconnectSession } from "./net/reconnectSession";
import type { StartMode } from "./screens/Lobby";

vi.mock("./screens/Lobby", () => ({
  Lobby: ({ onStart }: { onStart: (mode: StartMode) => void }) => (
    <button onClick={() => onStart("bot")}>Start a new bot match</button>
  ),
}));

vi.mock("./game/GameScreen", () => ({
  GameScreen: ({ startMode }: { startMode: StartMode }) => (
    <div data-testid="match">
      {startMode}:{loadReconnectSession()?.roomId ?? "fresh"}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
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
        dark={false}
        setDark={() => undefined}
      />
    </I18nProvider>,
  );

  fireEvent.click(await screen.findByRole("button", { name: "Start a new bot match" }));

  expect((await screen.findByTestId("match")).textContent).toBe("bot:fresh");
  expect(loadReconnectSession()).toBeUndefined();
});
