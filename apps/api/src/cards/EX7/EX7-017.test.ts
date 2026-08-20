import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-017.js";

describe("EX7-017 Hexeblaumon", () => {
  it("has Ice Clad, grants Ice-Snow, and inherits top evolution trash", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords?.[0]?.keyword).toBe("IceClad");
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }] });
  });
});
