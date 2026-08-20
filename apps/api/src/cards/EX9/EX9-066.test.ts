import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-066.js";

describe("EX9-066", () => {
  it("returns a Greymon, Garurumon, or Omnimon from trash, or draws if none was returned", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "Return", to: "hand", bindResultAs: "returnedCard", target: { filter: { zone: "trash" } } }, { kind: "Draw", amount: 1, condition: { kind: "bindingEmpty", ref: "returnedCard" } }] }));
  it("reacts to own Digimon play and digivolution by suspending this Tamer and gaining memory", () => {
    const triggers = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions ?? [];
    expect(triggers.filter((action) => action.kind === "SubTrigger")).toHaveLength(2);
    expect(triggers[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 0 }, { kind: "GainMemory", amount: 1 }, { kind: "GainMemory", amount: 1 }] });
  });
});
