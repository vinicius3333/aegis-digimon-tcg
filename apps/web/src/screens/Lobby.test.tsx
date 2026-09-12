// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Lobby } from "./Lobby";
import { DECKS } from "../game/decks";

afterEach(() => cleanup());

describe("famous deck selection", () => {
  it("launches beta matchmaking only after selecting the beta battle checkbox", () => {
    const onStart = vi.fn();
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={DECKS}
          activeDeckId={DECKS[0]!.id}
          onSelectDeck={() => undefined}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={onStart}
        />
      </I18nProvider>,
    );
    const checkbox = screen.getByRole("checkbox", { name: "Beta battle mode" });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Enter beta queue" }));
    expect(onStart).toHaveBeenCalledWith("beta");
    fireEvent.click(checkbox);
    expect(screen.queryByRole("button", { name: "Enter beta queue" })).toBeNull();
    expect(screen.getByRole("button", { name: "Enter queue" })).toBeTruthy();
  });

  it("requires the beta checkbox for an EX13 deck and keeps other modes unavailable", () => {
    const deck = { ...DECKS[0]!, mainDeck: [...DECKS[0]!.mainDeck] };
    deck.mainDeck[0] = "EX13-007";
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={[deck]}
          activeDeckId={deck.id}
          onSelectDeck={() => undefined}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={() => undefined}
        />
      </I18nProvider>,
    );
    expect((screen.getByRole("button", { name: "Enter queue" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Beta battle mode" }));
    expect((screen.getByRole("button", { name: "Enter beta queue" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Practice vs AI/ }));
    expect((screen.getByRole("button", { name: "Play vs Bot" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Private Match/ }));
    expect((screen.getByRole("button", { name: "Create Room" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("offers beta opt-in for bot battles and forwards it with the selected bot deck", () => {
    const onStart = vi.fn();
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={DECKS}
          activeDeckId={DECKS[0]!.id}
          onSelectDeck={() => undefined}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={onStart}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Practice vs AI/ }));
    const checkbox = screen.getByRole("checkbox", { name: "Beta battle mode" });
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole("button", { name: "Play vs Bot" }));
    expect(onStart).toHaveBeenCalledWith("bot", undefined, undefined, true);
  });
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
    const bt1 = screen.getByRole("region", { name: "BT1" });
    fireEvent.click(within(bt1).getByText("BT1"));
    const famousDeck = within(bt1).getByRole("button", { name: /Red Omnimon/ });
    expect(personalDeck.closest(".deck-list-card")).toBeTruthy();
    expect(famousDeck.closest(".deck-list-card")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Famous decks" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "BT1" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "EX2" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "BT10" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "BT19" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "EX9" })).toBeTruthy();
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

    const bt1Heading = screen.getByRole("heading", { name: "BT1" });
    const bt1Group = bt1Heading.closest("section");
    if (!bt1Group) throw new Error("BT1 group is missing");
    fireEvent.click(bt1Heading);
    fireEvent.click(within(bt1Group).getByRole("button", { name: /Red Omnimon/ }));

    expect(onSelectDeck).toHaveBeenCalledWith("bt1-red-omnimon");
    expect(screen.queryByRole("button", { name: /My build/ })).toBeNull();
  });
});
