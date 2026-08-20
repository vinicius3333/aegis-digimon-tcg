import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-020.js";

describe("EX7-020 Hexeblaumon", () => {
  it("trashes two evolution cards and grants Jamming/Blocker if the opponent has no stacked Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "TrashDigivolution", amount: 2, fromTop: false }, { kind: "GainKeyword", keyword: { keyword: "Jamming" }, condition: { kind: "opponentHasNone" } }, { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "opponentHasNone" } }]));
  it("grants Ice-Snow and inherits once-per-turn top evolution trash", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Rule")?.actions[0]).toMatchObject({ kind: "GrantStatic", grant: "trait", tokens: ["Ice-Snow"] });
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }] });
  });
});
