// @vitest-environment jsdom
import {} from "./deckCounts";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getCardArts, isJapaneseArt } from "@aegis/shared";
import { I18nProvider } from "../i18n";
import { loadDecks, saveDecks } from "../identity";
import { type DeckListing } from "../game/decks";
import { CardDetailDrawer } from "./CardDetailDrawer";
import { DeckBuilder } from "./DeckBuilder";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
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
  it("1557582869973696582: detail artwork browsing does not float a duplicate preview over the editor", () => {
    const originalMatchMedia = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      ...originalMatchMedia(query),
      matches: true,
    }));
    const onArtChange = vi.fn<(artId: string) => void>();
    const onClose = vi.fn<() => void>();
    render(
      <I18nProvider>
        <CardDetailDrawer cardId="EX4-048" onClose={onClose} onArtChange={onArtChange} />
      </I18nProvider>,
    );
    const drawer = screen.getByRole("dialog", { name: "Card detail" });
    // Exercise the full image and every inline art choice under fine/hover media.
    for (const image of within(drawer).getAllByAltText("Gaiomon")) {
      fireEvent.mouseMove(image, { clientX: 320, clientY: 280 });
      expect(screen.getAllByAltText("Gaiomon").every((element) => drawer.contains(element))).toBe(true);
    }
    const alternateButton = within(drawer).getByRole("button", { name: "Alternate 1" });
    fireEvent.click(alternateButton);
    expect(alternateButton.getAttribute("aria-pressed")).toBe("true");
    expect(onArtChange).toHaveBeenCalledWith(getCardArts("EX4-048")[1]!.artId);
    fireEvent.click(within(drawer).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

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
          onDeleteDeck={() => undefined}
          onSelectDeck={() => undefined}
          onSaveDeck={onSave}
          onNav={() => undefined}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Agumon, 2 in deck" }));
    const opener = screen.getByRole("button", { name: "Agumon · Choose artwork" });
    opener.focus();
    fireEvent.click(opener);
    const picker = within(screen.getByRole("dialog", { name: "Choose artwork" }));
    fireEvent.click(picker.getByRole("button", { name: "Alternate 1" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([alternate(), alternate()]));
    fireEvent.click(picker.getByRole("button", { name: "Copy 2" }));
    fireEvent.click(picker.getByRole("button", { name: "Original" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([alternate(), cardId]));
    fireEvent.click(picker.getByRole("button", { name: "Use on all copies" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([cardId, cardId]));
    fireEvent.click(picker.getByRole("button", { name: "Alternate 1" }));
    fireEvent.click(picker.getByRole("button", { name: "Use on all copies" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([alternate(), alternate()]));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Choose artwork" })).toBeNull();
    expect(document.activeElement).toBe(opener);
    saveDecks([onSave.mock.lastCall![0]]);
    expect(loadDecks()[0]?.mainDeckArts).toEqual([alternate(), alternate()]);
    expect(loadDecks()[0]?.mainDeck).toEqual([cardId, cardId]);
  });
  it("1557582869973696582: browsing Gaiomon art preserves existing copies and unrelated cards when adding and saving", async () => {
    const gaiomon = "EX4-048";
    const gaiomonArts = getCardArts(gaiomon);
    const existing: DeckListing = {
      ...deck(),
      mainDeck: [gaiomon, gaiomon, cardId],
      mainDeckArts: [gaiomon, gaiomonArts[1]!.artId, cardId],
    };
    const onSave = vi.fn<(deck: DeckListing, setActive: boolean) => void>();
    render(
      <I18nProvider>
        <DeckBuilder
          decks={[existing]}
          activeDeckId={existing.id}
          initialEditingDeck={existing}
          onDeleteDeck={() => undefined}
          onSelectDeck={() => undefined}
          onSaveDeck={onSave}
          onNav={() => undefined}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Gaiomon, 2 in deck" }));
    const drawer = within(screen.getByRole("dialog", { name: "Card detail" }));
    fireEvent.click(drawer.getByRole("button", { name: "Alternate 1" }));
    expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual(existing.mainDeckArts);
    fireEvent.click(drawer.getByRole("button", { name: "Add Gaiomon" }));
    await waitFor(() => {
      expect(onSave.mock.lastCall?.[0].mainDeck).toEqual([gaiomon, gaiomon, gaiomon, cardId]);
      expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual([
        gaiomon,
        gaiomonArts[1]!.artId,
        gaiomonArts[1]!.artId,
        cardId,
      ]);
    });
    fireEvent.click(drawer.getByRole("button", { name: "Remove Gaiomon" }));
    await waitFor(() => expect(onSave.mock.lastCall?.[0].mainDeck).toEqual(existing.mainDeck));
    saveDecks([onSave.mock.lastCall![0]]);
    expect(loadDecks()[0]?.mainDeck).toEqual(existing.mainDeck);
    expect(loadDecks()[0]?.mainDeckArts).toEqual(existing.mainDeckArts);
  });

  it("marks Japanese printings with a JP badge", () => {
    render(
      <I18nProvider>
        <DeckBuilder
          decks={[deck()]}
          activeDeckId="art-deck"
          initialEditingDeck={deck()}
          onDeleteDeck={() => undefined}
          onSelectDeck={() => undefined}
          onSaveDeck={() => undefined}
          onNav={() => undefined}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Agumon, 2 in deck" }));
    fireEvent.click(screen.getByRole("button", { name: "Agumon · Choose artwork" }));
    const picker = within(screen.getByRole("dialog", { name: "Choose artwork" }));
    const japaneseIndex = getCardArts(cardId).findIndex((art) => isJapaneseArt(art.artId));
    const japanese = picker.getByRole("button", { name: `Alternate ${japaneseIndex}, Japanese printing` });
    expect(within(japanese).getByText("JP")).toBeTruthy();
    expect(within(picker.getByRole("button", { name: "Original" })).queryByText("JP")).toBeNull();
  });
});
