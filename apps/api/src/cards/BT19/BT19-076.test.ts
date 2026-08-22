import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-076.js";

describe("BT19-076", () => {
  it("preserves reveal/add, optional Tamer play, and Save", () => {
    const card = runtimeCompiledCard("BT19-076");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "OnPlay",
        actions: [
          { kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }], rest: "deckBottom" },
          {
            kind: "PlayWithoutCost",
            from: ["hand"],
            payCost: false,
            optional: true,
            target: { filter: { kind: ["Tamer"], playCostLte: 4 } },
          },
        ],
      },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
    ]);
  });
});
