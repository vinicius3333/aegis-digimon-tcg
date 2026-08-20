import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-018.js";

describe("EX5-018 Garurumon (X Antibody)", () => {
  it("draws two, trashes two, and gains memory when its stack has Garurumon/X Antibody", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions;
    expect(actions).toMatchObject([{ kind: "Draw", amount: 2 }, { kind: "Trash", target: { filter: { zone: "hand" }, count: 2 } }, { kind: "GainMemory", amount: 1, condition: { kind: "selfDigivolutionStackHasTrait" } }]);
  });
  it("prevents deletion by returning two non-Digi-Egg trash cards to deck bottom", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "Replacement", event: "wouldBeDeleted", outcome: "preventDeletion", cost: { kind: "return", target: { filter: { excludeKind: ["DigiEgg"] }, count: 2, to: "deckBottom" } } });
  });
});
