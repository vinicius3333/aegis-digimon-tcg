import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-074.js";

describe("EX6-074 Mastemon", () => {
  it("gains memory when a Holy Beast/Archangel/Fallen Angel is played, then can trash-revive and DNA digivolve at end of turn", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed", cost: { kind: "suspend" }, actions: [{ kind: "GainMemory", amount: 1 }] });
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfYourTurn")?.actions[0]).toMatchObject({ kind: "DnaDigivolve", optional: true, payCost: true });
  });
  it("plays itself without cost from security", () => expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false }));
});
