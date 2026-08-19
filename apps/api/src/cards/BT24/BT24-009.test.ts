import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-009.js";

describe("BT24-009 Shamanmon", () => {
  it("requires trashing the qualifying hand card before drawing two", () => {
    const action = compiled.effects.find((effect) => effect.trigger === "OnPlay")?.actions?.[0] as any;
    expect(action).toMatchObject({ kind: "Draw", amount: 2, abortOnDecline: true, cost: { kind: "trash" } });
    expect(action.optional).toBeUndefined();
  });

  it("scopes inherited trash-triggered digivolution to this Demon/Titan Digimon", () => {
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    const action = inherited.actions[0].actions[0];
    expect(action.target).toMatchObject({ filter: { isSelfRef: true }, isSelf: true });
    expect(action.condition).toMatchObject({ kind: "selfHasTrait" });
    expect(action).toMatchObject({ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true });
  });
});
