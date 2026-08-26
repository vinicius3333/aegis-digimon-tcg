import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-074.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("EX6-074 Mirei Mikagura", () => {
  it("gains memory when an exact printed-trait Digimon is played, then can digivolve from trash and DNA digivolve at end of turn", () => {
    const runtime = runtimeCompiledCard("EX6-074");
    expect(runtime).toMatchObject({ coverage: "full", residual: [] });
    expect(runtime?.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        nameOrTrait: [{ tokens: ["Holy Beast", "Archangel", "Fallen Angel"], match: "trait" }],
      },
      actions: [
        { kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "suspend" } },
        { kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true },
      ],
    });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          optional: true,
          payCost: true,
          into: { hasDnaDigivolutionRequirement: true },
        },
      ],
    });
  });
  it("plays itself without cost from security", () =>
    expect(runtimeCompiledCard("EX6-074")?.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    }));
});
