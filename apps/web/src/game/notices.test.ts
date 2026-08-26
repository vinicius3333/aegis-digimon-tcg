import { describe, expect, it } from "vitest";
import type { Seat, ServerEvent } from "@aegis/shared";
import {
  dismissNotice,
  effectNoticeFromEvent,
  expireNotices,
  keywordNoticeFromEvent,
  MAX_VISIBLE_NOTICES,
  nextNoticeExpiry,
  noticeAnchor,
  noticeLifetime,
  noticeRemaining,
  noticesAt,
  NOTICE_CROWDED_LIFETIME_MS,
  NOTICE_LIFETIME_MS,
  occupiedAnchors,
  pushNotice,
  recoveryNoticeFromEvent,
  rejectionNotice,
  type MatchNotice,
} from "./notices";

const VIEWER: Seat = 0;

function notice(overrides: Partial<MatchNotice> = {}): MatchNotice {
  return {
    id: "n1",
    side: "you",
    fromSecurity: false,
    body: { variant: "effect", cardId: "BT1-001" },
    createdAt: 0,
    ...overrides,
  };
}

const resolved = (seat: Seat): ServerEvent => ({
  kind: "effectTriggered",
  seat,
  sourceCardId: "BT1-010",
  effectKey: "k",
  description: "Draw 1.",
  timing: "OnPlay",
});

describe("keywordNoticeFromEvent", () => {
  const played = (cardId: string, seat: Seat = 0): ServerEvent => ({ kind: "cardPlayed", seat, cardId });

  it("calls out a played card that could only have reached the field by DigiXros", () => {
    expect(keywordNoticeFromEvent(played("BT10-066"), VIEWER, "k", 4)).toEqual({
      id: "k",
      side: "you",
      fromSecurity: false,
      body: { variant: "keyword", keyword: "digiXros", cardId: "BT10-066" },
      createdAt: 4,
    });
    expect(keywordNoticeFromEvent(played("BT10-066", 1), VIEWER, "k", 0)?.side).toBe("opp");
  });

  it("stays quiet for a card with no DigiXros requirement", () => {
    expect(keywordNoticeFromEvent(played("BT1-001"), VIEWER, "k", 0)).toBeNull();
  });

  it("ignores other events", () => {
    expect(keywordNoticeFromEvent(resolved(0), VIEWER, "k", 0)).toBeNull();
  });
});

describe("effectNoticeFromEvent", () => {
  it("carries the clause and its card for either seat", () => {
    expect(effectNoticeFromEvent(resolved(0), VIEWER, "a", 7)).toEqual({
      id: "a",
      side: "you",
      fromSecurity: false,
      body: { variant: "effect", cardId: "BT1-010", timing: "OnPlay", description: "Draw 1." },
      createdAt: 7,
    });
    expect(effectNoticeFromEvent(resolved(1), VIEWER, "b", 0)?.side).toBe("opp");
  });

  it("marks an effect a security card raised", () => {
    expect(effectNoticeFromEvent(resolved(0), VIEWER, "a", 0, true)?.fromSecurity).toBe(true);
  });

  it("ignores other events", () => {
    expect(effectNoticeFromEvent({ kind: "securityRecovered", seat: 0, amount: 1 }, VIEWER, "a", 0)).toBeNull();
  });
});

describe("recoveryNoticeFromEvent", () => {
  it("lands on the recovering player's side", () => {
    expect(recoveryNoticeFromEvent({ kind: "securityRecovered", seat: 1, amount: 2 }, VIEWER, "a", 0)).toEqual({
      id: "a",
      side: "opp",
      fromSecurity: false,
      body: { variant: "recovery", amount: 2 },
      createdAt: 0,
    });
  });

  it("ignores other events", () => {
    expect(recoveryNoticeFromEvent(resolved(0), VIEWER, "a", 0)).toBeNull();
  });
});

describe("rejectionNotice", () => {
  it("is always the viewer's own", () => {
    expect(rejectionNotice("Not enough memory.", "a", 1)).toEqual({
      id: "a",
      side: "you",
      fromSecurity: false,
      body: { variant: "rejection", reason: "Not enough memory." },
      createdAt: 1,
    });
  });
});

describe("noticeAnchor", () => {
  it("reads the viewer's effects from the bottom left and the opponent's from the top right", () => {
    expect(noticeAnchor(notice({ side: "you" }))).toBe("bottom-left");
    expect(noticeAnchor(notice({ side: "opp" }))).toBe("top-right");
  });

  it("mirrors a security effect away from the panel stack", () => {
    expect(noticeAnchor(notice({ fromSecurity: true }), "right")).toBe("middle-left");
    expect(noticeAnchor(notice({ fromSecurity: true }), "left")).toBe("middle-right");
  });
});

describe("notice lifetimes", () => {
  it("disperses a crowded stack faster", () => {
    expect(noticeLifetime(2)).toBe(NOTICE_LIFETIME_MS);
    expect(noticeLifetime(3)).toBe(NOTICE_CROWDED_LIFETIME_MS);
  });

  it("shortens every notice's clock once the third one arrives", () => {
    const pair = [notice({ id: "a" }), notice({ id: "b" })];
    expect(noticeRemaining(pair, pair[0]!, 0)).toBe(NOTICE_LIFETIME_MS);
    const three = [...pair, notice({ id: "c" })];
    expect(noticeRemaining(three, three[0]!, 0)).toBe(NOTICE_CROWDED_LIFETIME_MS);
  });

  it("drops a notice once its time is spent", () => {
    const only = [notice({ createdAt: 0 })];
    expect(expireNotices(only, NOTICE_LIFETIME_MS - 1)).toEqual(only);
    expect(expireNotices(only, NOTICE_LIFETIME_MS)).toEqual([]);
  });

  it("reports the soonest expiry so one step can hold for the whole stack", () => {
    expect(nextNoticeExpiry([], 0)).toBeNull();
    expect(nextNoticeExpiry([notice({ createdAt: 0 }), notice({ id: "b", createdAt: 100 })], 100)).toBe(
      NOTICE_LIFETIME_MS - 100,
    );
  });
});

describe("pushNotice", () => {
  it("drops the oldest past the visible maximum", () => {
    const stack = [1, 2, 3, 4].reduce<MatchNotice[]>(
      (acc, n) => pushNotice(acc, notice({ id: `n${n}`, createdAt: n })),
      [],
    );
    expect(stack).toHaveLength(MAX_VISIBLE_NOTICES);
    expect(stack.map((n) => n.id)).toEqual(["n2", "n3", "n4"]);
  });
});

describe("dismissNotice", () => {
  it("removes only the named notice", () => {
    expect(dismissNotice([notice({ id: "a" }), notice({ id: "b" })], "a").map((n) => n.id)).toEqual(["b"]);
  });
});

describe("grouping by anchor", () => {
  it("lists each occupied anchor once, and its notices oldest first", () => {
    const stack = [
      notice({ id: "mine-new", side: "you", createdAt: 5 }),
      notice({ id: "theirs", side: "opp", createdAt: 1 }),
      notice({ id: "mine-old", side: "you", createdAt: 2 }),
    ];
    expect(occupiedAnchors(stack)).toEqual(["bottom-left", "top-right"]);
    expect(noticesAt(stack, "bottom-left").map((n) => n.id)).toEqual(["mine-old", "mine-new"]);
  });
});
