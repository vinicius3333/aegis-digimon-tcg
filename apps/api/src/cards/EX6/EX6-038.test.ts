import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-038.js";

describe("EX6-038 Kakkinmon", () => {
  it("pays 1 and places an Option under a level 3 or Legend-Arms Digimon for +2000 DP", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, cost: { kind: "compound", costs: [{ kind: "payMemory", memory: 1 }, { kind: "place", destination: "digivolutionStack", position: "bottom" }] } }));
  it("draws once per turn on stack addition and inherits +2000 DP on opponent's turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onAddDigivolutionCards", actions: [{ kind: "Draw", amount: 1 }] });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" });
  });
});
