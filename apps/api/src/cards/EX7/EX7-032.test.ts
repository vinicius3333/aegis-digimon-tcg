import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-032.js";

describe("EX7-032", () => {
  it("plays Shoto Kazama from hand when digivolving with one or fewer Tamers", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHave" }, target: { count: 1 } }));
  it("inherits once-per-turn memory gain after a Digimon is deleted in battle", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }));
});
