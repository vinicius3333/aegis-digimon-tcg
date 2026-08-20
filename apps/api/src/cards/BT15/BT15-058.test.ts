import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-058.js";

describe("BT15-058", () => {
  it("binds and suspends one opposing Digimon, then restricts that same target with DigiPolice in stack", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "SelectBind", target: { bindAs: "suspended" } }, { kind: "Suspend", target: { fromSelectionRef: "suspended" } }, { kind: "Restrict", target: { fromSelectionRef: "suspended" }, restriction: "unsuspend", condition: { kind: "selfDigivolutionStackHasTrait" } }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "SelectBind" }, { kind: "Suspend" }, { kind: "Restrict" }] });
  });
  it("once per turn suspends an opposing Digimon or Tamer when this is suspended", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSuspended" }] }));
});
