import { describe, expect, it } from "vitest";
import type { Seat, ServerEvent } from "@aegis/shared";
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

const seatOf = (instanceId: string): Seat | undefined => (instanceId === "mine" ? 0 : undefined);

describe("deckRiffleFromEvent", () => {
  it("riffles the main deck when cards are put back into it", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["mine"], from: "hand", to: "deck" };
    expect(deckRiffleFromEvent(event, 4, seatOf)).toEqual({ key: 4, seat: 0, pile: "deck" });
  });

  it("riffles the egg deck for its own returns", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["mine"], from: "breeding", to: "eggDeck" };
    expect(deckRiffleFromEvent(event, 1, seatOf)?.pile).toBe("eggDeck");
  });

  it("leaves a draw alone", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["mine"], from: "deck", to: "hand" };
    expect(deckRiffleFromEvent(event, 1, seatOf)).toBeNull();
  });

  it("stays still when the owner cannot be resolved", () => {
    const event: ServerEvent = { kind: "cardsMoved", instanceIds: ["theirs"], from: "hand", to: "deck" };
    expect(deckRiffleFromEvent(event, 1, seatOf)).toBeNull();
  });

  it("ignores every other event", () => {
    expect(deckRiffleFromEvent({ kind: "securityRecovered", seat: 0, amount: 1 }, 1, seatOf)).toBeNull();
  });
});
