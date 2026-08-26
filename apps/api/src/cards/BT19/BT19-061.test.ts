import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
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
      {
        trigger: "YourTurn",
        isInherited: true,
        actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Collision" } }, while: { kind: "selfHasTrait" } }],
      },
    ]);
  });

  it("grants inherited Collision only to an Xros Heart host", async () => {
    const s = setupEngine({ 0: { battleArea: [
      { card: "BT19-058", as: "nonXros", under: ["BT19-061"] },
      { card: "BT19-057", as: "xros", under: ["BT19-061"] },
    ] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("nonXros"), "Collision")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("xros"), "Collision")).toBe(true);
  });
});
