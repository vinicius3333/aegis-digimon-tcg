import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-016.js";

describe("EX7-016 Paledramon", () => {
  it("reveals three for Paledramon/Hexeblaumon and Ice-Snow cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }], rest: "deckBottom" }));
  it("grants Ice-Snow as a rule and inherits once-per-turn top evolution trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }] });
  });
});
