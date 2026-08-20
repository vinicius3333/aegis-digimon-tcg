import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-031.js";

describe("EX7-031", () => {
  it("reduces the cost of its Bird or Avian digivolution by 1", () => expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldDigivolve", actions: [{ mode: "reduceCost", amount: 1 }] }));
  it("inherits once-per-turn memory gain after a Digimon is deleted in battle", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
