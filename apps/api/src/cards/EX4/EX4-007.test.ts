import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-007.js";

describe("EX4-007 GeoGreymon", () => {
  it("gains memory at start of main phase with a red or yellow Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] } } });
  });
  it("inherits the red/yellow Tamer suspension draw watcher", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] }, actions: [{ kind: "Draw", controller: "mine", amount: 1 }] }] });
  });
});
