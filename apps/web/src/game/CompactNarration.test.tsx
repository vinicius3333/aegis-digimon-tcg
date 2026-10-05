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
function clauseOnly(id: string): NarrationItem {
  const { panel: _panel, ...item } = effect(id);
  return item;
}
function cardsOnly(id: string, count = 1): NarrationItem {
  const { notice: _notice, ...item } = effect(id);
  return {
    ...item,
    panel: {
      ...item.panel!,
      titleKey: "panel.trashedCards",
      cards: Array.from({ length: count }, (_, index) => ({ cardId: "BT1-010", badge: index + 1 })),
    },
  };
}
const rejected: MatchNotice = {
  id: "rejected",
  side: Side.Viewer,
  fromSecurity: false,
  createdAt: 0,
  body: { variant: "rejection", reason: "Not enough memory" },
};
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
const row = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-slot="narration-row"]')!;
const more = () => screen.queryByRole("button", { name: /more recent notices/ });

it("shows the newest moment as one line with its owner, clause and linked result", () => {
  const { container } = render(view([effect("old"), effect("new")]));
  expect(container.querySelectorAll(".narration-slot")).toHaveLength(1);
  const line = row(container).querySelector(".compact-row")!;
  expect(line.getAttribute("data-narration-id")).toBe("new");
  expect(line.querySelector(".compact-row__owner")?.textContent).toBe("You");
  expect(line.querySelector(".compact-row__label")?.textContent).toBe("On Play");
  expect(line.querySelector(".compact-row__action")?.textContent).toMatch(
    /^Reveal 5 cards from the top of your deck\./,
  );
  expect(line.querySelector(".compact-row__result-label")?.textContent).toBe("Agumon");
  expect(line.textContent).not.toContain("1 cards");
  expect(line.querySelectorAll(".compact-row__open")).toHaveLength(1);
});

it("names a card count only when a moment moved several cards", () => {
  const { container } = render(view([cardsOnly("trash", 3)]));
  expect(row(container).querySelector(".compact-row__action")?.textContent).toBe("3 cards");
  expect(row(container).querySelector(".compact-row__result")).toBeNull();
});

it("retains two clauses and two card lists, listing each moment once, behind the more control", () => {
  const { container, rerender } = render(view([effect("old"), effect("middle"), effect("new")]));
  expect(more()?.textContent).toBe("+1");
  fireEvent.click(more()!);
  const entries = within(screen.getByRole("group", { name: "Recent notices" })).getAllByRole("button");
  expect(entries).toHaveLength(2);
  expect(entries[1]!.getAttribute("aria-pressed")).toBe("true");
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

  rerender(view([clauseOnly("a"), cardsOnly("b"), clauseOnly("c"), cardsOnly("d"), clauseOnly("e")]));
  expect(row(container).querySelector(".compact-row")?.getAttribute("data-narration-id")).toBe("e");
  expect(more()?.textContent).toBe("+3");
  expect(more()?.getAttribute("aria-label")).toBe("Show 3 more recent notices");
});

it("dismisses only the chosen retained moment and closes the details", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  render(view([effect("old"), effect("middle"), effect("new")], onAdvance));
  fireEvent.click(more()!);
  fireEvent.click(within(screen.getByRole("dialog")).getByText("Dismiss notice", { exact: true }));
  expect(onAdvance).toHaveBeenCalledExactlyOnceWith("middle");
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("switches the details between retained moments without dismissing either", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  render(view([clauseOnly("clause"), cardsOnly("cards", 2)], onAdvance));
  fireEvent.click(screen.getByRole("button", { name: /Show the full notice/ }));
  const dialog = screen.getByRole("dialog");
  expect(dialog.querySelector(".side-panel-stack")).toBeTruthy();
  expect(dialog.querySelector(".match-notice-stack")).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: /On Play/ }));
  expect(dialog.querySelector(".match-notice-stack")).toBeTruthy();
  expect(dialog.textContent).toContain("Reveal 5 cards");
  expect(onAdvance).not.toHaveBeenCalled();
});

it("opens the selected moment clause-first with all cards and retains it after the row moves on", () => {
  const { rerender } = render(view([effect("one"), effect("two")]));
  const open = screen.getByRole("button", { name: /Show the full notice/ });
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

it("returns focus to the row and preserves the occurrence when closing details", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  render(view([effect("one")], onAdvance));
  const open = screen.getByRole("button", { name: /Show the full notice/ });
  open.focus();
  fireEvent.click(open);
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
  expect(document.activeElement).toBe(open);
  expect(onAdvance).not.toHaveBeenCalled();
});

it("keeps the reading clock paused across a long decision and restarts the line for a new moment", () => {
  const original = effect("one");
  const paused = { ...original, pausedAt: 1000 };
  const { container, rerender } = render(view([paused], undefined, null, undefined, 12000));
  const life = container.querySelector<HTMLElement>(".compact-row__life")!;
  expect(life.style.animationDuration).toBe(`${narrationReadingTime(original) - 1000}ms`);
  expect(container.querySelector("[data-reading-paused]")).toBeTruthy();
  rerender(view([{ ...original, createdAt: 11000 }], undefined, null, undefined, 12000));
  expect(container.querySelector(".compact-row__life")).toBe(life);
  expect(container.querySelector("[data-reading-paused]")).toBeNull();
  rerender(
    view(
      [
        { ...original, createdAt: 11000 },
        { ...effect("two"), createdAt: 12000 },
      ],
      undefined,
      null,
      undefined,
      12000,
    ),
  );
  const next = container.querySelector<HTMLElement>(".compact-row__life")!;
  expect(next).not.toBe(life);
  expect(next.style.animationDuration).toBe(`${narrationReadingTime(original)}ms`);
});

it("leads with a refused action, which takes one clause place and its own dismissal", () => {
  const onAdvance = vi.fn<(id: string) => void>(),
    onDismiss = vi.fn<() => void>();
  const { container } = render(view([clauseOnly("one"), clauseOnly("two")], onAdvance, rejected, onDismiss));
  const line = row(container).querySelector(".compact-row")!;
  expect(line.getAttribute("data-tone")).toBe("rejection");
  expect(line.querySelector(".compact-row__action")?.textContent).toBe("Not enough memory");
  expect(more()?.textContent).toBe("+1");
  fireEvent.click(line.querySelector(".compact-row__open")!);
  fireEvent.click(within(screen.getByRole("dialog")).getByText("Dismiss notice", { exact: true }));
  expect(onDismiss).toHaveBeenCalledOnce();
  expect(onAdvance).not.toHaveBeenCalled();
});

it("keeps one persistent host while notices arrive and expire", () => {
  const opposing = effect("opposing");
  opposing.side = Side.Opponent;
  opposing.notice!.side = Side.Opponent;
  opposing.panel!.side = Side.Opponent;
  const { container, rerender } = render(view([]));
  const host = row(container);
  expect(host.children).toHaveLength(0);
  rerender(view([effect("own"), opposing]));
  expect(row(container)).toBe(host);
  expect(host.querySelector(".compact-row")?.getAttribute("data-side")).toBe(Side.Opponent);
  expect(host.querySelector(".compact-row__owner")?.textContent).toBe("Opponent");
  rerender(view([]));
  expect(row(container)).toBe(host);
  expect(host.children).toHaveLength(0);
});

it("retains the opened occurrence when newer arrivals evict it from the caps", () => {
  const { rerender } = render(view([effect("first")]));
  fireEvent.click(screen.getByRole("button", { name: /Show the full notice/ }));
  rerender(view([effect("second"), effect("third"), effect("fourth")]));
  expect(screen.getByRole("dialog").textContent).toContain("Reveal 5 cards");
  expect(screen.getByRole("dialog").querySelector('img[src*="BT1-010_P2"]')).toBeTruthy();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("returns focus to the persistent host when the opened row expires", () => {
  const { container, rerender } = render(view([effect("one")]));
  const open = screen.getByRole("button", { name: /Show the full notice/ });
  open.focus();
  fireEvent.click(open);
  rerender(view([]));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(document.activeElement).toBe(row(container));
});
