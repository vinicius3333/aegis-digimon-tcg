// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CardBack } from "../design/cards";
import {
  clearCustomCardSleeve,
  getCardSleeveId,
  getEffectiveCardSleeveId,
  setCardSleeveId,
  setDeckSleeveId,
} from "../design/sleeve";
import { I18nProvider } from "../i18n";
import { en } from "../i18n/en";
import { DeckSleeveSelect } from "./DeckSleeveSelect";

beforeEach(() => {
  clearCustomCardSleeve();
  setCardSleeveId("omnimon");
  setDeckSleeveId(undefined);
});

afterEach(() => {
  cleanup();
  setDeckSleeveId(undefined);
});

describe("deck sleeve", () => {
  it("replaces the global sleeve on card backs while the deck is playing", () => {
    const { container } = render(<CardBack width={70} />);
    act(() => setDeckSleeveId("alphamon"));
    expect(container.querySelector('img[src="/sleeves/alphamon.webp"]')).toBeTruthy();
    expect(getCardSleeveId()).toBe("omnimon");

    act(() => setDeckSleeveId(undefined));
    expect(container.querySelector('img[src="/sleeves/omnimon.webp"]')).toBeTruthy();
  });

  it("falls back to the global sleeve for a sleeve this device cannot show", () => {
    setDeckSleeveId("custom");
    expect(getEffectiveCardSleeveId()).toBe("omnimon");
    setDeckSleeveId("retired-sleeve");
    expect(getEffectiveCardSleeveId()).toBe("omnimon");
  });

  it("keeps opponent and Digi-Egg backs on their own art", () => {
    setDeckSleeveId("alphamon");
    const { container } = render(
      <>
        <CardBack width={70} useSelectedSleeve={false} />
        <CardBack width={70} egg />
      </>,
    );
    expect(container.querySelector('img[src="/sleeves/alphamon.webp"]')).toBeNull();
  });
});

describe("DeckSleeveSelect", () => {
  it("offers the Settings sleeve by default and reports a chosen deck sleeve", () => {
    const onChange = vi.fn<(sleeveId: string | undefined) => void>();
    render(
      <I18nProvider>
        <DeckSleeveSelect sleeveId={undefined} onChange={onChange} />
      </I18nProvider>,
    );
    const select = screen.getByRole("combobox", { name: en["redesign.decks.editor.sleeve"] }) as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(select.selectedOptions[0]?.textContent).toBe("Settings sleeve (Omnimon)");

    fireEvent.change(select, { target: { value: "alphamon" } });
    expect(onChange).toHaveBeenLastCalledWith("alphamon");
  });

  it("returns to the Settings sleeve", () => {
    const onChange = vi.fn<(sleeveId: string | undefined) => void>();
    render(
      <I18nProvider>
        <DeckSleeveSelect sleeveId="alphamon" onChange={onChange} />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "" } });
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
