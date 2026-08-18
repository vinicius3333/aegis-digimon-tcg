// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Lobby } from "./Lobby";

afterEach(() => cleanup());

describe("famous deck selection", () => {
  it("separates personal decks and groups available famous decks by collection", () => {
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={[{ id: "mine", name: "My build", color: "Blue", blurb: "Custom", mainDeck: [], eggDeck: [] }]}
          activeDeckId="mine"
          onSelectDeck={() => undefined}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={() => undefined}
        />
      </I18nProvider>,
    );

    const personalDeck = within(screen.getByLabelText("Your decks")).getByRole("button", { name: /My build/ });
    const famousDeck = within(screen.getByRole("region", { name: "BT1" })).getByRole("button", {
      name: /Red Omnimon/,
    });
    expect(personalDeck.closest(".deck-list-card")).toBeTruthy();
    expect(famousDeck.closest(".deck-list-card")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Famous decks" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "BT1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "EX2" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "BT10" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "BT19" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "EX9" })).toBeNull();
  });

  it("selects a famous preset without adding it to personal decks", () => {
    const onSelectDeck = vi.fn<(id: string) => void>();
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={[]}
          activeDeckId=""
          onSelectDeck={onSelectDeck}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={() => undefined}
        />
      </I18nProvider>,
    );

    const bt1Group = screen.getByRole("heading", { name: "BT1" }).closest("section");
    if (!bt1Group) throw new Error("BT1 group is missing");
    fireEvent.click(within(bt1Group).getByRole("button", { name: /Red Omnimon/ }));

    expect(onSelectDeck).toHaveBeenCalledWith("bt1-red-omnimon");
    expect(screen.queryByRole("button", { name: /My build/ })).toBeNull();
  });
});
