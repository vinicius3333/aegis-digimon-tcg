import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-072.js";

describe("EX6-072 Mega Digimon Assembly!", () => {
  it("waives color requirements against a level 6 or higher opposing Digimon and DNA digivolves a level 6 plus hand card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: { kind: "opponentHas" },
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({
      kind: "DnaDigivolve",
      optional: true,
      payCost: true,
      materials: [
        { zone: "battleArea", count: 1 },
        { zone: "hand", count: 1 },
      ],
      into: { levels: [7], zone: "hand" },
    });
  });
  it("returns a level 6 or higher Digimon from trash and adds itself from security", () =>
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions).toMatchObject([
      { kind: "Return", to: "hand", target: { filter: { zone: "trash", levelComparison: { op: "gte", value: 6 } } } },
      { kind: "AddToHandSelf" },
    ]));
});
