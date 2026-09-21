// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Lobby, randomDeckPool } from "./Lobby";
import { DECKS, selectableDecks } from "../game/decks";

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
    const picker = within(screen.getByRole("region", { name: "Choose your battle deck" }));
    const region = within(screen.getByLabelText("Your decks"));
    const selectors = region
      .getAllByRole("button")
      .filter((button) => button.classList.contains("deck-list-card__selector"));
    expect(selectors.map((button) => button.getAttribute("aria-label"))).toEqual([valid.name, invalid.name]);
    expect((selectors[1] as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(selectors[1]!);
    expect(onSelectDeck).not.toHaveBeenCalled();
    fireEvent.change(picker.getByRole("searchbox"), { target: { value: "DRAFT" } });
    expect(region.queryByRole("button", { name: valid.name })).toBeNull();
    fireEvent.click(region.getByRole("button", { name: "Edit" }));
    expect(onSelectDeck).toHaveBeenCalledWith(invalid.id);
    expect(onNav).toHaveBeenCalledWith("deck");
    fireEvent.change(picker.getByRole("searchbox"), { target: { value: "missing" } });
    expect(screen.getAllByText("No decks match your search.").length).toBe(2);
    expect(picker.getByRole("status").textContent).toBe("0 decks");
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

  it("keeps a random choice hidden and passes a legal deck only when starting", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "Mystery deck" }));
    expect(screen.getAllByText("Mystery deck").length).toBeGreaterThan(1);
    expect(screen.getByText("A legal deck will be chosen when the match begins.")).toBeTruthy();
    expect(screen.queryByText(/Randomly selected/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Enter queue" }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0]?.slice(0, 4)).toEqual(["casual", undefined, undefined, undefined]);
    expect(selectableDecks(DECKS).map((deck) => deck.id)).toContain(onStart.mock.calls[0]?.[4]);
  });

  it("builds mystery pools by source and excludes drafts and beta cards", () => {
    const legal = { ...DECKS[0]!, id: "legal-personal" };
    const draft = { ...DECKS[0]!, id: "draft-personal", mainDeck: [] };
    const beta = { ...DECKS[0]!, id: "beta-personal", mainDeck: [...DECKS[0]!.mainDeck] };
    beta.mainDeck[0] = "EX13-007";

    expect(randomDeckPool([legal, draft, beta], "mine").map((deck) => deck.id)).toEqual([legal.id]);
    expect(randomDeckPool([legal, draft, beta], "famous")).not.toContainEqual(expect.objectContaining({ id: legal.id }));
    expect(randomDeckPool([legal, draft, beta], "all")).toContainEqual(expect.objectContaining({ id: legal.id }));
  });

  it("automatically enables beta for an EX13 deck and still allows private matches", () => {
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
    expect((screen.getByRole("button", { name: "Create Room" }) as HTMLButtonElement).disabled).toBe(false);
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
    for (const set of ["BT1", "EX2", "BT10", "BT19", "EX9"]) {
      expect(screen.getByRole("heading", { name: set })).toBeTruthy();
    }
  });

  it("searches famous decks across collapsed collections and filters by owner", () => {
    const onSelectDeck = vi.fn<(id: string) => void>();
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={[{ id: "mine", name: "My build", color: "Blue", blurb: "Custom", mainDeck: [], eggDeck: [] }]}
          activeDeckId="mine"
          onSelectDeck={onSelectDeck}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={() => undefined}
        />
      </I18nProvider>,
    );

    const picker = within(screen.getByRole("region", { name: "Choose your battle deck" }));
    fireEvent.change(picker.getByRole("searchbox"), { target: { value: "omnimon" } });
    expect(picker.queryByRole("button", { name: /My build/ })).toBeNull();
    expect(picker.queryByRole("heading", { name: "EX2" })).toBeNull();
    const bt1 = picker.getByRole("region", { name: "BT1" });
    expect((bt1.querySelector("details") as HTMLDetailsElement).open).toBe(true);
    const useButtons = within(bt1).getAllByRole("button", { name: "Use deck" });
    expect(useButtons.length).toBeGreaterThan(0);
    fireEvent.click(useButtons[0]!);
    expect(onSelectDeck).toHaveBeenCalledWith("bt1-red-omnimon");

    fireEvent.change(picker.getByRole("searchbox"), { target: { value: "" } });
    fireEvent.click(picker.getByRole("button", { name: /^Mine/ }));
    expect(picker.getByRole("button", { name: /My build/ })).toBeTruthy();
    expect(picker.queryByRole("heading", { name: "Famous decks" })).toBeNull();
    fireEvent.click(picker.getByRole("button", { name: /^Famous/ }));
    expect(picker.queryByRole("button", { name: /My build/ })).toBeNull();
    expect(picker.getByRole("heading", { name: "Famous decks" })).toBeTruthy();
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

    const ex2 = screen.getByRole("region", { name: "EX2" });
    expect(within(ex2).queryAllByRole("button", { name: "Use deck" })).toHaveLength(0);
    fireEvent.click(within(ex2).getByText("EX2"));
    expect(within(ex2).getAllByRole("button", { name: "Use deck" }).length).toBeGreaterThan(0);
    const bt1Group = screen.getByRole("region", { name: "BT1" });
    fireEvent.click(within(bt1Group).getByText("BT1"));
    fireEvent.click(within(bt1Group).getByRole("button", { name: /Red Omnimon/ }));

    expect(onSelectDeck).toHaveBeenCalledWith("bt1-red-omnimon");
    expect(screen.queryByRole("button", { name: /My build/ })).toBeNull();
  });
});

describe("invite links", () => {
  it("opens the private join form with the invited code filled in", () => {
    const onStart = vi.fn();
    render(
      <I18nProvider>
        <Lobby
          player={{ name: "Tamer", color: "Blue", shards: 0 }}
          decks={[DECKS[0]!]}
          activeDeckId={DECKS[0]!.id}
          onSelectDeck={() => undefined}
          onCopyDeck={() => undefined}
          onNav={() => undefined}
          onStart={onStart}
          invitedRoomCode="AB12CD"
        />
      </I18nProvider>,
    );
    expect((screen.getByLabelText("Enter room code") as HTMLInputElement).value).toBe("AB12CD");
    fireEvent.click(screen.getByRole("button", { name: "Join Room" }));
    expect(onStart).toHaveBeenCalledWith("private_guest", "AB12CD");
  });
});
