// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardArts } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { loadDecks, saveDecks } from "../identity";
import { type DeckListing } from "../game/decks";
import { CardDetailDrawer } from "./cardLibrary";
import { DeckBuilder } from "./DeckBuilder";

afterEach(() => {
  cleanup();
  localStorage.clear();
});
const cardId = "BT1-010";
const alternate = () => getCardArts(cardId)[1]!.artId;
const deck = (): DeckListing => ({
  id: "art-deck",
  name: "Artwork deck",
  color: "Red",
  blurb: "",
  mainDeck: [cardId, cardId],
  eggDeck: [],
  mainDeckArts: [cardId, alternate()],
});

describe("card artwork choices", () => {
  it("browses alternate art without changing card identity", () => {
    render(
      <I18nProvider>
        <CardDetailDrawer cardId={cardId} onClose={() => undefined} />
      </I18nProvider>,
    );
    const button = screen.getByRole("button", { name: "Alternate 1" });
    fireEvent.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByAltText("Agumon")[0]!.getAttribute("src")).toContain(getCardArts(cardId)[1]!.imageId);
  });

  it("changes one existing copy, persists and reopens its artwork", async () => {
    const onSave = vi.fn<(deck: DeckListing, setActive: boolean) => void>();
    render(
      <I18nProvider>
        <DeckBuilder
          decks={[deck()]}
          activeDeckId="art-deck"
          initialEditingDeck={deck()}
          onSelectDeck={() => undefined}
          onSaveDeck={onSave}
          onNav={() => undefined}
        />
      </I18nProvider>,
    );
    const opener = screen.getByRole("button", { name: "Agumon · Choose artwork" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog", { name: "Choose artwork" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Alternate 1" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([alternate(), alternate()]));
    fireEvent.click(screen.getByRole("button", { name: "Copy 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Original" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([alternate(), cardId]));
    fireEvent.click(screen.getByRole("button", { name: "Apply selected art to all copies" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([cardId, cardId]));
    fireEvent.click(screen.getByRole("button", { name: "Alternate 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Apply selected art to all copies" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([alternate(), alternate()]));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Choose artwork" })).toBeNull();
    expect(document.activeElement).toBe(opener);
    saveDecks([onSave.mock.lastCall![0]]);
    expect(loadDecks()[0]?.mainDeckArts).toEqual([alternate(), alternate()]);
    expect(loadDecks()[0]?.mainDeck).toEqual([cardId, cardId]);
  });
});
