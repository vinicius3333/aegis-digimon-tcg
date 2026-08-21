import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-051.js";

describe("EX8-051", () => {
  it("has Collision, Piercing, and Fragment (3)", () =>
    expect(
      compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? []),
    ).toEqual(
      expect.arrayContaining([
        { keyword: "Collision", raw: "＜Collision＞" },
        { keyword: "Piercing", raw: "＜Piercing＞" },
        { keyword: "Fragment", amount: 3, raw: "＜Fragment (3)＞" },
      ]),
    ));
});
