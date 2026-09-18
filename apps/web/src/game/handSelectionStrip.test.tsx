// @vitest-environment jsdom

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { Hand, type HandEntry } from "./piece";
import { HAND_INSPECT_HOLD_MS } from "./piece/useHandPickGesture";

afterEach(() => cleanup());

const entry = (instanceId: string, cardId = "BT1-010"): HandEntry => ({
  instanceId,
  cardId,
  activatableEffectsJson: "[]",
  playableFromHand: false,
  projectedPlayCost: -1,
  digivolveTargetPermanentIds: [],
  linkTargetPermanentIds: [],
});

const CARDS = [entry("a"), entry("b"), entry("c")];

/** jsdom lays nothing out, so the strip's scroll geometry is set by hand. */
function stubStripGeometry({ scrollLeft, scrollWidth, clientWidth }: Record<string, number>) {
  for (const property of ["scrollWidth", "clientWidth"] as const) {
    Object.defineProperty(HTMLElement.prototype, property, {
      configurable: true,
      get() {
        return this.dataset.testid === "hand" ? (property === "scrollWidth" ? scrollWidth! : clientWidth!) : 0;
      },
    });
  }
  Object.defineProperty(HTMLElement.prototype, "scrollLeft", {
    configurable: true,
    writable: true,
    value: scrollLeft,
  });
}

function matchTouchLayout(matches: boolean) {
  window.matchMedia = vi.fn<(query: string) => unknown>().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn<() => void>(),
    removeEventListener: vi.fn<() => void>(),
    dispatchEvent: vi.fn<() => boolean>(),
  })) as unknown as typeof window.matchMedia;
}

function renderHand(selection?: Parameters<typeof Hand>[0]["selection"]) {
  return render(
    <I18nProvider>
      <Hand cards={CARDS} startDrag={() => {}} selection={selection} />
    </I18nProvider>,
  );
}

beforeEach(() => {
  matchTouchLayout(true);
  stubStripGeometry({ scrollLeft: 0, scrollWidth: 900, clientWidth: 300 });
});

describe("hand selection states", () => {
  it("marks eligible, picked and ineligible cards with classes of their own", () => {
    const { container } = renderHand({
      selectableInstanceIds: ["a", "b"],
      pickedInstanceIds: ["b"],
      onToggle: () => {},
    });
    const cards = container.querySelectorAll(".game-hand-card");
    expect(cards[0]!.className).toContain("game-hand-card--pickable");
    expect(cards[1]!.className).toContain("game-hand-card--picked");
    expect(cards[1]!.className).not.toContain("game-hand-card--pickable");
    expect(cards[2]!.className).toContain("game-hand-card--unpickable");
  });

  it("flags the strip itself while a decision is being answered", () => {
    const { container } = renderHand({ selectableInstanceIds: ["a"], pickedInstanceIds: [], onToggle: () => {} });
    expect(container.querySelector('[data-testid="hand"]')!.className).toContain("game-hand--selecting");
  });

  it("leaves the strip unflagged when the hand is a play surface", () => {
    const { container } = renderHand();
    expect(container.querySelector('[data-testid="hand"]')!.className).not.toContain("game-hand--selecting");
  });
});

describe("hand strip scroll cues", () => {
  it("points forward only while cards are hidden to the right", () => {
    const { queryByTestId } = renderHand();
    expect(queryByTestId("hand-scroll-start")).toBeNull();
    expect(queryByTestId("hand-scroll-forward")).not.toBeNull();
  });

  it("points both ways from the middle of the strip", () => {
    stubStripGeometry({ scrollLeft: 200, scrollWidth: 900, clientWidth: 300 });
    const { queryByTestId } = renderHand();
    expect(queryByTestId("hand-scroll-start")).not.toBeNull();
    expect(queryByTestId("hand-scroll-forward")).not.toBeNull();
  });

  it("shows nothing when the whole hand fits", () => {
    stubStripGeometry({ scrollLeft: 0, scrollWidth: 300, clientWidth: 300 });
    const { queryByTestId } = renderHand();
    expect(queryByTestId("hand-scroll-start")).toBeNull();
    expect(queryByTestId("hand-scroll-forward")).toBeNull();
  });

  it("stays off the pointer layout, where the fan is whole", () => {
    matchTouchLayout(false);
    const { queryByTestId } = renderHand();
    expect(queryByTestId("hand-scroll-forward")).toBeNull();
  });

  it("scrolls the strip by one card when a cue is tapped", () => {
    const { getByTestId } = renderHand();
    const strip = getByTestId("hand");
    const scrollBy = vi.fn<(options: ScrollToOptions) => void>();
    (strip as HTMLElement & { scrollBy: typeof scrollBy }).scrollBy = scrollBy;
    fireEvent.click(getByTestId("hand-scroll-forward"));
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }));
    expect(scrollBy.mock.calls[0]![0].left).toBeGreaterThan(0);
  });

  it("labels each cue instead of leaving a bare glyph", () => {
    const { getByTestId } = renderHand();
    expect(getByTestId("hand-scroll-forward").getAttribute("aria-label")).toBeTruthy();
  });
});

describe("selection inspection gestures", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens details on a held press without picking the card", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    const onInspect = vi.fn<(instanceId: string) => void>();
    const { container } = renderHand({ selectableInstanceIds: ["a"], pickedInstanceIds: [], onToggle, onInspect });
    const card = container.querySelector(".game-hand-card")!;
    fireEvent.pointerDown(card, { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50 });
    vi.advanceTimersByTime(HAND_INSPECT_HOLD_MS);
    fireEvent.pointerUp(card, { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50 });
    fireEvent.click(card, { detail: 1 });
    expect(onToggle).not.toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("picks on a short tap and never inspects it", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    const onInspect = vi.fn<(instanceId: string) => void>();
    const { container } = renderHand({ selectableInstanceIds: ["a"], pickedInstanceIds: [], onToggle, onInspect });
    const card = container.querySelector(".game-hand-card")!;
    fireEvent.pointerDown(card, { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50 });
    vi.advanceTimersByTime(HAND_INSPECT_HOLD_MS / 2);
    fireEvent.pointerUp(card, { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50 });
    fireEvent.click(card, { detail: 1 });
    vi.advanceTimersByTime(HAND_INSPECT_HOLD_MS);
    expect(onToggle).toHaveBeenCalledExactlyOnceWith("a");
    expect(onInspect).not.toHaveBeenCalled();
  });

  it("drops the hold once the finger starts panning the strip", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    const onInspect = vi.fn<(instanceId: string) => void>();
    const { container } = renderHand({ selectableInstanceIds: ["a"], pickedInstanceIds: [], onToggle, onInspect });
    const card = container.querySelector(".game-hand-card")!;
    fireEvent.pointerDown(card, { pointerId: 1, pointerType: "touch", clientX: 50, clientY: 50 });
    fireEvent.pointerMove(card, { pointerId: 1, pointerType: "touch", clientX: 90, clientY: 52 });
    vi.advanceTimersByTime(HAND_INSPECT_HOLD_MS);
    fireEvent.pointerUp(card, { pointerId: 1, pointerType: "touch", clientX: 90, clientY: 52 });
    expect(onToggle).not.toHaveBeenCalled();
    expect(onInspect).not.toHaveBeenCalled();
  });

  it("inspects on right click without picking", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    const onInspect = vi.fn<(instanceId: string) => void>();
    const { container } = renderHand({ selectableInstanceIds: ["a"], pickedInstanceIds: [], onToggle, onInspect });
    fireEvent.contextMenu(container.querySelector(".game-hand-card")!);
    expect(onToggle).not.toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("inspects an ineligible card from its magnifier without selecting it", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    const onInspect = vi.fn<(instanceId: string) => void>();
    const { container } = renderHand({ selectableInstanceIds: [], pickedInstanceIds: [], onToggle, onInspect });
    fireEvent.click(container.querySelector(".game-hand-card__inspect")!, { detail: 1 });
    expect(onToggle).not.toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledExactlyOnceWith("a");
  });

  it("supports Alt+Enter for keyboard inspection without selecting", () => {
    const onToggle = vi.fn<(instanceId: string) => void>();
    const onInspect = vi.fn<(instanceId: string) => void>();
    const { container } = renderHand({ selectableInstanceIds: ["a"], pickedInstanceIds: [], onToggle, onInspect });
    fireEvent.keyDown(container.querySelector(".game-hand-card")!, { key: "Enter", altKey: true });
    expect(onToggle).not.toHaveBeenCalled();
    expect(onInspect).toHaveBeenCalledExactlyOnceWith("a");
  });
});
