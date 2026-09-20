// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import {
  BoardAlliancePrompt,
  BoardBlockPrompt,
  BoardOptionalPrompt,
  BoardSelectionRail,
  OpponentSelectingPill,
} from "./BoardDecisionRail";
import { CardOpenerProvider } from "./cardLinks";
import { Hand } from "./piece";

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

  it("hides No Selection when the selection is mandatory", () => {
    const { unmount } = renderIn(
      <BoardSelectionRail
        prompt="Select 1 card."
        fieldSelection
        min={1}
        max={1}
        pickCount={0}
        canConfirm={false}
        onConfirm={noop}
        onNoSelection={noop}
      />,
    );
    expect(screen.queryByRole("button", { name: "No Selection" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass" })).toBeNull();
    unmount();
  });

  it("offers an active Pass action for an optional field selection", () => {
    const onNoSelection = vi.fn<() => void>();
    renderIn(
      <BoardSelectionRail
        prompt="Select up to 1 card."
        fieldSelection
        min={0}
        max={1}
        pickCount={0}
        canConfirm
        onConfirm={noop}
        onNoSelection={onNoSelection}
      />,
    );
    expect((screen.getByRole("button", { name: "Pass" }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Pass" }));
    expect(onNoSelection).toHaveBeenCalledTimes(1);
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

  it("keeps End Selection disabled with no selected cards, including an optional selection", () => {
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
    expect((screen.getByRole("button", { name: "End Selection" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps Escape available without showing a dialog button", () => {
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
    expect(screen.queryByRole("button", { name: "Open the decision dialog" })).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenDialog).toHaveBeenCalledTimes(1);
  });

  it("shows and opens the source card art when the selection came from a card effect", () => {
    const opened: string[] = [];
    renderIn(
      <CardOpenerProvider onOpenCard={(cardId) => opened.push(cardId)}>
        <BoardSelectionRail
          sourceCardId="ST1-07"
          prompt="Select 1 card."
          clause="Draw 1 card."
          min={1}
          max={1}
          pickCount={0}
          canConfirm={false}
          onConfirm={noop}
          onNoSelection={noop}
        />
      </CardOpenerProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /^Open / }));
    expect(opened).toEqual(["ST1-07"]);
  });
});

describe("board prompt scrim", () => {
  it("mounts a scrim beside the rail for the phone stylesheet to show", () => {
    const { container } = renderIn(
      <BoardOptionalPrompt sourceCardId="ST1-07" clause="Draw 1 card." onUse={noop} onDecline={noop} />,
    );
    const scrim = container.querySelector(".board-prompt-scrim");
    expect(scrim).toBeTruthy();
    expect(scrim?.nextElementSibling?.classList.contains("board-prompt")).toBe(true);
  });

  it("tags a yes/no prompt so the phone sheet may cover the hand, and a hand selection so it must not", () => {
    const prompt = renderIn(
      <BoardOptionalPrompt sourceCardId="ST1-07" clause="Draw 1 card." onUse={noop} onDecline={noop} />,
    );
    expect(prompt.container.querySelector('.board-prompt[data-variant="prompt"]')).toBeTruthy();
    expect(prompt.container.querySelector('.board-prompt-scrim[data-variant="prompt"]')).toBeTruthy();
    prompt.unmount();
    const selection = renderIn(
      <BoardSelectionRail
        prompt="Choose 1 card"
        min={1}
        max={1}
        pickCount={0}
        canConfirm={false}
        onConfirm={noop}
        onNoSelection={noop}
      />,
    );
    expect(selection.container.querySelector('.board-prompt[data-variant="selection"]')).toBeTruthy();
    expect(selection.container.querySelector('.board-prompt-scrim[data-variant="selection"]')).toBeTruthy();
  });
});

describe("BoardSelectionRail board view", () => {
  it("keeps the field effect collapsed until the player asks for it", () => {
    const { container } = renderIn(
      <BoardSelectionRail
        fieldSelection
        sourceCardId="ST1-07"
        prompt="Choose 1 target"
        clause="Draw 1 card."
        min={1}
        max={1}
        pickCount={0}
        canConfirm={false}
        onConfirm={noop}
        onNoSelection={noop}
      />,
    );

    const rail = container.querySelector(".board-prompt--target-selection");
    expect(rail?.classList.contains("board-prompt--effect-expanded")).toBe(false);
    const toggle = screen.getByRole("button", { name: "View effect" });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(toggle);
    expect(rail?.classList.contains("board-prompt--effect-expanded")).toBe(true);
    expect(screen.getByRole("button", { name: "Hide effect" }).getAttribute("aria-expanded")).toBe("true");
  });

  it("temporarily hides the confirmation rail and offers a return to the pending decision", () => {
    renderIn(
      <BoardSelectionRail
        fieldSelection
        prompt="Choose 1 target"
        min={1}
        max={1}
        pickCount={1}
        canConfirm
        onConfirm={noop}
        onNoSelection={noop}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View board" }));
    expect(screen.queryByRole("region", { name: "Confirm targets" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Return to decision" }));
    expect(screen.getByRole("region", { name: "Confirm targets" })).toBeTruthy();
  });
});

describe("BoardBlockPrompt", () => {
  it("keeps the blocker choice on the field and offers the decline action", () => {
    const onDecline = vi.fn<() => void>();
    renderIn(<BoardBlockPrompt attackerCardId="ST1-07" mustBlock={false} onDecline={onDecline} />);

    expect(screen.getByRole("region", { name: "Block window" }).classList.contains("board-prompt--block")).toBe(true);
    expect(screen.getByText("Choose your blocker")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Take the attack, no block" }));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("does not offer decline when blocking is mandatory", () => {
    renderIn(<BoardBlockPrompt mustBlock onDecline={noop} />);
    expect(screen.queryByRole("button", { name: "Take the attack, no block" })).toBeNull();
  });
});

describe("BoardAlliancePrompt", () => {
  it("keeps the ally choice on the field and offers the pass action", () => {
    const onPass = vi.fn<() => void>();
    renderIn(<BoardAlliancePrompt attackerCardId="ST1-07" onPass={onPass} />);

    expect(screen.getByRole("region", { name: "Alliance window" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Alliance window" }).classList.contains("board-prompt--alliance")).toBe(
      true,
    );
    expect(screen.getByText(/Suspend one of your other Digimon to add its DP/)).toBeTruthy();
    expect(screen.queryByRole("dialog", { name: "Alliance window" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Pass" }));
    expect(onPass).toHaveBeenCalledTimes(1);
  });
});

describe("BoardOptionalPrompt", () => {
  it("asks the Use / Not use question against the source card's clause", () => {
    const onUse = vi.fn<() => void>();
    const onDecline = vi.fn<() => void>();
    renderIn(<BoardOptionalPrompt sourceCardId="ST1-07" clause="Draw 1 card." onUse={onUse} onDecline={onDecline} />);
    expect(screen.getByText("Use this effect?")).toBeTruthy();
    expect(screen.getByText("Draw 1 card.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Use" }));
    fireEvent.click(screen.getByRole("button", { name: "Not use" }));
    expect(onUse).toHaveBeenCalledTimes(1);
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("asks the engine's own question when it sent one", () => {
    renderIn(
      <BoardOptionalPrompt
        sourceCardId="ST1-07"
        prompt="Activate Blitz?"
        clause="Draw 1 card."
        onUse={noop}
        onDecline={noop}
      />,
    );
    expect(screen.getByText("Activate Blitz?")).toBeTruthy();
    expect(screen.queryByText("Use this effect?")).toBeNull();
  });

  it("offers no way into the dialog beyond Escape, since the dialog shows nothing more", () => {
    const onOpenDialog = vi.fn<() => void>();
    renderIn(
      <BoardOptionalPrompt
        sourceCardId="ST1-07"
        clause="Draw 1 card."
        onUse={noop}
        onDecline={noop}
        onOpenDialog={onOpenDialog}
      />,
    );
    expect(screen.queryByRole("button", { name: "Open the decision dialog" })).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onOpenDialog).toHaveBeenCalledTimes(1);
  });

  it("names itself after the source card so the rail is addressable", () => {
    renderIn(<BoardOptionalPrompt sourceCardId="ST1-07" clause="Draw 1 card." onUse={noop} onDecline={noop} />);
    expect(screen.getByRole("region", { name: /· effect/i })).toBeTruthy();
  });

  it("opens the source card from the rail's own eyebrow", () => {
    const opened: string[] = [];
    renderIn(
      <CardOpenerProvider onOpenCard={(cardId) => opened.push(cardId)}>
        <BoardOptionalPrompt sourceCardId="ST1-07" clause="Draw 1 card." onUse={noop} onDecline={noop} />
      </CardOpenerProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Open / }));
    expect(opened).toEqual(["ST1-07"]);
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
      linkTargetPermanentIds: [],
    },
    {
      instanceId: "h2",
      cardId: "ST1-03",
      activatableEffectsJson: "",
      playableFromHand: false,
      projectedPlayCost: -1,
      digivolveTargetPermanentIds: [],
      linkTargetPermanentIds: [],
    },
    {
      instanceId: "h3",
      cardId: "ST1-07",
      activatableEffectsJson: "",
      playableFromHand: false,
      projectedPlayCost: -1,
      digivolveTargetPermanentIds: [],
      linkTargetPermanentIds: [],
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

  describe("on touch", () => {
    /** A finger landing on a card and lifting `travel` px away from where it landed. */
    function fingerTap(card: Element, travel: { dx: number; dy: number } = { dx: 0, dy: 0 }) {
      const at = { clientX: 120, clientY: 400, pointerId: 7, pointerType: "touch" };
      fireEvent.pointerDown(card, at);
      fireEvent.pointerUp(card, { ...at, clientX: at.clientX + travel.dx, clientY: at.clientY + travel.dy });
    }

    function renderPickableHand() {
      const onToggle = vi.fn<(instanceId: string) => void>();
      renderIn(
        <Hand
          cards={cards}
          startDrag={noop}
          selection={{ selectableInstanceIds: ["h1"], pickedInstanceIds: [], onToggle }}
        />,
      );
      const hand = screen.getByTestId("hand");
      return { onToggle, hand, card: within(hand).getByRole("button", { name: /copy 1 of 2$/ }) };
    }

    it("picks a card from the tap itself, not from the click the browser may never send", () => {
      // The hand is a `pan-x` scroll-snap row on a phone, so the browser is free to
      // swallow or retarget the trailing click. The pick must not depend on it.
      const { onToggle, card } = renderPickableHand();
      fingerTap(card);
      expect(onToggle.mock.calls).toEqual([["h1"]]);
    });

    it("counts the tap once when the browser does send its trailing click", () => {
      const { onToggle, card } = renderPickableHand();
      fingerTap(card);
      fireEvent.click(card, { detail: 1 });
      expect(onToggle.mock.calls).toEqual([["h1"]]);
    });

    it("still answers a browser that reports the tap as a click alone", () => {
      // The pointerup lands on the row rather than the card there, so the click is
      // the only signal the pick ever gets.
      const { onToggle, card } = renderPickableHand();
      fireEvent.pointerDown(card, { clientX: 120, clientY: 400, pointerId: 7, pointerType: "touch" });
      fireEvent.pointerUp(window, { clientX: 120, clientY: 400, pointerId: 7, pointerType: "touch" });
      fireEvent.click(card, { detail: 1 });
      expect(onToggle.mock.calls).toEqual([["h1"]]);
    });

    it("picks again when the same card is tapped a second time", () => {
      const { onToggle, card } = renderPickableHand();
      fingerTap(card);
      fireEvent.click(card, { detail: 1 });
      fingerTap(card);
      expect(onToggle.mock.calls).toEqual([["h1"], ["h1"]]);
    });

    it("leaves a sideways swipe to the row it scrolls", () => {
      const { onToggle, card } = renderPickableHand();
      fingerTap(card, { dx: 60, dy: 4 });
      expect(onToggle).not.toHaveBeenCalled();
    });

    it("drops the pick when the browser takes the gesture over for a scroll", () => {
      const { onToggle, card } = renderPickableHand();
      fireEvent.pointerDown(card, { clientX: 120, clientY: 400, pointerId: 7, pointerType: "touch" });
      fireEvent.pointerCancel(card, { pointerId: 7, pointerType: "touch" });
      fireEvent.pointerUp(card, { clientX: 120, clientY: 400, pointerId: 7, pointerType: "touch" });
      expect(onToggle).not.toHaveBeenCalled();
    });

    it("ignores a tap on a card the decision does not offer", () => {
      const { onToggle, hand } = renderPickableHand();
      fingerTap(within(hand).getByRole("button", { name: "Pick Greymon" }));
      expect(onToggle).not.toHaveBeenCalled();
    });

    it("still answers keyboard and assistive activation, which sends no pointer at all", () => {
      const { onToggle, card } = renderPickableHand();
      fireEvent.click(card);
      expect(onToggle.mock.calls).toEqual([["h1"]]);
    });
  });
});
