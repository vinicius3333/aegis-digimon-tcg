import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./ST23-04.js";

describe("ST23-04 Murasamemon", () => {
  it("uses the printed under-Tamer cost for play and inherited unsuspend abilities", () => {
    const card = runtimeCompiledCard("ST23-04");
    const actions = card?.effects.flatMap((effect) => effect.actions);
    expect(actions?.filter((action) => "cost" in action && action.cost !== undefined)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ cost: expect.objectContaining({ kind: "trashBottomFaceDownUnderTamer" }) }),
      ]),
    );
    expect(card?.effects.find((effect) => effect.isInherited)).toMatchObject({ frequency: "OncePerTurn" });
  });
});
