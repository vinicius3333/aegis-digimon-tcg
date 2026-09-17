// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../i18n";
import { CardOpenerProvider } from "./cardLinks";
import { NarrationStack } from "./NarrationStack";
import type { NarrationItem } from "./narration";
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
  expect(container.querySelector('[data-slot="narration"][data-security-dock]')).toBeTruthy();
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

/* The portrait column collapses whole: the accordion stands in for every record until the
   viewer opens it, so the band is all the board carries. */
it("collapses the whole portrait column into the accordion", () => {
  const { container } = render(
    <I18nProvider>
      <NarrationStack
        narration={new Map([item("one"), item("two")].map((entry) => [entry.id, entry]))}
        compact
        nowMs={0}
        rejection={null}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>,
  );
  expect(container.querySelectorAll('[data-slot="narration"] .narration-item')).toHaveLength(0);
  expect(container.querySelectorAll(".narration-peek")).toHaveLength(1);
});

it("opens the whole portrait column from the accordion, and dismisses only the selected ID", () => {
  const onAdvance = vi.fn<(id: string) => void>();
  const { container } = render(
    <I18nProvider>
      <NarrationStack
        narration={new Map([item("one"), item("two")].map((entry) => [entry.id, entry]))}
        compact
        nowMs={0}
        rejection={null}
        onAdvance={onAdvance}
        onDismissRejection={() => {}}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show the full notice" }));
  expect(container.querySelectorAll('[data-slot="narration"] .narration-item')).toHaveLength(2);
  fireEvent.click(screen.getAllByRole("button", { name: "Dismiss notice" })[1]!);
  expect(onAdvance).toHaveBeenCalledExactlyOnceWith("two");
  fireEvent.click(screen.getByRole("button", { name: "Fold the notice back" }));
  expect(container.querySelectorAll('[data-slot="narration"] .narration-item')).toHaveLength(0);
});

/* Wide, the eye reads the clause on the left and the cards it moved on the right. Folded,
   that same order has to survive as top-then-bottom, or an [On Play] that reveals three
   cards shows the three cards first and names the clause underneath — the result before
   the cause. */
it("folds a moment clause-first, the way the two columns read", () => {
  const moment: NarrationItem = { ...item("moment"), panel: cardItem("moment").panel };
  const { container } = render(
    <I18nProvider>
      <CardOpenerProvider onOpenCard={() => {}}>
        <NarrationStack
          narration={new Map([[moment.id, moment]])}
          compact
          nowMs={0}
          rejection={null}
          onAdvance={() => {}}
          onDismissRejection={() => {}}
        />
      </CardOpenerProvider>
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show the full notice" }));
  const folded = container.querySelector('[data-slot="narration"] .narration-item') as HTMLElement;
  const clause = folded.querySelector(".match-notice-stack");
  const cards = folded.querySelector(".side-panel-stack");
  expect(clause).toBeTruthy();
  expect(cards).toBeTruthy();
  // DOCUMENT_POSITION_FOLLOWING: the cards half is drawn after the clause half.
  expect(clause!.compareDocumentPosition(cards!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

/* The opened column is taller than the phone it is read on, so a control at the end of it
   is only reachable by scrolling past every moment. Leading the column is what lets it
   stick to the top edge from the first paint. */
it("leads the opened portrait column with its close control", () => {
  const { container } = render(
    <I18nProvider>
      <NarrationStack
        narration={new Map([item("one"), item("two")].map((entry) => [entry.id, entry]))}
        compact
        nowMs={0}
        rejection={null}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Show the full notice" }));
  const close = screen.getByRole("button", { name: "Fold the notice back" });
  expect(container.querySelector('[data-slot="narration"]')?.firstElementChild).toBe(close);
  // Named in words, not left as a bare chevron to be guessed at.
  expect(close.textContent).toContain("Close");
});

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
it("replaces the folded band per moment and runs its clock from that moment", () => {
  const first = item("one");
  const view = (items: NarrationItem[], nowMs: number) => (
    <I18nProvider>
      <NarrationStack
        narration={new Map(items.map((entry) => [entry.id, entry]))}
        compact
        nowMs={nowMs}
        rejection={null}
        onAdvance={() => {}}
        onDismissRejection={() => {}}
      />
    </I18nProvider>
  );
  const { container, rerender } = render(view([first], 0));
  const band = container.querySelector(".narration-peek");
  const life = container.querySelector(".narration-peek__life") as HTMLElement;
  expect(life.style.animationDuration).toBe(`${TIMINGS.noticeLifetime}ms`);
  rerender(view([first, { ...item("two"), createdAt: 2000 }], 2000));
  expect(container.querySelector(".narration-peek")).not.toBe(band);
  // The newest moment's own reading time, not what is left of the one it replaced.
  const next = container.querySelector(".narration-peek__life") as HTMLElement;
  expect(next.style.animationDuration).toBe(`${TIMINGS.noticeLifetime}ms`);
  // One named, one queued behind it.
  expect(container.querySelector(".narration-peek__more")?.textContent).toBe("+1");
});

/* The band is a glance before it is a sentence: its accent says what kind of moment it is
   without the viewer reading a word of it. */
it("draws the folded band in the tone its newest moment earns", () => {
  const tone = (entry: NarrationItem) => {
    const { container } = render(
      <I18nProvider>
        <NarrationStack
          narration={new Map([[entry.id, entry]])}
          compact
          nowMs={0}
          rejection={null}
          onAdvance={() => {}}
          onDismissRejection={() => {}}
        />
      </I18nProvider>,
    );
    const band = container.querySelector(".narration-peek")?.getAttribute("data-tone");
    cleanup();
    return band;
  };
  const noticeItem = (id: string, body: MatchNotice["body"]): NarrationItem => ({
    id,
    side: Side.Viewer,
    batchId: "batch",
    createdAt: 0,
    notice: { id, side: Side.Viewer, fromSecurity: false, createdAt: 0, body },
  });
  expect(tone(noticeItem("a", { variant: "effect", cardId: "BT1-010", timing: "OnPlay" }))).toBe("effect");
  expect(tone(noticeItem("b", { variant: "deletion", cards: [{ cardId: "BT1-010" }] }))).toBe("deletion");
  expect(tone(noticeItem("c", { variant: "keyword", keyword: "digiXros", cardId: "BT1-010" }))).toBe("keyword");
  expect(tone(noticeItem("d", { variant: "recovery", amount: 1 }))).toBe("gain");
  expect(tone(noticeItem("e", { variant: "securityGain", amount: 2 }))).toBe("gain");
});

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
