import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-071.js";

describe("BT14-071", () => {
  it("gains one memory by placing Eiji Nagasumi from hand or trash underneath at the start of main phase", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "GainMemory", amount: 1, cost: { kind: "place", target: { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "name" }] } } } }));
  it("inherits once-per-turn memory when a Dark Animal or SoC Digimon is played", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
