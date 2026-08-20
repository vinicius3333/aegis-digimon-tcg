import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-030.js";

describe("BT17-030", () => {
  it("gains memory by placing Leon Alexander under itself", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "GainMemory", amount: 1, optional: true, abortOnDecline: true, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" } });
  });

  it("adds a security card from deck when security is 2 or fewer and has inherited Pulsemon DP", () => {
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1, condition: { kind: "zoneCount", value: 2 } });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfTopHasText" } }] });
  });
});
