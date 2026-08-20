import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-030.js";

describe("BT15-030", () => {
  it("trashes up to two cards from every opposing stack and returns a stackless Digimon to deck bottom", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "TrashDigivolution", amount: 2, fromTop: true, target: { count: "all" } }, { kind: "Return", to: "deckBottom", target: { filter: { digivolutionCards: "none" } } }] });
  });
  it("repeats the same removal on deletion", () => expect(compiled.effects?.[2]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "TrashDigivolution", amount: 2 }, { kind: "Return", to: "deckBottom" }] }));
});
