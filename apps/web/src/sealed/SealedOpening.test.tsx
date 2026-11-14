import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { useSealedPackOpeningSource } from "@/sealed/useSealedPackOpeningSource";
import { SealedOpening } from "@/sealed/SealedOpening";
import { PackOpening } from "@/packOpening/PackOpening";
import { BOOSTER_PROGRESS_KEY } from "@/packOpening/BoosterProgress";
import type { SealedOwnPool } from "@aegis/shared/sealed/SealedContracts";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { drawBoosterPack } from "@aegis/shared/packOpening/drawBoosterPack";

vi.mock("@aegis/shared/packOpening/drawBoosterPack", () => ({
  drawBoosterPack: vi.fn<() => { cardId: string; nameEn: string; rarity: string }[]>(() =>
    Array.from({ length: 12 }, () => ({ cardId: "BT4-009", nameEn: "Agumon", rarity: "C" })),
  ),
}));
vi.mock("@/packOpening/scene/PackOpeningScene", () => ({
  PackOpeningScene: (props: {
    phase: string;
    cards: { cardId: string; artId?: string }[];
    onPhaseComplete: (phase: string) => void;
  }) => (
    <div
      data-testid="original-scene"
      data-phase={props.phase}
      data-cards={JSON.stringify(props.cards.map(({ cardId, artId }) => ({ cardId, artId })))}
    >
      <button onClick={() => props.onPhaseComplete("choosing")}>Settle carousel</button>
      <button onClick={() => props.onPhaseComplete("burst")}>Complete charge</button>
      <button onClick={() => props.onPhaseComplete("revealing")}>Complete tear</button>
    </div>
  ),
}));
beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn<() => void>();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});
const pool: SealedOwnPool = {
  configuration: getSealedConfiguration({ setId: "BT4" }),
  packs: Array.from({ length: 6 }, (_, index) => [
    { cardId: "BT4-104", artId: "BT4-104" },
    { cardId: `BT4-${String(index + 9).padStart(3, "0")}` },
  ]),
  revision: 0,
  window: "initial",
  deck: null,
  ready: false,
  editable: true,
  deadlineAt: Date.now() + 60000,
};
function Opening({ value }: { value: SealedOwnPool }) {
  const source = useSealedPackOpeningSource(value);
  return <SealedOpening source={source} onClose={() => undefined} />;
}
function openSealed(value = pool) {
  return (
    <I18nProvider>
      <Opening value={value} />
    </I18nProvider>
  );
}
it("uses the original lifecycle with immutable allocated cards and restores the exact reveal across polling and reopen", async () => {
  localStorage.setItem(
    BOOSTER_PROGRESS_KEY,
    JSON.stringify({
      version: 2,
      activeBox: {
        setId: "BT26",
        packs: [{ openedAt: 42, cards: Array.from({ length: 12 }, () => ({ cardId: "BT26-006" })) }],
      },
    }),
  );
  const before = localStorage.getItem(BOOSTER_PROGRESS_KEY);
  const view = render(openSealed());
  await screen.findByTestId("original-scene");
  fireEvent.click(screen.getByText("Settle carousel"));
  fireEvent.click(screen.getByRole("button", { name: "Open pack" }));
  expect(screen.getByTestId("original-scene").dataset.phase).toBe("charging");
  fireEvent.click(screen.getByText("Complete charge"));
  expect(screen.getByTestId("original-scene").dataset.phase).toBe("burst");
  fireEvent.click(screen.getByText("Complete tear"));
  expect(screen.getByTestId("original-scene").dataset.phase).toBe("revealing");
  expect(screen.getByText("1 / 2")).toBeTruthy();
  view.rerender(openSealed({ ...pool, revision: 1 }));
  expect(screen.getByText("1 / 2")).toBeTruthy();
  view.unmount();
  render(openSealed());
  await screen.findByTestId("original-scene");
  expect(screen.getByText("1 / 2")).toBeTruthy();
  expect(screen.getByTestId("original-scene").dataset.phase).toBe("revealing");
  fireEvent.click(screen.getByRole("button", { name: "Reveal all" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
  fireEvent.click(screen.getByRole("button", { name: "Open all packs (5)" }));
  expect(screen.getByRole("heading", { name: "All cards (10)" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Start next box" })).toBeNull();
  expect(screen.getByRole("combobox", { name: "Booster set" })).toHaveProperty("disabled", true);
  expect(drawBoosterPack).not.toHaveBeenCalled();
  expect(localStorage.getItem(BOOSTER_PROGRESS_KEY)).toBe(before);
  fireEvent.click(screen.getByText("Opened packs (6)"));
  expect(document.querySelectorAll(".pack-opening-progress__pack")).toHaveLength(6);
  fireEvent.click(document.querySelector<HTMLButtonElement>(".pack-opening-progress__pack")!);
  expect(JSON.parse(screen.getByTestId("original-scene").dataset.cards!)).toEqual(
    pool.packs[0]!.map(({ cardId, artId }) => ({ cardId, ...(artId && artId !== cardId ? { artId } : {}) })),
  );
  fireEvent.click(screen.getAllByRole("button", { name: /^Zoom / })[0]!);
  fireEvent.click(screen.getByRole("button", { name: "Card details" }));
  const detail = screen.getByRole("dialog", { name: "Card detail" });
  expect(within(detail).getByText("6 / 6 available")).toBeTruthy();
  expect(detail.querySelector(".card-detail-restriction")).toBeNull();
});
it("preserves the solo default box size, selection and random data source", async () => {
  render(
    <I18nProvider>
      <PackOpening />
    </I18nProvider>,
  );
  await screen.findByTestId("original-scene");
  expect(screen.getByRole("combobox", { name: "Booster set" })).toHaveProperty("disabled", false);
  expect(screen.getByText("24 / 24 packs remaining in this box")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
  fireEvent.click(screen.getByRole("button", { name: "Open pack" }));
  await waitFor(() => expect(drawBoosterPack).toHaveBeenCalledTimes(1));
  expect(localStorage.getItem(BOOSTER_PROGRESS_KEY)).toContain("BT4-009");
});

it("restores all six pack summaries after reconnect and equivalent manifest polls", async () => {
  const view = render(openSealed());
  await screen.findByTestId("original-scene");
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
  fireEvent.click(screen.getByRole("button", { name: "Open all packs (6)" }));
  const expected = pool.packs.flat().map((card) => ({ cardId: card.cardId, artId: card.artId ?? card.cardId }));
  expect(
    [...document.querySelectorAll<HTMLElement>(".pack-result-card")].map((card) => ({
      cardId: card.dataset.cardId,
      artId: card.dataset.artId,
    })),
  ).toEqual(expected);
  view.rerender(
    openSealed({ ...pool, packs: pool.packs.map((pack) => pack.map(({ cardId, artId }) => ({ artId, cardId }))) }),
  );
  expect(screen.getByRole("heading", { name: "All cards (12)" })).toBeTruthy();
  view.unmount();
  render(openSealed());
  await screen.findByTestId("original-scene");
  expect(screen.getByRole("heading", { name: "All cards (12)" })).toBeTruthy();
  fireEvent.click(screen.getByText("Opened packs (6)"));
  for (const [index, button] of [
    ...document.querySelectorAll<HTMLButtonElement>(".pack-opening-progress__pack"),
  ].entries()) {
    fireEvent.click(button);
    expect(
      [...document.querySelectorAll<HTMLElement>(".pack-result-card")].map((card) => ({
        cardId: card.dataset.cardId,
        artId: card.dataset.artId,
      })),
    ).toEqual(expected.slice(index * 2, index * 2 + 2));
  }
  expect(drawBoosterPack).not.toHaveBeenCalled();
});
it.each([1, 5])("counts only the completed pack when %i copies are preallocated", async (count) => {
  render(
    openSealed({
      ...pool,
      packs: Array.from({ length: 6 }, (_, index) => [{ cardId: index < count ? "BT4-104" : "BT4-009" }]),
    }),
  );
  await screen.findByTestId("original-scene");
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
  fireEvent.click(screen.getByRole("button", { name: "Open pack" }));
  fireEvent.click(screen.getByRole("button", { name: "Card details" }));
  const detail = screen.getByRole("dialog", { name: "Card detail" });
  expect(within(detail).getByText(`1 / 1 available`)).toBeTruthy();
  expect(detail.querySelector(".card-detail-restriction")).toBeNull();
  expect(detail.querySelectorAll(".card-detail-art-picker button").length).toBeLessThanOrEqual(1);
});
it("keeps the original fast controls usable when session storage is unavailable", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("unavailable");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("unavailable");
  });
  render(openSealed());
  await screen.findByTestId("original-scene");
  fireEvent.click(screen.getByRole("checkbox", { name: "Skip animations" }));
  fireEvent.click(screen.getByRole("button", { name: "Open all packs (6)" }));
  expect(screen.getByRole("heading", { name: "All cards (12)" })).toBeTruthy();
  expect(screen.getByRole("alert")).toBeTruthy();
  vi.restoreAllMocks();
});
