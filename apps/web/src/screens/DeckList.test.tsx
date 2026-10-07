// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { en } from "../i18n/en";
import type { DeckListing } from "../game/decks";
import { DeckList } from "./DeckList";
import { getDeckListSort, setDeckListSort } from "./deckListOrder";

afterEach(() => {
  cleanup();
  setDeckListSort("recent");
});

const deck = (id: string, name: string, cardId: string, updatedAt: number): DeckListing => ({
  id,
  name,
  color: "Red",
  blurb: "",
  mainDeck: [cardId],
  eggDeck: [],
  updatedAt,
});

function renderList() {
  render(
    <I18nProvider>
      <DeckList
        decks={[deck("a", "Beta", "BT1-027", 1), deck("b", "Alpha", "BT1-009", 2), deck("c", "Gamma", "BT1-009", 3)]}
        activeDeckId="a"
        onEdit={() => undefined}
        onNew={() => undefined}
        onSelectDeck={() => undefined}
        onDelete={() => undefined}
        onPlay={() => undefined}
      />
    </I18nProvider>,
  );
}

const names = () => screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);

describe("DeckList order and filter", () => {
  it("lists the most recently edited deck first by default", () => {
    renderList();
    expect(names()).toEqual(["Gamma", "Alpha", "Beta"]);
  });

  it("re-sorts by the chosen order and remembers it", () => {
    renderList();
    fireEvent.change(screen.getByRole("combobox", { name: en["redesign.decks.list.sort"] }), {
      target: { value: "name" },
    });
    expect(names()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(getDeckListSort()).toBe("name");
  });

  it("filters by name and says when nothing matches", () => {
    renderList();
    const search = screen.getByRole("searchbox", { name: en["redesign.decks.list.search"] });
    fireEvent.change(search, { target: { value: "gam" } });
    expect(names()).toEqual(["Gamma"]);
    fireEvent.change(search, { target: { value: "omega" } });
    expect(screen.getByRole("status").textContent).toBe("No deck name contains “omega”.");
  });
});
