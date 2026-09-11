import { describe, expect, it } from "vitest";
import type { Seat, ServerEvent } from "@aegis/shared";
import {
  effectNoticeFromEvent,
  isOwnEffectNotice,
  keywordNoticeFromEvent,
  noticeRemaining,
  NOTICE_LIFETIME_MS,
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

  it("marks an effect the server stamped as fired mid-check", () => {
    const event: ServerEvent = { ...resolved(0), duringSecurityCheck: true } as ServerEvent;
    expect(effectNoticeFromEvent(event, VIEWER, "a", 0)?.fromSecurity).toBe(true);
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

describe("notice lifetimes", () => {
  it("gives every notice the same reading time, whatever else is on screen", () => {
    expect(noticeRemaining(notice({ createdAt: 0 }), 0)).toBe(NOTICE_LIFETIME_MS);
    expect(noticeRemaining(notice({ createdAt: 0 }), 200)).toBe(NOTICE_LIFETIME_MS - 200);
  });

  it("never reports a negative remainder", () => {
    expect(noticeRemaining(notice({ createdAt: 0 }), NOTICE_LIFETIME_MS + 500)).toBe(0);
  });
});

describe("isOwnEffectNotice", () => {
  it("names the viewer's own clause for one card, and nobody else's", () => {
    expect(isOwnEffectNotice(notice({ side: "you" }), "BT1-001")).toBe(true);
    expect(isOwnEffectNotice(notice({ side: "you" }), "BT1-002")).toBe(false);
    expect(isOwnEffectNotice(notice({ side: "opp" }), "BT1-001")).toBe(false);
    expect(isOwnEffectNotice(notice({ body: { variant: "recovery", amount: 1 } }), "BT1-001")).toBe(false);
  });
});
