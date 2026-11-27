// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AegisClient } from "@/App";
import { I18nProvider } from "@/i18n/I18nProvider";

vi.mock("@/design/PixelBackdrop", () => ({ PixelBackdrop: () => null }));

vi.mock("./game/GameScreen", () => ({
  GameScreen: ({ startMode, roomCode }: { startMode: string; roomCode?: string }) => (
    <div data-testid="match">{`${startMode}:${roomCode}`}</div>
  ),
}));

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
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

it("opens a shared watch link straight into the spectated match", async () => {
  window.history.replaceState(null, "", "/play?watch=ABC234");

  renderClient();

  expect((await screen.findByTestId("match")).textContent).toBe("spectator:ABC234");
});
