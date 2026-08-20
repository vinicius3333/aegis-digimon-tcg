import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-028.js";

describe("EX8-028", () => {
  it("has Ice Clad and Barrier and plays an Ice-Snow Digimon from hand when digivolving", () => {
    expect(compiled.effects?.filter((entry) => entry.trigger === "Static").flatMap((entry) => entry.keywords ?? [])).toEqual(expect.arrayContaining([{ keyword: "IceClad", raw: "＜Ice Clad＞" }, { keyword: "Barrier", raw: "＜Barrier＞" }]));
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1 } });
  });
  it("has once-per-turn self-unsuspend effects when digivolving and attacking", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving" && entry.frequency === "OncePerTurn")?.actions[0]).toMatchObject({ kind: "Unsuspend", optional: true, cost: { kind: "place", destination: "security", position: "bottom" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Unsuspend" }] });
  });
});
