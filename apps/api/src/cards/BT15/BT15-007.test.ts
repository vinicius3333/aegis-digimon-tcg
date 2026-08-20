import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-007.js";

describe("BT15-007", () => {
  it("reveals four and adds a red card, trashing the printed hand cost", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "RevealAdd", revealCount: 4, rest: "deckBottom" }] });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ cost: { kind: "trash", target: { count: 1 } } });
  });
  it("gains 1 memory once per turn when security is removed", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "YourTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
