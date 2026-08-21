import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
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
  it("exposes all three keywords on the live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX8-051", as: "proganomon" }] } });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("proganomon"), "Collision")).toBe(true);
    expect(observe(s.engine).hasPierce(s.perm("proganomon"))).toBe(true);
  });
});
