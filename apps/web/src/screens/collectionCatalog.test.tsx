// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { CardFull } from "../design/cards";
import { Collection } from "./Collection";
import { DeckBuilder } from "./DeckBuilder";

afterEach(() => cleanup());

function renderCollection() {
  Object.defineProperty(globalThis, "IntersectionObserver", {
    configurable: true,
    value: class {
      observe() {}
      disconnect() {}
    },
  });
  return render(
    <I18nProvider>
      <Collection />
    </I18nProvider>,
  );
}

function renderDeckBuilder() {
  return render(
    <I18nProvider>
      <DeckBuilder
        decks={[]}
        activeDeckId=""
        onSelectDeck={() => undefined}
        onSaveDeck={() => undefined}
        onNav={() => undefined}
      />
    </I18nProvider>,
  );
}

describe("rendered catalog visibility", () => {
  it("keeps card identity visible when an external art provider is unavailable", () => {
    render(
      <I18nProvider>
        <CardFull cardId="EX13-007" width={132} />
      </I18nProvider>,
    );
    const image = screen.getByAltText("Guilmon");
    fireEvent.error(image);
    fireEvent.error(screen.getByAltText("Guilmon"));
    fireEvent.error(screen.getByAltText("Guilmon"));
    expect(screen.getByText("Guilmon")).toBeTruthy();
    expect(screen.getByText("EX13-007")).toBeTruthy();
  });

  it("shows EX13 and the P-245 through P-250 promo wave in Collection search", async () => {
    renderCollection();
    const search = screen.getByRole("textbox", { name: "Search cards…" });

    fireEvent.change(search, { target: { value: "EX13-007" } });
    expect(screen.getByAltText("Guilmon")).toBeTruthy();

    for (const [id, name] of [
      ["P-245", "Kakkinmon"],
      ["P-246", "Motimon"],
      ["P-247", "Nyaromon"],
      ["P-248", "Veemon"],
      ["P-249", "Strabimon"],
      ["P-250", "Ogremon (X Antibody)"],
    ] as const) {
      fireEvent.change(search, { target: { value: id } });
      await waitFor(() => expect(screen.getByAltText(name)).toBeTruthy());
    }
  });

  it("shows the same EX13 and promo cards in the Deck Builder pool", async () => {
    renderDeckBuilder();
    fireEvent.click(screen.getByRole("button", { name: "New deck" }));
    const search = screen.getByRole("textbox", { name: "Search cards…" });

    fireEvent.change(search, { target: { value: "EX13-007" } });
    expect(screen.getByAltText("Guilmon")).toBeTruthy();

    const pool = screen.getByRole("main");
    for (const [id, name] of [
      ["P-245", "Kakkinmon"],
      ["P-246", "Motimon"],
      ["P-247", "Nyaromon"],
      ["P-248", "Veemon"],
      ["P-249", "Strabimon"],
      ["P-250", "Ogremon (X Antibody)"],
    ] as const) {
      fireEvent.change(search, { target: { value: id } });
      await waitFor(() => expect(within(pool).getByAltText(name)).toBeTruthy());
    }
  });
});
