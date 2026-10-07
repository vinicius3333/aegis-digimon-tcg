// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckListing } from "../game/decks";
import { getDeckListSort, orderDecks, setDeckListSort } from "./deckListOrder";

const deck = (id: string, name: string, cardId: string, updatedAt?: number): DeckListing => ({
  id,
  name,
  color: "Neutral",
  blurb: "",
  mainDeck: [cardId],
  eggDeck: [],
  updatedAt,
});

const blue = deck("blue", "zeta Blue", "BT1-027", 300);
const red = deck("red", "Alpha Red", "BT1-009", 100);
const legacy = deck("legacy", "beta legacy", "BT1-086");
const decks = [legacy, blue, red];

const ids = (list: DeckListing[]) => list.map((entry) => entry.id);

describe("orderDecks", () => {
  it("puts the most recently edited first and keeps untimestamped decks last in stored order", () => {
    const older = deck("older", "older legacy", "BT1-009");
    expect(ids(orderDecks([legacy, blue, older, red], "recent"))).toEqual(["blue", "red", "legacy", "older"]);
  });

  it("sorts by name without regard to case", () => {
    expect(ids(orderDecks(decks, "name"))).toEqual(["red", "legacy", "blue"]);
  });

  it("groups by main color in the game's color order, then by name", () => {
    expect(ids(orderDecks(decks, "color"))).toEqual(["red", "legacy", "blue"]);
  });

  it("keeps only decks whose name contains the filter", () => {
    expect(ids(orderDecks(decks, "name", "  ALPHA "))).toEqual(["red"]);
    expect(orderDecks(decks, "name", "missing")).toEqual([]);
  });

  it("does not reorder the caller's list", () => {
    orderDecks(decks, "name");
    expect(ids(decks)).toEqual(["legacy", "blue", "red"]);
  });
});

describe("deck list sort preference", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("persists the chosen order on this device", async () => {
    setDeckListSort("color");
    expect(getDeckListSort()).toBe("color");
    expect(localStorage.getItem("aegis:deckListSort")).toBe("color");
    const fresh = await import("./deckListOrder");
    expect(fresh.getDeckListSort()).toBe("color");
  });

  it("falls back to last edited for an unknown stored order", async () => {
    localStorage.setItem("aegis:deckListSort", "size");
    const fresh = await import("./deckListOrder");
    expect(fresh.getDeckListSort()).toBe("recent");
  });
});
