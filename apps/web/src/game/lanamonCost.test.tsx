// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { I18nProvider } from "../i18n";
import { EvoCostChoiceOverlay } from "./overlay/choice/EvoCostChoiceOverlay";

afterEach(() => cleanup());
import { type Permanent } from "@aegis/shared";
import { getDigivolveCostOptions, type EvoCostOption } from "./digivolveModel";

function base(cardId: string): Permanent {
  return {
    permanentId: "base",
    controllerSeat: 0,
    topCard: { cardId, instanceId: "top" },
    stack: [],
    inBreeding: false,
  } as unknown as Permanent;
}

describe("GitHub #5340 Lanamon frontend cost choices", () => {
  it.each([
    ["BT11-112", 2, "alternate"],
    ["BT12-021", 2, "normal"],
    ["BT12-025", 0, "alternate"],
  ] as const)("displays and selects the printed route for %s", (cardId, cost, type) => {
    const fallback = getDigivolveCostOptions("BT12-024", base(cardId));
    expect(fallback).toHaveLength(1);
    expect(fallback[0]).toMatchObject({ type, cost });
    expect(fallback[0]?.alternateRequirementIndex).toBe(cardId === "BT12-025" ? 0 : undefined);
    const projected = getDigivolveCostOptions("BT12-024", base(cardId), undefined, undefined, [
      { permanentId: "base", alternateRequirementIndex: cardId === "BT12-025" ? 0 : -1, projectedCost: cost },
    ]);
    expect(projected).toEqual(fallback);
  });
  it.each(["BT12-088", "BT1-009"])("offers no route onto %s", (cardId) => {
    expect(getDigivolveCostOptions("BT12-024", base(cardId))).toEqual([]);
  });
});

it.each([
  ["BT11-112", 2],
  ["BT12-021", 2],
  ["BT12-025", 0],
] as const)("GitHub #5340: displayed cost and selected route agree for %s", (cardId, cost) => {
  const options = getDigivolveCostOptions("BT12-024", base(cardId));
  const onConfirm = vi.fn<(option: EvoCostOption) => void>();
  render(
    <I18nProvider>
      <EvoCostChoiceOverlay
        evolvingCardId="BT12-024"
        baseCardId={cardId}
        memory={5}
        options={options}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    </I18nProvider>,
  );
  const button = screen.getByRole("button", { name: new RegExp(`${cost} memory, from 5 to ${5 - cost}`) });
  fireEvent.click(button);
  expect(onConfirm).toHaveBeenCalledWith(options[0]);
  expect(onConfirm.mock.calls[0]?.[0].cost).toBe(cost);
});

it.each([
  ["BT12-024", "BT12-025", "Calmaramon X"],
  ["BT12-025", "BT12-024", "Lanamon X"],
])("GitHub #5340: %s requires the exact slide base name", (card, baseId, name) => {
  const renamed = base(baseId);
  renamed.originalNameOverride = name;
  expect(getDigivolveCostOptions(card, renamed)).toEqual([]);
});

it("GitHub #5340 sweep: Calmaramon displays Tamer cost 3 and exact Lanamon cost 1", () => {
  expect(getDigivolveCostOptions("BT12-025", base("BT11-112"))).toEqual([
    expect.objectContaining({ cost: 3, type: "alternate" }),
  ]);
  expect(getDigivolveCostOptions("BT12-025", base("BT12-024"))).toEqual([
    expect.objectContaining({ cost: 1, alternateRequirementIndex: 0 }),
  ]);
});
