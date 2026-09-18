// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Lobby } from "./Lobby";
import { DECKS } from "../game/decks";

afterEach(() => {
  cleanup();
  localStorage.removeItem("aegis:locale");
});

describe("famous deck selection", () => {
  it("translates automatic beta confirmation into Portuguese and confirms the human queue", () => {
    localStorage.setItem("aegis:locale", "pt-BR");
    const onStart = vi.fn();
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
          onStart={onStart}
        />
      </I18nProvider>,
    );
    expect(screen.getAllByText("Deck de batalha").length).toBeGreaterThan(0);
    expect(screen.queryByText(/A partida começa assim/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Entrar na fila beta" }));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Jogar com cartas beta?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onStart).toHaveBeenCalledWith("beta", undefined, undefined, true);
  });
  it("puts playable decks first, searches by name, and edits blocked decks", () => {
    const onSelectDeck = vi.fn();
    const onNav = vi.fn();
    const valid = { ...DECKS[0]!, id: "valid", name: "Playable build" };
    const invalid = { ...valid, id: "draft", name: "Draft build", mainDeck: [] };
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={[invalid, valid]}
          activeDeckId={valid.id}
          onSelectDeck={onSelectDeck}
          onCopyDeck={() => undefined}
          onNav={onNav}
          onStart={() => undefined}
        />
      </I18nProvider>,
    );
    const region = within(screen.getByLabelText("Your decks"));
    const selectors = region
      .getAllByRole("button")
      .filter((button) => button.classList.contains("deck-list-card__selector"));
    expect(selectors.map((button) => button.getAttribute("aria-label"))).toEqual([valid.name, invalid.name]);
    expect((selectors[1] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(selectors[1]!);
    expect(onSelectDeck).not.toHaveBeenCalled();
    fireEvent.change(region.getByRole("searchbox"), { target: { value: "DRAFT" } });
    expect(region.queryByRole("button", { name: valid.name })).toBeNull();
    fireEvent.click(region.getByRole("button", { name: "Edit" }));
    expect(onSelectDeck).toHaveBeenCalledWith(invalid.id);
    expect(onNav).toHaveBeenCalledWith("deck");
    fireEvent.change(region.getByRole("searchbox"), { target: { value: "missing" } });
    expect(region.getByRole("status").textContent).toBe("No decks match your search.");
  });
  it("keeps ordinary decks in the normal queue without a beta checkbox", () => {
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
    expect(screen.queryByRole("checkbox", { name: "Beta battle mode" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Enter beta queue" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Enter queue" }));
    expect(onStart).toHaveBeenCalled();
  });

  it("automatically enables beta for an EX13 deck and keeps private matches unavailable", () => {
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
    expect(screen.queryByRole("button", { name: "Enter queue" })).toBeNull();
    expect((screen.getByRole("button", { name: "Enter beta queue" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Practice vs AI/ }));
    expect((screen.getByRole("button", { name: "Play vs Bot" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /Private Match/ }));
    expect((screen.getByRole("button", { name: "Create Room" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("confirms beta bot battles before starting", () => {
    const onStart = vi.fn();
    const deck = { ...DECKS[0]!, mainDeck: [...DECKS[0]!.mainDeck] };
    deck.mainDeck[0] = "EX13-007";
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={[deck]}
          activeDeckId={DECKS[0]!.id}
          onSelectDeck={() => undefined}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={onStart}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Practice vs AI/ }));
    fireEvent.click(screen.getByRole("button", { name: "Play vs Bot" }));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Play with beta cards?" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onStart).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Play vs Bot" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
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
