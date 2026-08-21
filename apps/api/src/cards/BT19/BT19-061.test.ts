import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-061.js";

describe("BT19-061", () => {
  it("preserves DigiXros naming, dual reveal triggers, deletion placement, and inherited Collision", () => {
    const card = runtimeCompiledCard("BT19-061");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Static",
        actions: [{ kind: "GrantStatic", grant: "name", tokens: ["Sparrowmon"], digiXrosOnly: true }],
      },
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "RevealAdd",
            revealCount: 3,
            add: [{ count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["Xros Heart", "Blue Flare"] }] } }],
            rest: "trash",
          },
        ],
      })),
      {
        trigger: "OnDeletion",
        actions: [{ kind: "PlaceUnder", underFilter: { kind: ["Tamer"] } }],
      },
      { trigger: "YourTurn", isInherited: true, actions: [{ kind: "GainKeyword", keyword: { keyword: "Collision" } }] },
    ]);
  });
});
