import { validateSealedDeck } from "@aegis/shared/sealed/validateSealedDeck";
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { createBlankDeck, type DeckListing } from "@/game/decks";
import { DeckEditor } from "@/screens/DeckEditor";

afterEach(() => cleanup());

const deck: DeckListing = {
  ...createBlankDeck([], "Red", "Sheet deck"),
  mainDeck: ["BT1-009", "BT1-009", "BT1-009", "BT1-009", "BT1-084", "BT1-085", "BT1-085", "BT1-090"],
  eggDeck: ["BT1-001", "BT1-001", "BT1-001", "BT1-001", "BT1-001"],
};

function renderEditor(editorDeck: DeckListing = deck) {
  render(
    <I18nProvider>
      <DeckEditor deck={editorDeck} onSave={() => undefined} onClose={() => undefined} onNav={() => undefined} />
    </I18nProvider>,
  );
}

describe("deck sheet bar", () => {
  it("shows the main and Digi-Egg counts and opens the deck sheet with its stats", () => {
    renderEditor();
    const bar = screen.getByRole("button", { name: /^View deck/ });
    expect(bar).toHaveProperty("textContent", expect.stringContaining("Main 8/50"));
    expect(bar).toHaveProperty("textContent", expect.stringContaining("Egg 5/5"));
    expect(bar.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(bar);

    expect(bar.getAttribute("aria-expanded")).toBe("true");
    const sheet = screen.getByRole("complementary", { name: "Deck information" });
    expect(sheet.className).toContain("deck-current--open");
    expect(within(sheet).getByText("Cost curve")).toBeTruthy();
    const typeCounts = Object.fromEntries(
      within(sheet)
        .getAllByRole("term")
        .map((term) => [term.textContent, term.nextElementSibling?.textContent]),
    );
    expect(typeCounts).toEqual({ Digimon: "5", Tamer: "2", Option: "1", "Digi-Egg": "5" });
  });

  it("keeps add and remove working from the open sheet", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: /^View deck/ }));
    const sheet = screen.getByRole("complementary", { name: "Deck information" });

    fireEvent.click(within(sheet).getByRole("button", { name: "Remove Tai Kamiya" }));

    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 7/50");
    fireEvent.click(within(sheet).getByRole("button", { name: "Add Tai Kamiya" }));
    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 8/50");
  });
});

describe("limited cards in historical deck pools", () => {
  it.each([
    ["LM-001", "Siriusmon", "BT15"],
    ["LM-051", "Alexandrite Memory Boost!", "EX13"],
  ] as const)("selects and adds copies of %s from its historical pool", async (cardId, name, format) => {
    renderEditor({ ...deck, mainDeck: [], eggDeck: [], format });
    fireEvent.change(screen.getByRole("textbox", { name: "Search name, number or text…" }), {
      target: { value: cardId },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Add" }));
    fireEvent.click(screen.getByRole("button", { name: /^View deck/ }));
    const sheet = screen.getByRole("complementary", { name: "Deck information" });
    const add = within(sheet).getByRole("button", { name: `Add ${name}` });
    expect(add).toHaveProperty("disabled", false);
    fireEvent.click(add);
    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 2/50");
  });

  it("keeps later limited cards unavailable in an earlier pool", () => {
    renderEditor({ ...deck, mainDeck: ["LM-051"], eggDeck: [], format: "BT13" });
    fireEvent.click(screen.getByRole("button", { name: /^View deck/ }));
    const sheet = screen.getByRole("complementary", { name: "Deck information" });
    expect(within(sheet).getByRole("button", { name: "Add Alexandrite Memory Boost!" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 1/50");
  });
});

describe("deck cover selection", () => {
  it("changes the cover from the header without opening card details", () => {
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Change cover" }));
    const picker = screen.getByRole("dialog", { name: "Change cover" });
    expect(within(picker).getAllByRole("button", { name: /Monodramon · BT1-009/ })).toHaveLength(1);
    fireEvent.click(within(picker).getByRole("button", { name: "Tai Kamiya · BT1-085" }));
    expect(screen.queryByRole("dialog", { name: "Change cover" })).toBeNull();
    const header = document.querySelector(".deck-current__cover-name");
    expect(header?.textContent).toContain("Tai Kamiya");
    fireEvent.click(screen.getByRole("button", { name: "Change cover" }));
    expect(screen.getByRole("button", { name: "Tai Kamiya · BT1-085" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("closes without changing the cover and disables selection for an empty deck", () => {
    renderEditor();
    const before = document.querySelector(".deck-current__cover-name")?.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Change cover" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Change cover" })).getByRole("button", { name: "Close" }),
    );
    expect(document.querySelector(".deck-current__cover-name")?.textContent).toBe(before);
    cleanup();
    renderEditor({ ...deck, mainDeck: [], eggDeck: [] });
    expect(screen.getByRole("button", { name: "Change cover" })).toHaveProperty("disabled", true);
  });
});

describe("bounded pulled-card editor", () => {
  function renderBounded(disabled = false) {
    const onSave = vi.fn<(next: DeckListing, setActive: boolean) => void>();
    const result = render(
      <I18nProvider>
        <DeckEditor
          deck={{ ...deck, mainDeck: [], eggDeck: [] }}
          onSave={onSave}
          onClose={() => undefined}
          onNav={() => undefined}
          boundedPool={{
            pulls: [
              ...Array.from({ length: 5 }, () => ({ cardId: "BT1-009" })),
              { cardId: "BT1-010" },
              { cardId: "BT1-001" },
            ],
            disabled,
            footer: <button>Ready bounded deck</button>,
          }}
        />
      </I18nProvider>,
    );
    return { ...result, onSave };
  }

  it("uses the real filters and preview, allowing five owned copies but never a sixth", () => {
    const { onSave } = renderBounded();
    expect(document.querySelectorAll(".deck-pool-card")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "Import" })).toBeNull();
    const card = document.querySelector('[data-pool-card="BT1-009"]')! as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "Add" }));
    for (let i = 1; i < 5; i++) {
      fireEvent.click(within(card).getByRole("button", { name: "Add" }));
    }
    expect(within(card).getByRole("button", { name: "Add" })).toHaveProperty("disabled", true);
    expect(onSave.mock.lastCall?.[0].mainDeck).toHaveLength(5);
    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 5/40");
    fireEvent.change(screen.getByRole("textbox", { name: "Search name, number or text…" }), {
      target: { value: "BT1-084" },
    });
    expect(document.querySelectorAll(".deck-pool-card")).toHaveLength(0);
    expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 5/40");
    fireEvent.change(screen.getByRole("textbox", { name: "Search name, number or text…" }), {
      target: { value: "BT1-009" },
    });
    fireEvent.click(
      within(document.querySelector('[data-pool-card="BT1-009"]')! as HTMLElement).getByRole("button", {
        name: "Remove",
      }),
    );
    expect(onSave.mock.lastCall?.[0].mainDeck).toHaveLength(4);
  });

  it("disables mutation when the server locks the pool", () => {
    renderBounded(true);
    for (const card of document.querySelectorAll<HTMLElement>(".deck-pool-card")) {
      expect(within(card).getByRole("button", { name: /Add|Max/ })).toHaveProperty("disabled", true);
    }
  });
});

it("caps bounded zones at forty main and five eggs while preserving exact pulled artwork", () => {
  const onSave = vi.fn<(next: DeckListing, setActive: boolean) => void>();
  render(
    <I18nProvider>
      <DeckEditor
        deck={{
          ...deck,
          mainDeck: Array<string>(39).fill("BT1-009"),
          mainDeckArts: Array<string>(39).fill("BT1-009"),
          eggDeck: Array<string>(4).fill("BT1-001"),
          eggDeckArts: Array<string>(4).fill("BT1-001"),
        }}
        onSave={onSave}
        onClose={() => undefined}
        onNav={() => undefined}
        boundedPool={{
          pulls: [
            ...Array.from({ length: 41 }, () => ({ cardId: "BT1-009" })),
            ...Array.from({ length: 6 }, () => ({ cardId: "BT1-001" })),
          ],
          disabled: false,
          footer: null,
        }}
      />
    </I18nProvider>,
  );
  const main = document.querySelector('[data-pool-card="BT1-009"]')! as HTMLElement;
  const eggs = document.querySelector('[data-pool-card="BT1-001"]')! as HTMLElement;
  fireEvent.click(within(main).getByRole("button", { name: "Add" }));
  fireEvent.click(within(eggs).getByRole("button", { name: "Add" }));
  expect(within(main).getByRole("button", { name: "Add" })).toHaveProperty("disabled", true);
  expect(within(eggs).getByRole("button", { name: "Add" })).toHaveProperty("disabled", true);
  expect(onSave.mock.lastCall?.[0].mainDeck).toHaveLength(40);
  expect(onSave.mock.lastCall?.[0].eggDeck).toHaveLength(5);
  expect(onSave.mock.lastCall?.[0].mainDeckArts).toEqual(Array<string>(40).fill("BT1-009"));
});

it("restores focus after inspecting a bounded card and closing with Escape", () => {
  render(
    <I18nProvider>
      <DeckEditor
        deck={{ ...deck, mainDeck: [], eggDeck: [] }}
        onSave={() => undefined}
        onClose={() => undefined}
        onNav={() => undefined}
        boundedPool={{ pulls: [{ cardId: "BT1-009" }], disabled: false, footer: null }}
      />
    </I18nProvider>,
  );
  const info = screen.getByRole("button", { name: "Card info" });
  info.focus();
  fireEvent.click(info);
  expect(screen.getByRole("dialog")).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(document.activeElement).toBe(info);
});

it("keeps each pulled printing conserved behind a canonical card with a two-copy limit", () => {
  const pulls = [
    ...Array.from({ length: 38 }, () => ({ cardId: "BT1-009" })),
    { cardId: "BT4-009" },
    { cardId: "BT4-009", artId: "BT4-009-J" },
  ];
  const onSave = vi.fn<(next: DeckListing, setActive: boolean) => void>();
  render(
    <I18nProvider>
      <DeckEditor
        deck={{
          ...deck,
          mainDeck: Array<string>(38).fill("BT1-009"),
          mainDeckArts: Array<string>(38).fill("BT1-009"),
          eggDeck: [],
        }}
        onSave={onSave}
        onClose={() => undefined}
        onNav={() => undefined}
        boundedPool={{ pulls, disabled: false, footer: null }}
      />
    </I18nProvider>,
  );
  const card = document.querySelector('[data-pool-card="BT4-009"]')! as HTMLElement;
  fireEvent.click(within(card).getByRole("button", { name: "Add" }));
  fireEvent.click(within(card).getByRole("button", { name: "Add" }));
  expect(within(card).getByRole("button", { name: "Add" })).toHaveProperty("disabled", true);
  let saved = onSave.mock.lastCall![0];
  expect(saved.mainDeckArts?.slice(-2)).toEqual(["BT4-009", "BT4-009-J"]);
  expect(validateSealedDeck({ pool: pulls, mainDeck: saved.mainDeckArts!, eggDeck: saved.eggDeckArts! }).ok).toBe(true);
  fireEvent.click(within(card).getByRole("button", { name: "Remove" }));
  fireEvent.click(within(card).getByRole("button", { name: "Add" }));
  saved = onSave.mock.lastCall![0];
  expect(saved.mainDeckArts?.slice(-2)).toEqual(["BT4-009", "BT4-009-J"]);
  fireEvent.click(within(card).getByRole("button", { name: "Card info" }));
  const artwork = within(screen.getByRole("dialog", { name: "Card detail" })).getByRole("group", { name: "Artwork" });
  const choices = within(artwork).getAllByRole("button");
  expect(choices).toHaveLength(2);
  fireEvent.click(choices[1]!);
  expect(choices[1]!.getAttribute("aria-pressed")).toBe("true");
  expect(onSave.mock.lastCall![0].mainDeckArts).toEqual(saved.mainDeckArts);
});

it("keeps constructed copy limits, the full catalog and import outside bounded mode", () => {
  renderEditor({ ...deck, mainDeck: Array<string>(4).fill("BT1-009"), eggDeck: [] });
  const search = screen.getByRole("textbox", { name: "Search name, number or text…" });
  fireEvent.change(search, { target: { value: "BT1-009" } });
  const card = document.querySelector('[data-pool-card="BT1-009"]')! as HTMLElement;
  const add = within(card).getByRole("button", { name: "Add" });
  expect(add).toHaveProperty("disabled", true);
  fireEvent.click(add);
  expect(screen.getByRole("button", { name: /^View deck/ }).textContent).toContain("Main 4/50");
  expect(screen.getByRole("button", { name: "Import" })).toBeTruthy();
  fireEvent.change(search, { target: { value: "BT4-009" } });
  expect(document.querySelector('[data-pool-card="BT4-009"]')).toBeTruthy();
});
