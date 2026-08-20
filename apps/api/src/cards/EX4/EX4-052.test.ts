import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-052.js";

describe("EX4-052 Fake Agumon Expert", () => {
  it("once per turn draws two after an opponent Digimon is deleted by trashing a same-level hand card", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { controller: "opponent", kind: ["Digimon"] }, actions: [{ kind: "Draw", amount: 2 }], cost: { kind: "trash", target: { filter: { levelMatchesTriggerSource: true } } } }] });
  });
});
