import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-009.js";

describe("EX8-009", () => {
  it("reveals 3 for Growlmon/Gallantmon and X Antibody cards on play and digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3 });
  });
  it("inherits once-per-turn memory gain when an opposing Digimon is deleted during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
