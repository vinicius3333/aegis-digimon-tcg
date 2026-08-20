import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-066.js";

describe("EX6-066 Sea of Destruction", () => {
  it("places an Aqua/Sea Animal Digimon from hand under a blue Digimon and returns all opponents at its level", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: "all" }, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", underFilter: { colors: ["Blue"] } } }));
  it("returns all opposing Digimon with the lowest level from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: "all", filter: { superlative: "lowestLevel" } } }));
});
