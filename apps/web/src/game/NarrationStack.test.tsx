// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { CardOpenerProvider } from "./cardLinks";
import { NarrationStack } from "./NarrationStack";
import { type NarrationItem } from "./narration";
import type { MatchNotice } from "./notices";
import { Side } from "./side";
import { TIMINGS } from "./timings";

afterEach(cleanup);

// The dock holds the upper right, which is the card column's corner — so that is the
// column that steps out of its way.
it("reserves space for the security dock and releases it when the dock closes", () => {
  const opponent = { ...cardItem("security-reveal"), side: Side.Opponent as const };
  const view = (active: boolean, compact: boolean) => (
    <I18nProvider>
      <NarrationStack
        narration={new Map([[opponent.id, opponent]])}
        compact={compact}
        securityDockActive={active}
        rejection={null}
        nowMs={0}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>
  );
  const { container, rerender } = render(view(true, false));
  expect(container.querySelector('[data-slot="narration-cards"][data-security-dock]')).toBeTruthy();
  rerender(view(false, false));
  expect(container.querySelector("[data-security-dock]")).toBeNull();
  rerender(view(true, true));
  expect(container.querySelector('[data-slot="narration-cards"][data-security-dock]')).toBeTruthy();
});

function cardItem(id: string): NarrationItem {
  return {
    id,
    side: Side.Opponent,
    batchId: "batch",
    createdAt: 0,
    panel: {
      id,
      titleKey: "panel.revealedCards",
      side: Side.Opponent,
      cards: [{ cardId: "BT1-010", badge: 1 }],
      ordered: false,
      createdAt: 0,
    },
  };
}

function item(id: string): NarrationItem {
  return {
    id,
    side: Side.Viewer,
    batchId: "batch",
    createdAt: 0,
    notice: { id, side: Side.Viewer, fromSecurity: false, createdAt: 0, body: { variant: "recovery", amount: 1 } },
  };
}

it("shows only two recent toasts per side without dismissing older occurrences", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  const entries = [
    item("left-old"),
    item("left-middle"),
    item("left-new"),
    cardItem("right-old"),
    cardItem("right-middle"),
    cardItem("right-new"),
  ];
  const view = (shown: NarrationItem[]) => (
    <I18nProvider>
      <NarrationStack
        narration={new Map(shown.map((entry) => [entry.id, entry]))}
        nowMs={0}
        rejection={null}
        onAdvance={onAdvance}
        onDismissRejection={() => {}}
      />
    </I18nProvider>
  );
  const { container, rerender } = render(view(entries));
  const ids = (slot: string) =>
    [...container.querySelectorAll(`[data-slot="${slot}"] .narration-item`)].map((node) =>
      node.getAttribute("data-narration-id"),
    );
  expect(ids("narration-text")).toEqual(["left-middle", "left-new"]);
  expect(ids("narration-cards")).toEqual(["right-middle", "right-new"]);
  expect(onAdvance).not.toHaveBeenCalled();
  rerender(view(entries.filter((entry) => !entry.id.endsWith("new"))));
  expect(ids("narration-text")).toEqual(["left-old", "left-middle"]);
  expect(ids("narration-cards")).toEqual(["right-old", "right-middle"]);
});

it("counts a rejection toward the left limit and keeps its own dismissal", () => {
  const dismissRejection = vi.fn<() => void>();
  const rejected: MatchNotice = {
    id: "refused",
    side: Side.Viewer,
    fromSecurity: false,
    createdAt: 0,
    body: { variant: "rejection", reason: "Cannot play" },
  };
  const { container } = render(
    <I18nProvider>
      <NarrationStack
        narration={new Map([item("old"), item("new")].map((entry) => [entry.id, entry]))}
        nowMs={0}
        rejection={rejected}
        onAdvance={() => {}}
        onDismissRejection={dismissRejection}
      />
    </I18nProvider>,
  );
  const left = container.querySelector('[data-slot="narration-text"]')!;
  expect(left.querySelectorAll(".match-notice")).toHaveLength(2);
  expect(left.querySelectorAll(".narration-item")).toHaveLength(1);
  fireEvent.click(left.querySelector('[data-variant="rejection"] .match-notice__close')!);
  expect(dismissRejection).toHaveBeenCalledOnce();
});

it("counts each card panel when one occurrence contains two card toasts", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  const dual: NarrationItem = {
    ...cardItem("dual"),
    notice: {
      id: "dual",
      side: Side.Opponent,
      fromSecurity: false,
      createdAt: 0,
      body: { variant: "deletion", cards: [{ cardId: "BT1-010" }] },
    },
  };
  const { container } = render(
    <I18nProvider>
      <NarrationStack
        narration={new Map([cardItem("old"), dual].map((entry) => [entry.id, entry]))}
        nowMs={0}
        rejection={null}
        onAdvance={onAdvance}
        onDismissRejection={() => {}}
      />
    </I18nProvider>,
  );
  const right = container.querySelector('[data-slot="narration-cards"]')!;
  expect(right.querySelectorAll(".side-panel")).toHaveLength(2);
  fireEvent.click(right.querySelector(".side-panel__close")!);
  expect(onAdvance).toHaveBeenCalledExactlyOnceWith("dual");
});

it("shows Wizardmon's End of Your Turn clause in the effect toast", () => {
  const endTurn: NarrationItem = {
    id: "wizardmon-end-turn",
    side: Side.Viewer,
    batchId: "batch",
    createdAt: 0,
    notice: {
      id: "wizardmon-end-turn",
      side: Side.Viewer,
      fromSecurity: false,
      createdAt: 0,
      body: {
        variant: "effect",
        cardId: "BT26-067",
        timing: "EndOfYourTurn",
        description:
          "[End of Your Turn] If you have a blue or yellow Digimon, by returning this Digimon to the bottom of the deck, you may play 1 red or blue [Iliad] trait Digimon card from your trash with the cost reduced by 4.",
      },
    },
  };

  render(
    <I18nProvider>
      <NarrationStack
        narration={new Map([[endTurn.id, endTurn]])}
        nowMs={0}
        rejection={null}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>,
  );

  expect(screen.getByText("End of Your Turn")).toBeTruthy();
  expect(document.querySelector(".match-notice__text")?.textContent).toMatch(
    /^\[End of Your Turn\].*cost reduced by 4\.$/,
  );
});

/* The portrait column collapses whole: the accordion stands in for every record until the
   viewer opens it, so the band is all the board carries. */

/* Wide, the eye reads the clause on the left and the cards it moved on the right. Folded,
   that same order has to survive as top-then-bottom, or an [On Play] that reveals three
   cards shows the three cards first and names the clause underneath — the result before
   the cause. */

/* The opened column is taller than the phone it is read on, so a control at the end of it
   is only reachable by scrolling past every moment. Leading the column is what lets it
   stick to the top edge from the first paint. */

it("does not accelerate an existing countdown when another record arrives", () => {
  const first = item("one");
  const view = (items: NarrationItem[], nowMs: number) => (
    <I18nProvider>
      <NarrationStack
        narration={new Map(items.map((entry) => [entry.id, entry]))}
        nowMs={nowMs}
        rejection={null}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>
  );
  const { container, rerender } = render(view([first], 0));
  const ring = container.querySelector(".match-notice__erode") as HTMLElement;
  expect(ring.style.animationDuration).toBe(`${TIMINGS.noticeLifetime}ms`);
  rerender(view([first, { ...item("two"), createdAt: 2000 }], 2000));
  expect(container.querySelector(".match-notice__erode")).toBe(ring);
  expect(ring.style.animationDuration).toBe(`${TIMINGS.noticeLifetime}ms`);
});

/* The band is one row reused for every moment. Rewritten in place it would swap its text
   with nothing to see, on the layout where it is the only thing a moment gets — so each
   moment gets its own row, and with it the row's entrance and its own running clock. */

/* The band is a glance before it is a sentence: its accent says what kind of moment it is
   without the viewer reading a word of it. */

/* A deletion is drawn by the panel component, not by the notice frame: the two are read out
   of the same column and used to arrive in two different backgrounds. */
it("draws a deletion as a titled panel, keeping the art the card was deleted in", () => {
  const opened: Array<[string, string | undefined]> = [];
  const deleted: NarrationItem = {
    id: "deleted",
    side: Side.Viewer,
    batchId: "batch",
    createdAt: 0,
    notice: {
      id: "deleted",
      side: Side.Viewer,
      fromSecurity: false,
      createdAt: 0,
      body: { variant: "deletion", cards: [{ cardId: "BT1-010", artId: "BT1-010_P2" }] },
    },
  };
  const { container } = render(
    <I18nProvider>
      <CardOpenerProvider onOpenCard={(cardId, artId) => opened.push([cardId, artId])}>
        <NarrationStack
          narration={new Map([[deleted.id, deleted]])}
          nowMs={0}
          rejection={null}
          onAdvance={() => {}}
          onDismissRejection={() => {}}
        />
      </CardOpenerProvider>
    </I18nProvider>,
  );
  const panel = screen.getByTestId("side-panel");
  expect(panel.textContent).toContain("Deleted");
  expect(panel.textContent).toContain("Agumon");
  // The same frame the trashed-cards list uses, rather than a second one beside it.
  expect(container.querySelector(".match-notice")).toBeNull();
  expect(panel.querySelector('img[src*="BT1-010_P2"]')).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Open Agumon" }));
  expect(opened).toEqual([["BT1-010", "BT1-010_P2"]]);
});

it("marks the prompt's own clause while retaining other accepted effects", () => {
  const clause = (id: string, cardId: string): NarrationItem => ({
    id,
    side: Side.Viewer,
    batchId: "b1",
    createdAt: 0,
    notice: {
      id,
      side: Side.Viewer,
      fromSecurity: false,
      createdAt: 0,
      body: { variant: "effect", cardId, timing: "YourTurn", description: "[Your Turn] Gain 1 memory." },
    },
  });
  const previous = { ...clause("previous", "EX4-039"), superseded: true };
  const current = clause("current", "BT20-091");
  const view = (promptSourceCardId: string | undefined) => (
    <I18nProvider>
      <NarrationStack
        narration={
          new Map([
            [previous.id, previous],
            [current.id, current],
          ])
        }
        promptSourceCardId={promptSourceCardId}
        nowMs={0}
        rejection={null}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>
  );
  const marked = () =>
    [...document.querySelectorAll("[data-prompt-effect]")].map((element) => element.getAttribute("data-narration-id"));

  const { rerender } = render(view("BT20-091"));
  expect(marked()).toEqual(["current"]);
  rerender(view("ST8-10"));
  expect(marked()).toEqual([]);
  rerender(view(undefined));
  expect(marked()).toEqual([]);
  expect(document.querySelectorAll(".narration-item")).toHaveLength(2);
});
