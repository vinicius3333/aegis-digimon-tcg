import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-015.js";

describe("EX9-015", () => {
  it("has Training and inherits once-per-turn trashing 1 digivolution card from an opposing Digimon when attacking", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({
      keyword: "Training",
      raw: "＜Training＞",
    });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        { kind: "TrashDigivolution", amount: 1, target: { count: 1, filter: { digivolutionCards: "hasAny" } } },
      ],
    });
  });
});
