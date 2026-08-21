import { describe, expect, it } from "vitest";
import { compiled } from "./EX10-029.js";

describe("EX10-029 Warpmon", () => {
  it("proves the link cost, selected target restriction, security play, and Blocker", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false, target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "Static" && effect.actions.length > 0)).toMatchObject({ actions: [{ kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "permanent" }] });
    expect(compiled.effects?.find((effect) => effect.trigger === "Static" && effect.actions[0]?.kind === "SubTrigger")).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenLinked", actions: [
      { kind: "SelectBind", target: { bindAs: "A" }, optional: true, abortOnDecline: true, cost: { kind: "trash", target: { filter: { controller: "mine", kind: ["Digimon"], zone: "linked" }, count: 1 } } },
      { kind: "Restrict", restriction: "cantBeDeDigivolved", duration: "untilOpponentTurnEnd", target: { fromSelectionRef: "A" } },
    ] }] });
  });
});
