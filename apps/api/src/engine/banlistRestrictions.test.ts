import { describe, it, expect } from "vitest";
import {
  effectiveCopyLimit,
  banlistRestrictionMap,
  DEFAULT_COPY_LIMIT,
} from "./banlistRestrictions.js";

describe("banlist restriction map (latest-event-wins)", () => {
  it("returns the default cap of 4 for a card with no banlist event", () => {
    expect(DEFAULT_COPY_LIMIT).toBe(4);
    // BT1-010 has no banlist history.
    expect(effectiveCopyLimit("BT1-010")).toBe(4);
    // A fabricated id (never listed) also resolves to the default.
    expect(effectiveCopyLimit("ZZ99-999")).toBe(4);
  });

  it("honors a printed cap above 4 for every card that allows more (the six -> 50)", () => {
    // These cards declare maxCountInDeck: 50 ("you can include up to 50 copies").
    // The cap is the printed value, not the default 4, when no restriction applies.
    // The full set with maxCountInDeck !== 4 in cards.json; none is currently on the
    // banlist, so each must resolve to 50.
    for (const cardId of ["BT11-061", "BT22-079", "BT6-085", "EX11-027", "EX2-046", "EX9-048"]) {
      expect(effectiveCopyLimit(cardId)).toBe(50);
    }
  });

  it("caps a restricted card at its listed count (BT2-047 -> 1)", () => {
    expect(effectiveCopyLimit("BT2-047")).toBe(1);
  });

  it("caps a banned card at 0 (BT5-109)", () => {
    expect(effectiveCopyLimit("BT5-109")).toBe(0);
  });

  it("keeps the printed cap for a banned_pair card (EX2-007)", () => {
    // Banned only beside its partner; the pair rule lives in deckValidation.
    expect(effectiveCopyLimit("EX2-007")).toBe(4);
  });

  it("includes restrictions that are in force under the current banlist", () => {
    // BT2-090 has been banned since 2025-03-28 and BT23-032 restricted since
    // 2026-04-04, so both apply after their effective dates.
    expect(effectiveCopyLimit("BT2-090")).toBe(0);
    expect(effectiveCopyLimit("BT23-032")).toBe(1);
  });

  it("restores a card's printed limit when its lift is in force", () => {
    expect(effectiveCopyLimit("BT6-015")).toBe(4);
    expect(effectiveCopyLimit("BT7-086")).toBe(4);
  });

  it("only stores entries that actually restrict a card (no default-4 noise)", () => {
    expect(banlistRestrictionMap.has("BT9-099")).toBe(false);
    expect(banlistRestrictionMap.get("BT2-047")).toBe(1);
    expect(banlistRestrictionMap.get("BT5-109")).toBe(0);
  });
});
