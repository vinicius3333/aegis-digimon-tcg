import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./BT19-058.js";

describe("BT19-058", () => {
  it("preserves printed Blocker, Save, and inherited Blocker", () => {
    const card = runtimeCompiledCard("BT19-058");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      { trigger: "OnDeletion", keywords: [{ keyword: "Save" }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
  });
});
