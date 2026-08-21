import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-054.js";

describe("BT17-054 Trailmon", () => {
  it("reveals three, adds one Tamer or Machine Digimon, and trashes the rest", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0];
    expect(action).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ filter: { controllerDefault: "mine", kind: ["Tamer"] }, orFilters: [{ kind: ["Digimon"], nameOrTrait: [{ tokens: ["Machine"], match: "trait" }] }], count: 1, to: "hand" }],
      rest: "trash",
    });
  });

  it("grants Collision on your turn only while this Digimon has the Machine trait", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Collision" } }, while: { kind: "selfHasTrait" } }] });
  });
});
