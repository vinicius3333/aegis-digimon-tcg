import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@aegis/shared";
import { DECK_MAX_LAYERS, deckLayerCount, deckRiffleFromEvent } from "./deckChrome";

describe("deckLayerCount", () => {
  it("draws no pile at all for an empty deck", () => {
    expect(deckLayerCount(0)).toBe(0);
    expect(deckLayerCount(-1)).toBe(0);
  });

  it("keeps a layer under the last card", () => {
    expect(deckLayerCount(1)).toBe(1);
    expect(deckLayerCount(3)).toBe(1);
  });

  it("thickens with the count", () => {
    expect(deckLayerCount(16)).toBe(2);
    expect(deckLayerCount(24)).toBe(3);
  });

  it("stops thickening once the offsets stop reading as depth", () => {
    expect(deckLayerCount(200)).toBe(DECK_MAX_LAYERS);
  });

  it("never grows as the deck shrinks", () => {
    for (let count = 1; count < 60; count += 1) {
      expect(deckLayerCount(count)).toBeGreaterThanOrEqual(deckLayerCount(count - 1));
    }
  });
});

describe("deckRiffleFromEvent", () => {
  it("riffles the deck the server says it shuffled", () => {
    const event: ServerEvent = { kind: "deckShuffled", seat: 0, deck: "deck" };
    expect(deckRiffleFromEvent(event, 4)).toEqual({ key: 4, seat: 0, pile: "deck" });
  });

  it("riffles the egg deck on its own shuffle", () => {
    const event: ServerEvent = { kind: "deckShuffled", seat: 1, deck: "eggDeck" };
    expect(deckRiffleFromEvent(event, 1)).toEqual({ key: 1, seat: 1, pile: "eggDeck" });
  });

  it("leaves cards returning to a deck alone, because §3-2-3 does not reorder it", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["mine"], from: "hand", to: "deckBottom" };
    expect(deckRiffleFromEvent(event, 1)).toBeNull();
  });

  it("ignores every other event", () => {
    expect(deckRiffleFromEvent({ kind: "securityRecovered", seat: 0, amount: 1 }, 1)).toBeNull();
  });
});
