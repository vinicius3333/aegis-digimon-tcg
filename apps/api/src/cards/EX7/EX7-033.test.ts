import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-033.js";

describe("EX7-033", () => {
  it("also has the Dinosaur trait", () => expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Dinosaur"] }));
  it("inherits Piercing", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Piercing", raw: "＜Piercing＞" }));
});
