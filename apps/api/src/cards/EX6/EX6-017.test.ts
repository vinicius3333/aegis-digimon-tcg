import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-017.js";

describe("EX6-017 Luxmon", () => {
  it("reveals three and adds up to Angel/Archangel and Three Great Angels cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
  });
  it("inherits once-per-turn draw when attacking with the required traits", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", amount: 1, condition: { kind: "selfHasTrait" } }],
    });
  });
});
