// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EGG_SLEEVE,
  clearCustomCardSleeve,
  setCardSleeveId,
  setCustomCardSleeve,
  setEggSleeveId,
} from "../design/sleeve";
import { I18nProvider } from "../i18n";
import { en } from "../i18n/en";
import { DeckSleevePicker, type SleevePart } from "./DeckSleevePicker";

type SleeveIds = Record<SleevePart, string | undefined>;

function Harness({ initial, onChange }: { initial: SleeveIds; onChange?: (ids: SleeveIds) => void }) {
  const [ids, setIds] = useState(initial);
  return (
    <DeckSleevePicker
      sleeveIds={ids}
      onChange={(part, next) => {
        const updated = { ...ids, [part]: next };
        setIds(updated);
        onChange?.(updated);
      }}
    />
  );
}

function renderPicker(initial: SleeveIds = { main: undefined, egg: undefined }, onChange?: (ids: SleeveIds) => void) {
  return render(
    <I18nProvider>
      <Harness initial={initial} onChange={onChange} />
    </I18nProvider>,
  );
}

const openDialog = () => {
  fireEvent.click(screen.getByRole("button", { name: en["redesign.decks.editor.sleeveChangeLabel"] }));
  return screen.getByRole("dialog", { name: en["redesign.decks.editor.sleevesTitle"] });
};

const tileNames = (dialog: HTMLElement) =>
  [...dialog.querySelectorAll(".deck-sleeve-tile__name")].map((name) => name.textContent);

beforeEach(() => {
  clearCustomCardSleeve();
  setCardSleeveId("omnimon");
  setEggSleeveId(DEFAULT_EGG_SLEEVE.id);
});

afterEach(() => cleanup());

describe("deck sleeve trigger", () => {
  it("names both sleeves and says when they come from Settings", () => {
    renderPicker();
    const main = screen.getByTestId("deck-sleeve-main");
    const egg = screen.getByTestId("deck-sleeve-egg");
    expect(main.textContent).toContain("Omnimon");
    expect(main.textContent).toContain(en["redesign.decks.editor.sleeveFromSettings"]);
    expect(egg.textContent).toContain("Digi-Egg");
    expect(egg.textContent).toContain(en["redesign.decks.editor.sleeveFromSettings"]);
  });

  it("shows the deck's own sleeves without the Settings note", () => {
    renderPicker({ main: "alphamon", egg: "gold" });
    expect(screen.getByTestId("deck-sleeve-main").textContent).toBe("SleeveAlphamon");
    expect(screen.getByTestId("deck-sleeve-egg").textContent).toBe("Digi-EggsGold");
  });

  it("falls back to the Settings sleeve for an image this device does not have", () => {
    renderPicker({ main: "custom", egg: undefined });
    expect(screen.getByTestId("deck-sleeve-main").textContent).toContain("Omnimon");
  });
});

describe("deck sleeve dialog", () => {
  it("pins the Settings sleeve, then the uploaded image, before the catalog", () => {
    setCustomCardSleeve("data:image/webp;base64,c2xlZXZl");
    renderPicker();
    const dialog = openDialog();
    expect(tileNames(dialog).slice(0, 3)).toEqual([
      en["redesign.decks.editor.sleeveUseSettings"],
      en["settings.sleeveCustom"],
      "Digimon Card Game",
    ]);
  });

  it("puts the Digi-Egg back right after the Settings choice in the Digi-Eggs tab, once", () => {
    renderPicker();
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByRole("tab", { name: en["redesign.decks.editor.sleeveTabEgg"] }));
    const names = tileNames(dialog);
    expect(names.slice(0, 3)).toEqual([en["redesign.decks.editor.sleeveUseSettings"], "Digi-Egg", "Digimon Card Game"]);
    expect(names.filter((name) => name === "Digi-Egg")).toHaveLength(1);
  });

  it("applies a pick to the tab's deck part at once", () => {
    const onChange = vi.fn<(ids: SleeveIds) => void>();
    renderPicker(undefined, onChange);
    const dialog = openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Alphamon, Official Card Sleeves" }));
    expect(onChange).toHaveBeenLastCalledWith({ main: "alphamon", egg: undefined });
    expect(
      within(dialog).getByRole("button", { name: "Alphamon, Official Card Sleeves" }).getAttribute("aria-pressed"),
    ).toBe("true");

    fireEvent.click(within(dialog).getByRole("tab", { name: en["redesign.decks.editor.sleeveTabEgg"] }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Gold, Official Card Sleeves" }));
    expect(onChange).toHaveBeenLastCalledWith({ main: "alphamon", egg: "gold" });

    fireEvent.click(
      within(dialog).getByRole("button", { name: new RegExp(en["redesign.decks.editor.sleeveUseSettings"]) }),
    );
    expect(onChange).toHaveBeenLastCalledWith({ main: "alphamon", egg: undefined });
  });

  it("marks the Settings tile while the deck follows Settings", () => {
    renderPicker();
    const dialog = openDialog();
    const settingsTile = within(dialog).getByRole("button", {
      name: new RegExp(en["redesign.decks.editor.sleeveUseSettings"]),
    });
    expect(settingsTile.getAttribute("aria-pressed")).toBe("true");
    expect(
      within(dialog).getByRole("button", { name: "Omnimon, Official Card Sleeves" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("switches tabs with the arrow keys", () => {
    renderPicker();
    const dialog = openDialog();
    const mainTab = within(dialog).getByRole("tab", { name: en["redesign.decks.editor.sleeveTabMain"] });
    const eggTab = within(dialog).getByRole("tab", { name: en["redesign.decks.editor.sleeveTabEgg"] });
    expect(mainTab.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(mainTab, { key: "ArrowRight" });
    expect(eggTab.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(eggTab);
    expect(eggTab.tabIndex).toBe(0);
    expect(mainTab.tabIndex).toBe(-1);
    fireEvent.keyDown(eggTab, { key: "ArrowRight" });
    expect(mainTab.getAttribute("aria-selected")).toBe("true");
  });

  it("closes on Escape and returns focus to the trigger", () => {
    renderPicker();
    const trigger = screen.getByRole("button", { name: en["redesign.decks.editor.sleeveChangeLabel"] });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
