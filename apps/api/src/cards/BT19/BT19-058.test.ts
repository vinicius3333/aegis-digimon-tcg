import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-058 SkullKnightmon", () => {
  it("preserves Blocker on the card, Save on deletion, and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-058");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", actions: [], keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
      { trigger: "OnDeletion", actions: [], keywords: [{ keyword: "Save", raw: "＜Save＞" }] },
      { trigger: "Static", actions: [], isInherited: true, keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] },
    ]);
  });
});
