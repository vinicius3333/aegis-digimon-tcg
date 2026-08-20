import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-068.js";

describe("EX7-068", () => {
  it("draws 1 and may play a level 3 Puppet Digimon from hand", () => expect(compiled.effects?.find((entry) => entry.trigger === "Main")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, target: { count: 1 } }]));
  it("activates its Main effect from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "ActivateMain" }));
});
