import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-021 Jellymon", () => {
  it("returns a level 3 opposing Digimon on play and digivolution, with Aquatic and inherited Jamming", () => {
    const card = runtimeCompiledCard("BT19-021");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      ...["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          {
            kind: "Return",
            to: "hand",
            target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
          },
        ],
      })),
      { trigger: "Rule", actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }] },
      { trigger: "Static", isInherited: true, keywords: [{ keyword: "Jamming" }] },
    ]);
  });
});
