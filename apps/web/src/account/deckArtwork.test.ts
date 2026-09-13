// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountApi } from "./client";
import type { DeckListing } from "../game/decks";

afterEach(() => vi.unstubAllGlobals());

describe("account deck artwork", () => {
  it("sends and loads aligned printing choices", async () => {
    const deck: DeckListing = {
      id: "art",
      name: "Art",
      color: "Red",
      blurb: "",
      mainDeck: ["BT1-010", "BT1-010"],
      eggDeck: ["BT1-001"],
      mainDeckArts: ["BT1-010", "BT1-010_P1"],
      eggDeckArts: ["BT1-001"],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([deck]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await accountApi.saveDeck(deck);
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]?.body));
    expect(body.mainDeck).toEqual(deck.mainDeck);
    expect(body.mainDeckArts).toEqual(deck.mainDeckArts);
    expect(body.eggDeckArts).toEqual(deck.eggDeckArts);
    expect((await accountApi.decks())[0]?.mainDeckArts).toEqual(deck.mainDeckArts);
  });
});
