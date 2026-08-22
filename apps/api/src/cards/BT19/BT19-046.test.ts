import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-046", () => {
  it("preserves OnPlay and WhenDigivolving suspension plus Data unsuspend restriction", () => {
    const card = runtimeCompiledCard("BT19-046");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject(
      ["OnPlay", "WhenDigivolving"].map((trigger) => ({
        trigger,
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] } } },
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"], trait: ["Data"] } },
            restriction: "unsuspend",
            duration: "untilOpponentTurnEnd",
          },
        ],
      })),
    );
  });
});
