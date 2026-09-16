import { describe, expect, it } from "vitest";
import {
  buildNarrationItems,
  isQueuedNotice,
  narrationReadingTime,
  narrationRemaining,
  narrationSlot,
  narrationSlots,
  noticeSourceCardId,
  panelSourceCardId,
  pushNarrationItem,
  type NarrationItem,
} from "./narration";
import { NOTICE_LIFETIME_MS, type MatchNotice } from "./notices";
import { SIDE_PANEL_LIFETIME_MS, SIDE_PANEL_MERGE_WINDOW_MS, type SidePanel } from "./sidePanels";

function notice(overrides: Partial<MatchNotice> = {}): MatchNotice {
  return {
    id: "n1",
    side: "you",
    fromSecurity: false,
    body: { variant: "effect", cardId: "BT1-001", timing: "OnDeletion", description: "Gain 1 memory." },
    createdAt: 0,
    ...overrides,
  };
}

function panel(overrides: Partial<SidePanel> = {}): SidePanel {
  return {
    id: "p1",
    titleKey: "panel.deletedCards",
    side: "you",
    cards: [{ cardId: "BT1-001", badge: 1 }],
    ordered: false,
    createdAt: 0,
    ...overrides,
  };
}

function build(args: { notices?: readonly MatchNotice[]; panels?: readonly SidePanel[]; nowMs?: number } = {}) {
  let next = 0;
  return buildNarrationItems({
    batchId: "b1",
    notices: args.notices ?? [],
    panels: args.panels ?? [],
    nowMs: args.nowMs ?? 0,
    nextId: () => `i${(next += 1)}`,
  });
}

describe("folding a batch into moments", () => {
  it("makes one moment of a panel and the clause about the same card", () => {
    const items = build({ panels: [panel()], notices: [notice()] });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ batchId: "b1", side: "you", source: "BT1-001" });
    expect(items[0]?.panel?.id).toBe("p1");
    expect(items[0]?.notice?.id).toBe("n1");
  });

  it("keeps a clause about another card apart from the panel", () => {
    const items = build({
      panels: [panel()],
      notices: [notice({ body: { variant: "effect", cardId: "BT1-002" } })],
    });
    expect(items).toHaveLength(2);
    // The clause is read out first; the bare list of cards follows it.
    expect(items[0]?.panel).toBeUndefined();
    expect(items[1]?.notice).toBeUndefined();
  });

  it("keeps the opponent's clause out of the viewer's panel", () => {
    expect(build({ panels: [panel({ side: "you" })], notices: [notice({ side: "opp" })] })).toHaveLength(2);
  });

  it("leaves a panel of several cards unmerged: it is about the effect, not about one card", () => {
    const many = panel({
      cards: [
        { cardId: "BT1-001", badge: 1 },
        { cardId: "BT1-002", badge: 2 },
      ],
    });
    expect(panelSourceCardId(many)).toBeUndefined();
    expect(build({ panels: [many], notices: [notice()] })).toHaveLength(2);
  });

  it("folds cards moved by one effect into one panel first, on the merge window", () => {
    const items = build({
      panels: [
        panel({ id: "a", cards: [{ cardId: "BT1-001", badge: 1 }] }),
        panel({ id: "b", createdAt: SIDE_PANEL_MERGE_WINDOW_MS - 1, cards: [{ cardId: "BT1-002", badge: 1 }] }),
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0]?.panel?.cards.map((card) => card.cardId)).toEqual(["BT1-001", "BT1-002"]);
  });

  it("reads out whatever carries a clause before a bare list of cards", () => {
    const items = build({
      panels: [panel({ titleKey: "panel.revealedCards", cards: [{ cardId: "BT1-009", badge: 1 }] })],
      notices: [notice({ body: { variant: "recovery", amount: 1 } })],
    });
    expect(items.map((item) => (item.notice ? "notice" : "panel"))).toEqual(["notice", "panel"]);
  });

  it("leaves a refusal out of the queue, because it answers the viewer's own tap", () => {
    const refusal = notice({ body: { variant: "rejection", reason: "Not enough memory." } });
    expect(isQueuedNotice(refusal)).toBe(false);
    expect(build({ notices: [refusal] })).toEqual([]);
    expect(build({ notices: [refusal, notice()] })).toHaveLength(1);
  });

  it("stamps every moment with the batch and the clock it was queued on", () => {
    const items = build({ notices: [notice()], nowMs: 900 });
    expect(items[0]).toMatchObject({ batchId: "b1", createdAt: 900 });
  });
});

describe("naming the card a moment is about", () => {
  it("reads it off the clause or the call-out, and off nothing else", () => {
    expect(noticeSourceCardId(notice())).toBe("BT1-001");
    expect(noticeSourceCardId(notice({ body: { variant: "keyword", keyword: "digiXros", cardId: "BT10-066" } }))).toBe(
      "BT10-066",
    );
    expect(noticeSourceCardId(notice({ body: { variant: "recovery", amount: 1 } }))).toBeUndefined();
    expect(noticeSourceCardId(notice({ body: { variant: "securityGain", amount: 1 } }))).toBeUndefined();
  });
});

describe("reading time", () => {
  it("gives a lone notice the notice clock and a lone panel the panel clock", () => {
    expect(narrationReadingTime({ notice: notice() })).toBe(NOTICE_LIFETIME_MS);
    expect(narrationReadingTime({ panel: panel() })).toBe(SIDE_PANEL_LIFETIME_MS);
  });

  it("gives a moment carrying both the longer of the two", () => {
    expect(narrationReadingTime({ panel: panel(), notice: notice() })).toBe(
      Math.max(NOTICE_LIFETIME_MS, SIDE_PANEL_LIFETIME_MS),
    );
  });

  it("counts down from when the moment was presented, never past zero", () => {
    const item = build({ notices: [notice()] })[0]!;
    expect(narrationRemaining(item, 0)).toBe(NOTICE_LIFETIME_MS);
    expect(narrationRemaining(item, 200)).toBe(NOTICE_LIFETIME_MS - 200);
    expect(narrationRemaining(item, NOTICE_LIFETIME_MS + 500)).toBe(0);
  });
});

describe("which column presents a moment", () => {
  // Split by what the moment is, not by whose it is: both players' clauses read on the
  // left and both players' card lists on the right.
  it("puts a clause in the text column whichever side raised it", () => {
    expect(narrationSlot({ notice: notice({ side: "you" }) }, false)).toBe("narration-text");
    expect(narrationSlot({ notice: notice({ side: "opp" }) }, false)).toBe("narration-text");
  });

  it("puts a panel of cards in the card column", () => {
    expect(narrationSlot({ panel: panel() }, false)).toBe("narration-cards");
  });

  it("reads a deletion as a card list rather than as a clause", () => {
    const deletion = notice({ body: { variant: "deletion", cards: [{ cardId: "BT1-010" }] } });
    expect(narrationSlot({ notice: deletion }, false)).toBe("narration-cards");
  });

  it("gives a moment carrying both halves a place in each column", () => {
    expect(narrationSlots({ panel: panel(), notice: notice() }, false)).toEqual(["narration-text", "narration-cards"]);
  });

  it("folds both into one slot where the layout has only room for one", () => {
    expect(narrationSlots({ panel: panel(), notice: notice() }, true)).toEqual(["narration"]);
  });
});

describe("pushing a moment into its column", () => {
  const clause = (id: string): NarrationItem => ({
    id,
    side: "you",
    batchId: "b1",
    createdAt: 0,
    notice: notice(),
  });
  const cards = (id: string): NarrationItem => ({
    id,
    side: "opp",
    batchId: "b1",
    createdAt: 0,
    panel: panel(),
  });

  it("keeps each column independent, so a card list never evicts the clause beside it", () => {
    const after = pushNarrationItem(pushNarrationItem(new Map(), clause("a"), 1, false), cards("b"), 1, false);
    expect([...after.keys()]).toEqual(["a", "b"]);
  });

  it("drops the oldest moment of the same column once that column is full", () => {
    const after = pushNarrationItem(pushNarrationItem(new Map(), clause("a"), 1, false), clause("b"), 1, false);
    expect([...after.keys()]).toEqual(["b"]);
  });

  it("makes both columns share one queue where the layout folds them together", () => {
    const after = pushNarrationItem(pushNarrationItem(new Map(), clause("a"), 1, true), cards("b"), 1, true);
    expect([...after.keys()]).toEqual(["b"]);
  });
});
