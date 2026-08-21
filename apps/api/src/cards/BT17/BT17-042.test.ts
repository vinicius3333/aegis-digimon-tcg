import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-042.js";

describe("BT17-042 Argomon", () => {
  it("reveals three, adds one Argomon and one Rhythm, and bottoms the rest", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Argomon"], match: "name" }] }, count: 1, to: "hand" }, { filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "name" }] }, count: 1, to: "hand" }], rest: "deckBottom" });
  });

  it("gains one memory on deletion as an inherited effect", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "GainMemory", amount: 1 }] });
  });
});
