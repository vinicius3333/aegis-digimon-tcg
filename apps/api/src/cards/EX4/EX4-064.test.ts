import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-064.js";

describe("EX4-064 Keenan Crier", () => {
  it("sets memory to three at start of turn when memory is two or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions?.[0]).toMatchObject({ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } });
  });
  it("draws and may gain memory after qualifying purple Digimon deletion by suspending itself", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "Draw", amount: 1 }, { kind: "GainMemory", amount: 1, condition: { kind: "triggerRemovalCause", removalCause: "byEffect" } }], cost: { kind: "suspend", target: { filter: { isSelfRef: true } } } });
  });
});
