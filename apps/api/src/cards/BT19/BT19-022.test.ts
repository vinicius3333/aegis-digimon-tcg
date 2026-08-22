import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-022 Greymon", () => {
  it("preserves dual Blocker, Blue Flare trash Save, and self Save under a Tamer", () => {
    const card = runtimeCompiledCard("BT19-022");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Blocker" }] },
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlaceUnder",
            target: {
              from: ["trash"],
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Blue Flare"], match: "trait" }],
              },
            },
            underFilter: { controller: "mine", kind: ["Tamer"] },
            optional: true,
          },
          {
            kind: "PlaceUnder",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            underFilter: { controller: "mine", kind: ["Tamer"], excludeToken: true },
            optional: true,
          },
        ],
      },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker" }] },
    ]);
  });
});
