import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-056.js";

describe("EX5-056 Xuanwumon", () => {
  it("draws based on opposing Digimon and trashes one card from hand on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Draw", amount: 1, scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"] } } }, { kind: "Trash", target: { count: 1, filter: { zone: "hand", controller: "mine" } } }]);
  });
  it("inherits once-per-turn memory when an opponent plays a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }] });
  });
});
