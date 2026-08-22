import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-003 Plug-In Runner", () => {
  it("returns one Plug-In Option from trash once per turn as an inherited effect", () => {
    const card = runtimeCompiledCard("BT19-003");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "EndOfYourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          {
            kind: "Return",
            to: "hand",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Option"],
                nameOrTrait: [{ tokens: ["Plug-In"], match: "name" }],
              },
              count: 1,
            },
          },
        ],
      },
    ]);
  });
});
