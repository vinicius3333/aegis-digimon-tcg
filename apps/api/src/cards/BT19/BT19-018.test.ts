import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-018 Betamon", () => {
  it("preserves Evade, the Aquatic rule trait, and inherited Jamming", () => {
    const card = runtimeCompiledCard("BT19-018");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Evade" }] },
      {
        trigger: "Rule",
        actions: [
          {
            kind: "GrantStatic",
            grant: "trait",
            tokens: ["Aquatic"],
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Jamming" }] },
    ]);
  });
});
