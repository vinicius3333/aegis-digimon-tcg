import { describe, expect, it } from "vitest";
import { compiled } from "./EX4-005.js";

describe("EX4-005 Agumon", () => {
  it("gains memory at the start of the main phase with a red or yellow Tamer", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave", filter: { zone: "battleArea", controllerDefault: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] } } });
  });

  it("draws once per turn when one of your red or yellow Tamers becomes suspended", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "mine", kind: ["Tamer"], colors: ["Red", "Yellow"] }, actions: [{ kind: "Draw", controller: "mine", amount: 1 }] });
  });
});
