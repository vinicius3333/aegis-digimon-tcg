import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-046.js";

describe("EX5-046 Targetmon", () => {
  it("has Blocker and is also treated as Etemon and Sukamon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toMatchObject([{ keyword: "Blocker" }]);
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions?.[0]).toMatchObject({ kind: "GrantStatic", grant: "name", tokens: ["Etemon", "Sukamon"] });
  });
  it("can return itself from trash by trashing an Etemon/Sukamon card and has a deletion prevention replacement", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({ kind: "Return", to: "hand", optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { zone: "hand", nameOrTrait: [{ match: "name", tokens: ["Etemon", "Sukamon"] }] } } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "Replacement", event: "wouldBeDeleted" });
  });
});
