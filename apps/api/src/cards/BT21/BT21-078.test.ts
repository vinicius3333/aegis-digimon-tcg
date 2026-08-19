import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-078.js";
describe("BT21-078 WereGarurumon", () => {
  it("deletes level 4 or lower and triggers Alliance plus an attack", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        frequency: "OncePerTurn",
        actions: expect.arrayContaining([
          expect.objectContaining({ kind: "SubTrigger" }),
          expect.objectContaining({ kind: "Attack" }),
        ]),
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
      }),
    );
  });
});
