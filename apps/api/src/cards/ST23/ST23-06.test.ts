import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST23-06.js";

describe("ST23-06 Gekkomon", () => {
  it("reveals three and independently adds one card and places one face down under a Glowing Dawn Tamer", () => {
    const actions = runtimeCompiledCard("ST23-06")?.effects
      .filter((effect) => effect.trigger === "OnPlay" || effect.trigger === "WhenMoving")
      .flatMap((effect) => effect.actions);
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: expect.arrayContaining([
        expect.objectContaining({ to: "hand", count: 1 }),
        expect.objectContaining({ to: "underTamer", faceDown: true, underFilter: expect.objectContaining({ nameOrTrait: [{ match: "trait", tokens: ["Glowing Dawn"] }] }) }),
      ]) }),
    ]));
  });
});
