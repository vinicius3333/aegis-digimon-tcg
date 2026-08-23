import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-053.js";

describe("EX4-053 Falcomon", () => {
  it("reveals three and adds purple Ravemon/Bird/Avian plus Keenan Crier", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: {
            colors: ["Purple"],
            nameOrTrait: [
              { match: "name", tokens: ["Ravemon"] },
              { match: "trait", tokens: ["Bird", "Avian"] },
            ],
          },
        },
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Keenan Crier"] }] } },
      ],
    });
  });
  it("inherits hand trashing only when deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });
});
