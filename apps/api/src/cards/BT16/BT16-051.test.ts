import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-051.js";

describe("BT16-051", () => {
  it("places Kosuke Kisakata from hand under itself for leave/deletion protection", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "GrantStatic", grant: "cantLeaveExceptByOwnerOrDeletion", duration: "untilOpponentTurnEnd", optional: true, abortOnDecline: true, cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" } }] });
  });

  it("has inherited permanent DP", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] });
  });
});
