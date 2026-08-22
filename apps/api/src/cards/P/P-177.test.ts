import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-177.js";

describe("P-177 Gigimon", () => {
  it("encodes its optional inherited On Deletion return of a named Growlmon or Gallantmon", () => {
    expect(runtimeCompiledCard("P-177")!.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      isInherited: true,
      actions: [{
        kind: "Return",
        optional: true,
        to: "hand",
        target: {
          count: 1,
          filter: {
            zone: "trash",
            controller: "mine",
            nameOrTrait: [{ tokens: ["Growlmon", "Gallantmon"], match: "name" }],
          },
        },
      }],
    });
  });
});
