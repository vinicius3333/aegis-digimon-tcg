// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { NarrationStack } from "./NarrationStack";
import { narrationReadingTime, type NarrationItem } from "./narration";
import type { MatchNotice } from "./notices";
import { Side } from "./side";

afterEach(cleanup);
function effect(id: string): NarrationItem {
  return {
    id,
    side: Side.Viewer,
    batchId: "batch",
    createdAt: 0,
    notice: {
      id,
      side: Side.Viewer,
      createdAt: 0,
      fromSecurity: false,
      body: {
        variant: "effect",
        cardId: "BT1-010",
        timing: "OnPlay",
        description: "Reveal 5 cards from the top of your deck. Add 1 Tamer among them to your hand.",
      },
    },
    panel: {
      id,
      side: Side.Viewer,
      createdAt: 0,
      titleKey: "panel.revealedCards",
      ordered: false,
      cards: [{ cardId: "BT1-010", artId: "BT1-010_P2", badge: 1 }],
    },
  };
}
function view(
  items: NarrationItem[],
  onAdvance = vi.fn<(id: string) => void>(),
  rejection: MatchNotice | null = null,
  onDismissRejection = vi.fn<() => void>(),
  nowMs = 0,
) {
  return (
    <I18nProvider>
      <NarrationStack
        compact
        nowMs={nowMs}
        narration={new Map(items.map((item) => [item.id, item]))}
        rejection={rejection}
        onAdvance={onAdvance}
        onDismissRejection={onDismissRejection}
      />
    </I18nProvider>
  );
}

it("keeps the two newest toasts in each column and dismisses only the tapped occurrence", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  const { container } = render(view([effect("old"), effect("middle"), effect("new")], onAdvance));
  for (const slot of container.querySelectorAll(".narration-slot")) {
    expect(
      [...slot.querySelectorAll(".compact-toast")].map((toast) => toast.getAttribute("data-narration-id")),
    ).toEqual(["middle", "new"]);
  }
  const right = container.querySelector('[data-slot="narration-cards"]')!;
  fireEvent.click(within(right as HTMLElement).getAllByRole("button", { name: /Show the full notice/ })[0]!);
  fireEvent.click(within(screen.getByRole("dialog")).getByText("Dismiss notice", { exact: true }));
  expect(onAdvance).toHaveBeenCalledExactlyOnceWith("middle");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("opens the selected moment clause-first with all cards and retains it after the toast expires", () => {
  const { rerender } = render(view([effect("one"), effect("two")]));
  const open = screen.getAllByRole("button", { name: /Show the full notice/ })[0]!;
  open.focus();
  fireEvent.click(open);
  const dialog = screen.getByRole("dialog", { name: "Notice details" });
  expect(document.activeElement).toBe(dialog);
  fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(document.activeElement).not.toBe(dialog);
  expect(
    dialog.querySelector(".match-notice-stack")!.compareDocumentPosition(dialog.querySelector(".side-panel-stack")!) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  expect(dialog.querySelector('img[src*="BT1-010_P2"]')).toBeTruthy();
  rerender(view([]));
  expect(screen.getByRole("dialog").textContent).toContain("Reveal 5 cards");
  fireEvent.keyDown(dialog, { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("returns focus to the toast and preserves the occurrence when closing details", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  render(view([effect("one")], onAdvance));
  const open = screen.getAllByRole("button", { name: /Show the full notice/ })[0]!;
  open.focus();
  fireEvent.click(open);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
  expect(document.activeElement).toBe(open);
  expect(onAdvance).not.toHaveBeenCalled();
});

it("keeps the reading clock paused across a long decision and neighboring arrivals", () => {
  const original = effect("one");
  const paused = { ...original, pausedAt: 1000 };
  const { container, rerender } = render(view([paused], undefined, null, undefined, 12000));
  const life = container.querySelector<HTMLElement>(".compact-toast__life")!;
  expect(life.style.animationDuration).toBe(`${narrationReadingTime(original) - 1000}ms`);
  expect(container.querySelector("[data-reading-paused]")).toBeTruthy();
  rerender(view([{ ...original, createdAt: 11000 }, effect("two")], undefined, null, undefined, 12000));
  expect(container.querySelector(".compact-toast__life")).toBe(life);
  expect(life.style.animationDuration).toBe(`${narrationReadingTime(original) - 1000}ms`);
  expect(container.querySelector("[data-reading-paused]")).toBeNull();
});

it("includes a rejected action in the left limit and uses its separate dismissal", () => {
  const onAdvance = vi.fn<(id: string) => void>(),
    onDismiss = vi.fn<() => void>();
  const rejection: MatchNotice = {
    id: "rejected",
    side: Side.Viewer,
    fromSecurity: false,
    createdAt: 0,
    body: { variant: "rejection", reason: "Not enough memory" },
  };
  const { container } = render(view([effect("one"), effect("two")], onAdvance, rejection, onDismiss));
  const left = container.querySelector('[data-slot="narration-text"]')!;
  expect(left.querySelectorAll(".compact-toast")).toHaveLength(2);
  expect(left.querySelector('.compact-toast[data-tone="rejection"] .compact-toast__clause')?.textContent).toBe(
    "Not enough memory",
  );
  fireEvent.click(left.querySelector('.compact-toast[data-tone="rejection"] .compact-toast__open')!);
  fireEvent.click(within(screen.getByRole("dialog")).getByText("Dismiss notice", { exact: true }));
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(onAdvance).not.toHaveBeenCalled();
});

it("preserves owner routing and the fixed lane hosts as notices arrive and expire", () => {
  const own = effect("own");
  const opposing = effect("opposing");
  opposing.side = Side.Opponent;
  opposing.notice!.side = Side.Opponent;
  opposing.panel!.side = Side.Opponent;
  const { container, rerender } = render(view([]));
  const lanes = [...container.querySelectorAll(".narration-slot")];
  expect(lanes).toHaveLength(2);
  rerender(view([own, opposing]));
  for (const lane of lanes) {
    expect([...lane.querySelectorAll(".compact-toast")].map((toast) => toast.getAttribute("data-side"))).toEqual([
      Side.Viewer,
      Side.Opponent,
    ]);
  }
  rerender(view([]));
  expect([...container.querySelectorAll(".narration-slot")]).toEqual(lanes);
  expect(container.querySelectorAll(".compact-toast")).toHaveLength(0);
});

it("retains the opened occurrence when a newer arrival evicts it from both lane caps", () => {
  const { rerender } = render(view([effect("first")]));
  fireEvent.click(screen.getAllByRole("button", { name: /Show the full notice/ })[0]!);
  rerender(view([effect("second"), effect("third"), effect("fourth")]));
  expect(screen.getByRole("dialog").textContent).toContain("Reveal 5 cards");
  expect(screen.getByRole("dialog").querySelector('img[src*="BT1-010_P2"]')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("counts distinct card panels in one occurrence toward the right limit", () => {
  const dual = {
    ...effect("dual"),
    notice: {
      ...effect("dual").notice!,
      body: {
        variant: "deletion" as const,
        cards: [{ cardId: "BT1-010" }],
      },
    },
  };
  const { container } = render(view([effect("old"), dual]));
  const right = container.querySelector('[data-slot="narration-cards"]')!;
  expect([...right.querySelectorAll(".compact-toast")].map((toast) => toast.getAttribute("data-narration-id"))).toEqual(
    ["dual", "dual"],
  );
});

it("returns focus to the persistent lane when the opened toast expires", () => {
  const { container, rerender } = render(view([effect("one")]));
  const open = screen.getAllByRole("button", { name: /Show the full notice/ })[0]!;
  const lane = container.querySelector('[data-slot="narration-text"]');
  open.focus();
  fireEvent.click(open);
  rerender(view([]));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(document.activeElement).toBe(lane);
});
