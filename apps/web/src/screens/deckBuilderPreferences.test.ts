import { describe, expect, it } from "vitest";
import {
  DECK_SHARE_MAX,
  DECK_SHARE_MIN,
  getDeckBuilderPreferences,
  sanitizeDeckBuilderPreferences,
  setDeckBuilderPreferences,
} from "./deckBuilderPreferences";

describe("deck builder preferences", () => {
  it("drops invalid values and clamps the deck share", () => {
    expect(sanitizeDeckBuilderPreferences({ deckShare: 0.9, deckView: "table", deckSort: "nope" })).toEqual({
      deckShare: DECK_SHARE_MAX,
    });
    expect(sanitizeDeckBuilderPreferences({ deckShare: 0.1, deckView: "list", deckSort: "dp" })).toEqual({
      deckShare: DECK_SHARE_MIN,
      deckView: "list",
      deckSort: "dp",
    });
    expect(sanitizeDeckBuilderPreferences(null)).toEqual({});
  });

  it("keeps valid changes and ignores invalid ones", () => {
    setDeckBuilderPreferences({ deckShare: 0.5, deckView: "list", deckSort: "level" });
    setDeckBuilderPreferences({ deckView: "table" as "grid" });
    expect(getDeckBuilderPreferences()).toEqual({ deckShare: 0.5, deckView: "list", deckSort: "level" });
  });
});
