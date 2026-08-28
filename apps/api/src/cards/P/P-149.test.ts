import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-149.js";

describe("P-149 Minomon", () => {
  it("encodes the inherited once-per-turn hand-costed deletion", () => {
    const compiled = runtimeCompiledCard("P-149")!;
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "WhenAttacking",
          isInherited: true,
          frequency: "OncePerTurn",
          actions: [
            expect.objectContaining({
              kind: "Delete",
              optional: true,
              abortOnDecline: true,
              target: expect.objectContaining({
                filter: { controller: "opponent", kind: ["Digimon"], levels: [3] },
                count: 1,
              }),
              condition: expect.objectContaining({ kind: "selfColorCount", value: 2 }),
              cost: expect.objectContaining({
                kind: "trash",
                target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
              }),
            }),
          ],
        }),
      ]),
    );
  });
});
