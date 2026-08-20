import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-047.js";

describe("EX9-047", () => {
  it("has Rush and Collision and returns a Negamon-text Digimon from trash on deletion", () => {
    expect(compiled.effects?.flatMap((entry) => entry.keywords)).toEqual(expect.arrayContaining([{ keyword: "Rush", raw: "＜Rush＞" }, { keyword: "Collision", raw: "＜Collision＞" }]));
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "Return", to: "hand", target: { filter: { zone: "trash", nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } } }] });
  });
  it("inherits +1000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] }));
});
