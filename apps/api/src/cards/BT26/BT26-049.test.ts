import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-049.js";

describe("BT26-049 Rosemon", () => {
  it("encodes the shared suspend budget and both All Turns reaction routes", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", frequency: "OncePerTurn", actions: [{ kind: "Suspend", target: { count: 2, upTo: true } }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenAttacking", sharedUseKey: "bt26-049-suspend" });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [
      { kind: "SubTrigger", event: "whenSuspended" }, { kind: "SubTrigger", event: "whenDigivolutionTrashed" },
    ] });
  });
});
