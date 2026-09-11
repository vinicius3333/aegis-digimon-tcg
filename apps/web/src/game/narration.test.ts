import { describe, expect, it } from "vitest";
import {
  buildNarrationItems,
  isQueuedNotice,
  narrationReadingTime,
  narrationRemaining,
  narrationSlot,
  noticeSourceCardId,
  panelSourceCardId,
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

describe("which slot presents a moment", () => {
  it("gives the viewer one corner and the opponent the other", () => {
    expect(narrationSlot({ side: "you" }, false)).toBe("narration-you");
    expect(narrationSlot({ side: "opp" }, false)).toBe("narration-opp");
  });

  it("folds both into one slot where the layout has only room for one", () => {
    expect(narrationSlot({ side: "you" }, true)).toBe("narration");
    expect(narrationSlot({ side: "opp" }, true)).toBe("narration");
  });
});
