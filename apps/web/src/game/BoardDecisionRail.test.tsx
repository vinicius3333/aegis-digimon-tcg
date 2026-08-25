// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { BoardOptionalPrompt, BoardSelectionRail, OpponentSelectingPill } from "./BoardDecisionRail";
import { Hand } from "./boardPieces";

afterEach(() => cleanup());

const noop = () => {};

function renderIn(node: React.ReactNode) {
  return render(<I18nProvider>{node}</I18nProvider>);
}

describe("BoardSelectionRail", () => {
  it("shows the server's own prompt and the running count", () => {
    renderIn(
      <BoardSelectionRail
        prompt="Select 2 cards to trash."
        min={0}
        max={2}
        pickCount={1}
        canConfirm
        onConfirm={noop}
        onNoSelection={noop}
      />,
    );
    expect(screen.getByText("Select 2 cards to trash.")).toBeTruthy();
    expect(screen.getByText("1 selected of 0–2")).toBeTruthy();
  });

  it("offers No Selection only when the decision allows picking nothing", () => {
    const { unmount } = renderIn(
      <BoardSelectionRail
        prompt="Select 1 card."
        min={1}
        max={1}
        pickCount={0}
        canConfirm={false}
        onConfirm={noop}
        onNoSelection={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: "No Selection" })).toBeNull();
    unmount();

    renderIn(
      <BoardSelectionRail
        prompt="Select up to 1 card."
        min={0}
        max={1}
        pickCount={0}
        canConfirm
        onConfirm={noop}
        onNoSelection={noop}
      />,
    );
    expect(screen.getByRole("button", { name: "No Selection" })).toBeTruthy();
  });

  it("keeps End Selection disabled until the count is valid", () => {
    const onConfirm = vi.fn<() => void>();
    renderIn(
      <BoardSelectionRail
        prompt="Select 2 cards."
        min={2}
        max={2}
        pickCount={1}
        canConfirm={false}
        onConfirm={onConfirm}
        onNoSelection={noop}
      />,
    );
    const end = screen.getByRole("button", { name: "End Selection" }) as HTMLButtonElement;
    expect(end.disabled).toBe(true);
    fireEvent.click(end);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("returns to the dialog on Escape and on the back control", () => {
    const onOpenDialog = vi.fn<() => void>();
    renderIn(
      <BoardSelectionRail
        prompt="Select 1 card."
        min={1}
        max={1}
        pickCount={0}
        canConfirm={false}
        onConfirm={noop}
        onNoSelection={noop}
        onOpenDialog={onOpenDialog}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open the decision dialog" }));
    expect(onOpenDialog).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenDialog).toHaveBeenCalledTimes(2);
  });
});

describe("BoardOptionalPrompt", () => {
  it("asks the Use / Not use question against the source card's clause", () => {
    const onUse = vi.fn<() => void>();
    const onDecline = vi.fn<() => void>();
    renderIn(<BoardOptionalPrompt sourceCardId="ST1-07" clause="Draw 1 card." onUse={onUse} onDecline={onDecline} />);
    expect(screen.getByText("Will you use “Draw 1 card.”?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Not use" }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("names itself after the source card so the rail is addressable", () => {
    renderIn(<BoardOptionalPrompt sourceCardId="ST1-07" clause="Draw 1 card." onUse={noop} onDecline={noop} />);
    expect(screen.getByRole("region", { name: /· effect/i })).toBeTruthy();
  });
});

describe("OpponentSelectingPill", () => {
  it("says only that the opponent is choosing, never what", () => {
    renderIn(<OpponentSelectingPill />);
    const pill = screen.getByTestId("opponent-selecting-pill");
    expect(pill.textContent).toBe("The opponent is selecting cards.");
  });
});

describe("Hand in selection mode", () => {
  const cards = [
    {
      instanceId: "h1",
      cardId: "ST1-03",
      activatableEffectsJson: "",
      playableFromHand: true,
      projectedPlayCost: -1,
      digivolveTargetPermanentIds: [],
    },
    {
      instanceId: "h2",
      cardId: "ST1-03",
      activatableEffectsJson: "",
      playableFromHand: false,
      projectedPlayCost: -1,
      digivolveTargetPermanentIds: [],
    },
    {
      instanceId: "h3",
      cardId: "ST1-07",
      activatableEffectsJson: "",
      playableFromHand: false,
      projectedPlayCost: -1,
      digivolveTargetPermanentIds: [],
    },
  ];

  it("numbers picks in the order they were made and marks the rest unpickable", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    renderIn(
      <Hand
        cards={cards}
        startDrag={noop}
        selection={{ selectableInstanceIds: ["h1", "h2"], pickedInstanceIds: ["h2", "h1"], onToggle }}
      />,
    );
    const hand = screen.getByTestId("hand");
    expect(within(hand).getByRole("button", { name: /copy 1 of 2, selected$/ }).textContent).toBe("2");
    expect(within(hand).getByRole("button", { name: /copy 2 of 2, selected$/ }).textContent).toBe("1");
    expect(within(hand).getByRole("button", { name: "Pick Greymon" }).getAttribute("aria-disabled")).toBe("true");
  });

  it("routes a tap on a selectable card to the pick handler, and ignores the rest", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    renderIn(
      <Hand
        cards={cards}
        startDrag={noop}
        selection={{ selectableInstanceIds: ["h1"], pickedInstanceIds: [], onToggle }}
      />,
    );
    const hand = screen.getByTestId("hand");
    fireEvent.click(within(hand).getByRole("button", { name: /copy 1 of 2$/ }));
    fireEvent.click(within(hand).getByRole("button", { name: "Pick Greymon" }));
    expect(onToggle.mock.calls).toEqual([["h1"]]);
  });
});
