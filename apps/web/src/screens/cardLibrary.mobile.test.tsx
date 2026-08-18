// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { I18nProvider } from "../i18n";
import { CardDetailDrawer, FilterRail, type CardFilter } from "./cardLibrary";

const emptyFilter: CardFilter = {
  query: "",
  setQuery: () => undefined,
  colors: [],
  kinds: [],
  levels: [],
  costs: [],
  rarities: [],
  sort: "name",
  traitQuery: "",
  setTraitQuery: () => undefined,
  set: "",
  setSet: () => undefined,
  availableSets: [],
  filtered: [],
  toggleColor: () => undefined,
  toggleKind: () => undefined,
  toggleLevel: () => undefined,
  toggleCost: () => undefined,
  toggleRarity: () => undefined,
  setSort: () => undefined,
  clear: () => undefined,
};

afterEach(() => cleanup());

it("opens and closes the mobile filter bottom sheet", () => {
  render(
    <I18nProvider>
      <FilterRail filter={emptyFilter} />
    </I18nProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  expect(screen.getByRole("dialog", { name: "Filters" })).toBeTruthy();

  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Filters" })).toBeNull();
});

it("shows the effective banlist limit in the mobile card drawer", () => {
  render(
    <I18nProvider>
      <CardDetailDrawer cardId="BT10-009" onClose={() => undefined} />
    </I18nProvider>,
  );

  expect(screen.getByText("LIMIT 1")).toBeTruthy();
  expect(screen.getByText("max 1 / deck")).toBeTruthy();
  expect(screen.queryByText("max 4 / deck")).toBeNull();
});

it("exposes the card drawer as a labelled modal with an accessible close action", () => {
  render(
    <I18nProvider>
      <CardDetailDrawer cardId="BT10-009" onClose={() => undefined} />
    </I18nProvider>,
  );

  expect(screen.getByRole("dialog", { name: "Card detail" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
});
