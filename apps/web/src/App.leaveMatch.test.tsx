// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { AegisClient } from "./App";
import { I18nProvider } from "./i18n";

vi.mock("./screens/Lobby", () => ({
  Lobby: ({ onStart }: { onStart: (mode: "casual") => void }) => (
    <button onClick={() => onStart("casual")}>Start match</button>
  ),
}));

vi.mock("./game/GameScreen", () => ({
  GameScreen: ({ onLeaveForfeitsChange }: { onLeaveForfeitsChange?: (forfeits: boolean) => void }) => {
    useEffect(() => {
      onLeaveForfeitsChange?.(true);
      return () => onLeaveForfeitsChange?.(false);
    }, [onLeaveForfeitsChange]);
    return <div data-testid="match" />;
  },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

function renderClient() {
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
}

function pressBrowserBack() {
  act(() => {
    window.history.replaceState(null, "", "/play");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

async function startMatch() {
  window.history.replaceState(null, "", "/play");
  renderClient();
  fireEvent.click(await screen.findByRole("button", { name: "Start match" }));
  await screen.findByTestId("match");
}

it("keeps a live match open and asks before the browser Back button leaves it", async () => {
  await startMatch();

  pressBrowserBack();

  expect(screen.getByRole("dialog", { name: "Leave this match?" })).toBeTruthy();
  expect(screen.getByTestId("match")).toBeTruthy();
  expect(window.location.pathname).toBe("/play/game");

  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

  expect(screen.queryByRole("dialog")).toBeNull();
  expect(screen.getByTestId("match")).toBeTruthy();
});

it("leaves the match once the player confirms", async () => {
  await startMatch();
  const back = vi.spyOn(window.history, "back").mockImplementation(pressBrowserBack);

  pressBrowserBack();
  fireEvent.click(screen.getByRole("button", { name: "Leave match" }));

  expect(back).toHaveBeenCalledOnce();
  expect(await screen.findByRole("button", { name: "Start match" })).toBeTruthy();
  expect(screen.queryByTestId("match")).toBeNull();
  expect(window.location.pathname).toBe("/play");
});
