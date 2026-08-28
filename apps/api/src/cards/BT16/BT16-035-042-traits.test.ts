import { describe, expect, it } from "vitest";
import { compiled as bt16035 } from "./BT16-035.js";
import { compiled as bt16042 } from "./BT16-042.js";

describe("BT16 rule traits", () => {
  it("keeps BT16-035 Angel and BT16-042 Insectoid active continuously", () => {
    for (const [compiled, trait] of [
      [bt16035, "Angel"],
      [bt16042, "Insectoid"],
    ] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === "Static")?.actions).toContainEqual(
        expect.objectContaining({ kind: "GrantStatic", grant: "trait", tokens: [trait] }),
      );
    }
  });
});
