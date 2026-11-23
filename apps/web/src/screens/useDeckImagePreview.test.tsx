// @vitest-environment jsdom
import { I18nProvider } from "@/i18n/I18nProvider";
import type { DeckListing } from "@/game/decks";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";
import { useDeckImagePreview } from "./useDeckImagePreview";

const renderDeckImage = vi.hoisted(() => vi.fn<() => Promise<Blob>>(() => new Promise<Blob>(() => {})));
vi.mock("./deckImageExport", () => ({ renderDeckImage }));

const deck: DeckListing = {
  id: "deck-1",
  name: "Preview deck",
  color: "Red",
  blurb: "",
  mainDeck: ["BT1-010", "BT1-010"],
  eggDeck: ["BT1-001"],
};

function wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

it("keeps rendering the preview when the parent re-renders with an equal deck", () => {
  const view = renderHook(({ listing }) => useDeckImagePreview(listing), { initialProps: { listing: deck }, wrapper });
  view.rerender({ listing: { ...deck, mainDeck: [...deck.mainDeck] } });
  view.rerender({ listing: { ...deck, eggDeck: [...deck.eggDeck] } });
  expect(renderDeckImage).toHaveBeenCalledTimes(1);
  expect(view.result.current).toEqual({ status: "loading" });

  view.rerender({ listing: { ...deck, name: "Renamed deck" } });
  expect(renderDeckImage).toHaveBeenCalledTimes(2);
  view.unmount();
});
